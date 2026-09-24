import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

/**
 * The claim page's lead prints facts from the read model and from three sealed
 * bundle members. These tests pin each printed fact to the sealed bytes it
 * comes from, so a re-ingest or a data change that would make the lead say
 * something the bundle does not fails here first.
 */
const siteRoot = fileURLToPath(new URL("../", import.meta.url));
const slug = "locomo-judge-report";
const bundleDir = join(siteRoot, "public", "reports", slug, "bundle");
const report = JSON.parse(readFileSync(join(siteRoot, "data", "reports", `${slug}.json`), "utf8"));
const member = (path) => readFileSync(join(bundleDir, ...path.split("/")));
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const percent = (rate) => `${(Number(rate) * 100).toFixed(1)}%`;

test("the run and method records the byline reads are the bytes the page's IDs name", () => {
  assert.equal(sha256(member("run.json")), report.digests.runSha256);
  assert.equal(sha256(member("benchmark.json")), report.digests.benchmarkSha256);
  assert.equal(sha256(member("bundle.json")), report.digests.bundleIdentity);
});

test("the claimant slot is the signing key the run record names, and it also wrote the method", () => {
  const run = JSON.parse(member("run.json").toString("utf8"));
  const method = JSON.parse(member("benchmark.json").toString("utf8"));
  assert.match(run.owner, /^did:key:z6Mk[1-9A-HJ-NP-Za-km-z]+$/u);
  assert.equal(method.author, run.owner);
  assert.equal(method.name, "LoCoMo judge report frozen bank");
  assert.equal(method.items.length, report.population.items);
});

test("the seal time the page prints is the run record's own close time", () => {
  const run = JSON.parse(member("run.json").toString("utf8"));
  assert.equal(new Date(run.closeAt).toISOString().slice(0, 19), report.reportedAt.slice(0, 19));
  assert.equal(run.venue.kind, report.execution.venue);
});

test("'Who ran it' quotes the first line of the sealed venue disclosure", () => {
  const claim = JSON.parse(member("claim-package.json").toString("utf8"));
  assert.equal(claim.venueHonesty.venue, "self-run");
  assert.equal(claim.venueHonesty.venue, report.execution.venue);
  assert.equal(report.limitations[0], claim.venueHonesty.limits[0]);
  assert.equal(
    report.limitations[0],
    "This is a local, self-run venue: the same operator controls task dispatch, execution, and evaluation.",
  );
});

test("the 'who chose the tasks' line states what the population record says", () => {
  const labels = report.population.labels;
  assert.match(labels, /candidate pool contained 664 items/u);
  assert.match(labels, /hand-reviewed 255 items/u);
  assert.match(labels, /excluded 137 candidates/u);
  assert.match(labels, /final 80\/80\/80 class balance/u);
  assert.equal(report.population.items, 240);
});

test("the lead range is the range the claim reports, each end with its own denominator", () => {
  const arms = [...report.result.perArm].sort((left, right) =>
    Number(left.agreement.estimate) - Number(right.agreement.estimate));
  const low = arms[0].agreement;
  const high = arms.at(-1).agreement;
  assert.equal(`${percent(low.estimate)} to ${percent(high.estimate)}`, "60.8% to 87.9%");
  assert.ok(report.result.primary.includes("60.8% to 87.9%"));
  assert.deepEqual([low.numerator, low.denominator, high.numerator, high.denominator], [146, 240, 211, 240]);
});

test("the accounting the seal line and the table print adds up", () => {
  const { cells, parserNeutral, excludedItems } = report.accounting;
  assert.equal(cells.expected, report.population.items * report.subject.arms.length * report.execution.replicates);
  assert.equal(cells.judged + cells.lost, cells.expected);
  assert.equal(parserNeutral.calls, 22);
  assert.equal(excludedItems.byArm.reduce((sum, row) => sum + row.items, 0), excludedItems.count);
});

test("the evidence row's size and file count come from the bundle's own file list", () => {
  const manifest = JSON.parse(member("bundle.json").toString("utf8"));
  assert.equal(manifest.format, report.format);
  assert.equal(manifest.files.length + 1, report.memberCounts.total);
  const listed = manifest.files.reduce((sum, file) => sum + file.bytes, 0);
  assert.equal(listed, 177_261_232);
  assert.equal(listed + member("bundle.json").length, 185_417_411);
});

test("the timestamp proof is still pending, so the page must not date the lock", () => {
  assert.equal(report.anchors.length, 1);
  assert.deepEqual(report.anchors[0].facts, { pending: true });
  const proof = JSON.parse(member(`anchors/${report.anchors[0].recordSha256}.bin`).toString("utf8"));
  assert.equal(proof.subject.digest.sha256, report.digests.runSha256);
  assert.equal(proof.proof.mediaType, "application/vnd.opentimestamps.ots");
});
