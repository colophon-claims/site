import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const siteRoot = fileURLToPath(new URL("../", import.meta.url));

/** A site root carrying only the scripts, so an ingest writes nowhere real. */
function scratchSite(context) {
  const root = mkdtempSync(join(tmpdir(), "colophon-legacy-format-"));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  cpSync(join(siteRoot, "scripts"), join(root, "scripts"), { recursive: true });
  return root;
}

function run(root, args) {
  return spawnSync(process.execPath, [join(root, "scripts", "ingest-report.mjs"), ...args], { encoding: "utf8" });
}

test("refuses a bundle declaring the removed legacy format /1", (context) => {
  const root = scratchSite(context);
  const bundle = join(root, "source");
  mkdirSync(bundle, { recursive: true });
  writeFileSync(
    join(bundle, "bundle.json"),
    `${JSON.stringify({ format: "benchmark-product-public-bundle/1", files: [] }, null, 2)}\n`,
  );

  const result = run(root, [bundle, "--slug", "old-report"]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /unsupported bundle format: benchmark-product-public-bundle\/1/u);
  // The refusal names the formats the site still accepts.
  assert.match(result.stderr, /benchmark-product-public-bundle\/5/u);
  assert.match(result.stderr, /benchmark-product-public-bundle\/7/u);
  assert.match(result.stderr, /benchmark-product-public-bundle\/8/u);
});

test("no longer accepts the --fixture flag", (context) => {
  const root = scratchSite(context);
  const result = run(root, [join(root, "nonexistent-bundle"), "--slug", "old-report", "--fixture"]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /unexpected argument: --fixture/u);
});
