#!/usr/bin/env node
/**
 * The listing pull request's own check. It re-runs, against the copy the pull
 * request commits, what the front door ran against the fetched copy: the
 * checker line the bundle sealed, cold, and it confirms the pull request only
 * adds this one listing.
 *
 *   node scripts/front-door/recheck.mjs <slug> <base-ref>
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { checkAppendOnly, checkerArgs, parseVerificationCommand, readCheckerPass } from "./policy.mjs";

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const [slug, base] = process.argv.slice(2);

function fail(message) {
  console.error(`recheck: ${message}`);
  process.exit(1);
}

if (!/^[a-z0-9][a-z0-9-]*$/.test(slug ?? "") || base === undefined) fail("usage: recheck.mjs <slug> <base-ref>");

const diff = spawnSync("git", ["diff", "--name-status", "--no-renames", `${base}...HEAD`], { cwd: siteRoot, encoding: "utf8" });
if (diff.status !== 0) fail(diff.stderr.trim());
const problems = checkAppendOnly(diff.stdout, slug);
if (problems.length > 0) fail(`mutation-refused: ${problems.join("; ")}`);

const data = JSON.parse(readFileSync(join(siteRoot, "data", "reports", `${slug}.json`), "utf8"));

// The base must not already list these bytes under another slug: two
// submissions of one bundle can each pass their own check before either merges.
const listedOnBase = spawnSync("git", ["grep", "-l", data.digests.bundleIdentity, base, "--", "data/reports/"], { cwd: siteRoot, encoding: "utf8" });
if (listedOnBase.status !== 0 && listedOnBase.status !== 1) fail(`git grep failed: ${listedOnBase.stderr.trim()}`);
if (listedOnBase.status === 0) fail(`duplicate-identity: ${base} already lists this bundle (${listedOnBase.stdout.trim()})`);
const bundleDir = join(siteRoot, "public", "reports", slug, "bundle");
const claim = JSON.parse(readFileSync(join(bundleDir, "claim-package.json"), "utf8"));
const parsed = parseVerificationCommand(claim.verification?.command);
const cache = mkdtempSync(join(tmpdir(), "colophon-npx-cache-"));
const run = spawnSync("npx", ["--yes", "--cache", cache, ...checkerArgs(parsed, bundleDir)], {
  encoding: "utf8",
  maxBuffer: 64 * 1024 ** 2,
  env: { PATH: process.env.PATH, HOME: process.env.HOME, npm_config_ignore_scripts: "true", npm_config_update_notifier: "false" },
});
rmSync(cache, { recursive: true, force: true });
process.stdout.write(run.stdout ?? "");
process.stderr.write(run.stderr ?? "");
const verdict = run.status === 0 ? readCheckerPass(run.stdout, data.digests.bundleIdentity) : { passed: false };
if (!verdict.passed) fail(`${parsed.spec} did not pass the committed copy of ${slug}`);
console.log(`recheck: ${parsed.spec} passed the committed copy; the change adds only /reports/${slug}/`);
