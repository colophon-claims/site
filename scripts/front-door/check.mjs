#!/usr/bin/env node
/**
 * The front door's first job, run with read-only permissions: take one
 * submission, fetch its bundle as a stranger would, run the checker line the
 * bundle sealed with an empty npm cache, and project it with the site's ingest
 * into a scratch copy. It writes `result.json` (and on a pass, the fetched
 * bundle and the listing it would add) into the output directory, and never
 * writes to the repository.
 *
 *   ISSUE_BODY=... ISSUE_URL=... node scripts/front-door/check.mjs <out-dir>
 *
 * The listing itself is written by list.mjs, in a job that runs none of the
 * submitted bytes.
 */
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { DOOR } from "./door.mjs";
import { fetchLocator } from "./fetch.mjs";
import {
  Refusal,
  assignSlug,
  checkerArgs,
  parseVerificationCommand,
  readCheckerPass,
  readSubmission,
  refuse,
} from "./policy.mjs";

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUTPUT_CAP = 60_000;
const CHECKER_TIMEOUT_MS = 20 * 60_000;
/**
 * The formats the site's ingest projects and a board reads. Each renders from
 * a sealed presentation.json. `/5` is not among them: ingest refuses it and no
 * board reads it, so it is refused here as an unknown format.
 */
export const PROJECTED_FORMATS = [
  "benchmark-product-public-bundle/7",
  "benchmark-product-public-bundle/8",
];

export const INTERNAL_ERROR = "The check stopped on an error in this site's own workflow, so nothing was listed. Open a new submission to try again.";

const cap = (text) => (text.length > OUTPUT_CAP
  ? { text: text.slice(0, OUTPUT_CAP), truncated: true }
  : { text, truncated: false });

/** Every listed slug and the bundle identity it holds. */
export function listedIdentities(root) {
  const listed = new Map();
  const dir = join(root, "data", "reports");
  if (!existsSync(dir)) return listed;
  for (const name of readdirSync(dir)) {
    if (!name.endsWith(".json") || name.endsWith(".presentation.json")) continue;
    const data = JSON.parse(readFileSync(join(dir, name), "utf8"));
    listed.set(name.slice(0, -".json".length), data.digests?.bundleIdentity ?? null);
  }
  // A bundle directory with no data file (an unpublished report) still holds
  // its slug: ingest never writes over it.
  const bundles = join(root, "public", "reports");
  if (existsSync(bundles)) {
    for (const name of readdirSync(bundles)) if (!listed.has(name)) listed.set(name, null);
  }
  return listed;
}

function readBundleJson(bundleDir, name) {
  try {
    return JSON.parse(readFileSync(join(bundleDir, name), "utf8"));
  } catch {
    refuse("unknown-format", `${name} is missing from the bundle or is not valid JSON.`);
  }
}

/**
 * What ingest can project, checked before the checker runs so a bundle that
 * could never be listed is refused with the missing piece named.
 */
export function assertProjectable(manifest, claim) {
  const paths = new Set((manifest.files ?? []).map((entry) => entry?.path));
  if (!PROJECTED_FORMATS.includes(manifest.format)) {
    refuse(
      "unknown-format",
      `The bundle is format ${manifest.format}, which this site does not list. It lists ${PROJECTED_FORMATS.join(" and ")} and no other format.`,
    );
  }
  if (!paths.has("presentation.json")) {
    refuse(
      "unknown-format",
      "The bundle seals no presentation.json, its public reading record. The site renders a claim from that record and the submission form cannot supply one.",
    );
  }
  if (claim.suiteComparability !== undefined) {
    refuse("unknown-format", "The bundle claims an official suite. This site cannot key a suite board yet, so it cannot list the claim.");
  }
}

function runChecker(parsed, bundleDir) {
  const cache = mkdtempSync(join(tmpdir(), "colophon-npx-cache-"));
  try {
    const result = spawnSync("npx", ["--yes", "--cache", cache, ...checkerArgs(parsed, bundleDir)], {
      encoding: "utf8",
      timeout: CHECKER_TIMEOUT_MS,
      maxBuffer: 64 * 1024 ** 2,
      env: {
        PATH: process.env.PATH,
        HOME: process.env.HOME,
        npm_config_ignore_scripts: "true",
        npm_config_update_notifier: "false",
        npm_config_fund: "false",
        npm_config_audit: "false",
      },
    });
    return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "", error: result.error };
  } finally {
    rmSync(cache, { recursive: true, force: true });
  }
}

