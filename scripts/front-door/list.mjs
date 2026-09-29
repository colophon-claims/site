#!/usr/bin/env node
/**
 * The front door's second job: turn a passing check into listing files in the
 * working tree. It runs only the site's own ingest on bytes the first job
 * fetched and checked; it runs nothing the submission supplied.
 *
 *   node scripts/front-door/list.mjs <check-out-dir>
 *
 * It re-reads the bundle's identity, re-checks for a duplicate and a free slug
 * against the tree it runs in (another listing may have merged since the
 * check), runs ingest, and confirms the change only adds this listing's files.
 * It prints the slug on success and exits non-zero otherwise.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { listedIdentities } from "./check.mjs";
import { Refusal, assignSlug, checkAppendOnly } from "./policy.mjs";

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

function git(args) {
  const result = spawnSync("git", args, { cwd: siteRoot, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`git ${args.join(" ")}: ${result.stderr.trim()}`);
  return result.stdout;
}

function main() {
  const checkDir = resolve(process.argv[2] ?? "front-door-out");
  const resultFile = join(checkDir, "result.json");
  const result = JSON.parse(readFileSync(resultFile, "utf8"));
  if (result.outcome !== "pass") throw new Error("the check did not pass; there is nothing to list");
  const bundleDir = join(checkDir, "bundle");
  const identity = createHash("sha256").update(readFileSync(join(bundleDir, "bundle.json"))).digest("hex");
  if (identity !== result.identity) throw new Error("the bundle handed over is not the bundle that was checked");

  let slug;
  try {
    ({ slug } = assignSlug(result.slug, identity, listedIdentities(siteRoot)));
  } catch (error) {
    if (!(error instanceof Refusal)) throw error;
    writeFileSync(resultFile, `${JSON.stringify({ ...result, outcome: "refused", code: error.code, message: error.message }, null, 2)}\n`);
    console.error(error.message);
    process.exit(3);
  }
  if (slug !== result.slug) {
    const note = `slug-collision: /reports/${result.slug}/ was taken while this bundle was being checked, so it is listed at /reports/${slug}/.`;
    writeFileSync(resultFile, `${JSON.stringify({ ...result, slug, notes: [...(result.notes ?? []), note] }, null, 2)}\n`);
  }

  if (git(["status", "--porcelain"]).trim() !== "") throw new Error("the working tree is not clean");
  const ingest = spawnSync(
    process.execPath,
    [join(siteRoot, "scripts", "ingest-report.mjs"), bundleDir, "--slug", slug, "--listing", join(checkDir, "listing.json")],
    { cwd: siteRoot, encoding: "utf8" },
  );
  process.stderr.write(ingest.stdout + ingest.stderr);
  if (ingest.status !== 0) throw new Error("ingest refused the bundle");

  git(["add", "--all", "data/reports", "public/reports"]);
  const problems = checkAppendOnly(git(["diff", "--cached", "--name-status", "--no-renames"]), slug);
  if (git(["status", "--porcelain", "--untracked-files=all"]).split("\n").some((line) => line !== "" && !line.startsWith("A  "))) {
    problems.push("the change touches files outside the listing");
  }
  if (problems.length > 0) throw new Error(`mutation-refused: ${problems.join("; ")}`);
  console.log(slug);
}

main();