/** Runs the site's ingest into a scratch copy of the site: a dry run of the listing. */
function projectInScratch(bundleDir, slug, listingFile) {
  const scratch = mkdtempSync(join(tmpdir(), "colophon-projection-"));
  try {
    cpSync(join(siteRoot, "scripts"), join(scratch, "scripts"), { recursive: true });
    const result = spawnSync(
      process.execPath,
      [join(scratch, "scripts", "ingest-report.mjs"), bundleDir, "--slug", slug, "--listing", listingFile],
      { encoding: "utf8" },
    );
    return { ok: result.status === 0, output: `${result.stdout}${result.stderr}`.trim() };
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

export async function check({ body, submission, outDir, githubToken, now = () => new Date() }) {
  if (!DOOR.open) return { outcome: "refused", code: "door-closed", message: DOOR.closedMessage };
  const { locator, proposedSlug } = readSubmission(body);
  const { bundleDir, identity, provenance } = await fetchLocator(locator, outDir, { githubToken });
  const manifest = readBundleJson(bundleDir, "bundle.json");
  const claim = readBundleJson(bundleDir, "claim-package.json");
  const parsed = parseVerificationCommand(claim.verification?.command);
  assertProjectable(manifest, claim);
  // A sealed reading record names the claim's own address, and ingest holds
  // the listing to it, so that address wins over one proposed on the form.
  const presentation = readBundleJson(bundleDir, "presentation.json");
  const sealedSlug = typeof presentation.slug === "string" ? presentation.slug : null;
  const { slug, notes } = assignSlug(sealedSlug ?? proposedSlug, identity, listedIdentities(siteRoot));
  if (sealedSlug !== null && slug !== sealedSlug) {
    refuse(
      "slug-collision",
      `The bundle's reading record names the address \`/reports/${sealedSlug}/\`, which is either taken or not a valid address here. A listing never replaces one, so nothing was listed.`,
    );
  }
  if (sealedSlug !== null && proposedSlug !== null && proposedSlug !== sealedSlug) {
    notes.push(`The bundle's reading record names its own address, /reports/${sealedSlug}/, so the proposed slug "${proposedSlug}" was not used.`);
  }

  const run = runChecker(parsed, bundleDir);
  if (run.status === null || run.error !== undefined) {
    return {
      outcome: "refused",
      code: "check-failed",
      message: `\`${parsed.spec}\` did not finish on this bundle (${run.error?.code === "ETIMEDOUT" ? "it ran past the time limit" : "it was stopped"}). Nothing was listed.`,
      checker: { command: parsed.command, exitCode: run.status, stdout: cap(run.stdout), stderr: cap(run.stderr) },
    };
  }
  const verdict = run.status === 0 ? readCheckerPass(run.stdout, identity) : { passed: false };
  if (!verdict.passed) {
    const installFailed = run.stdout.trim() === "" && /npm (error|ERR!)/.test(run.stderr);
    return {
      outcome: "refused",
      code: installFailed ? "npm-unavailable" : "check-failed",
      message: installFailed
        ? `npm could not install \`${parsed.spec}\`. Nothing was listed; submit again once npm serves it.`
        : `\`${parsed.spec}\` did not pass this bundle${verdict.reason ? ` (${verdict.reason})` : ""}. Nothing was listed.`,
      checker: { command: parsed.command, exitCode: run.status, stdout: cap(run.stdout), stderr: cap(run.stderr) },
    };
  }

  const listing = {
    listedAt: now().toISOString().replace(/\.\d{3}Z$/, "Z"),
    locator: provenance.locator,
    syntax: provenance.syntax,
    ...(provenance.resolvedCommit ? { resolvedCommit: provenance.resolvedCommit } : {}),
    ...(submission ? { submission } : {}),
  };
  const listingFile = join(outDir, "listing.json");
  writeFileSync(listingFile, `${JSON.stringify(listing, null, 2)}\n`);
  const projection = projectInScratch(bundleDir, slug, listingFile);
  if (!projection.ok) {
    return {
      outcome: "refused",
      code: "projector-refused",
      message: `\`${parsed.spec}\` passed this bundle, but the site's ingest refused it, so nothing was listed. The ingest's own words are below.`,
      checker: { command: parsed.command, exitCode: 0, stdout: cap(run.stdout), stderr: cap("") },
      ingest: cap(projection.output),
    };
  }
  return {
    outcome: "pass",
    slug,
    identity,
    format: manifest.format,
    checks: verdict.checks,
    notes,
    checker: { command: parsed.command, exitCode: 0, stdout: cap(run.stdout), stderr: cap("") },
  };
}

async function main() {
  const outDir = resolve(process.argv[2] ?? "front-door-out");
  mkdirSync(outDir, { recursive: true });
  let result;
  try {
    result = await check({
      body: process.env.ISSUE_BODY ?? "",
      submission: process.env.ISSUE_URL ?? null,
      outDir,
      githubToken: process.env.GITHUB_TOKEN,
    });
  } catch (error) {
    // Every ending gets an answer on the issue, an unexpected one included.
    result = error instanceof Refusal
      ? { outcome: "refused", code: error.code, message: error.message }
      : { outcome: "refused", code: "internal-error", message: INTERNAL_ERROR };
    if (!(error instanceof Refusal)) console.error(error);
  }
  if (result.outcome !== "pass") rmSync(join(outDir, "bundle"), { recursive: true, force: true });
  writeFileSync(join(outDir, "result.json"), `${JSON.stringify(result, null, 2)}\n`);
  console.log(`${result.outcome}${result.code ? ` (${result.code})` : ""}${result.slug ? `: ${result.slug}` : ""}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
