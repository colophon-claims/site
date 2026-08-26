import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { buildGroupedReport, ingestGroupedReport } from "../scripts/ingest-grouped-report.mjs";

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const digest = (value) => sha256(Buffer.from(value));
const methods = [
  ["binary-instrument", "jinn.benchmarking.method/binary-instrument", "qualification"],
  ["pairwise-disagreement", "jinn.benchmarking.method/pairwise-disagreement", "pairwiseDisagreement"],
  ["paired-majority-delta", "jinn.benchmarking.method/paired-majority-delta", "pairedMajorityDelta"],
];

function binaryRate(numerator, denominator) {
  return {
    numerator,
    denominator,
    estimate: denominator === 0 ? null : String(numerator / denominator),
    wilsonInterval: denominator === 0 ? null : { low: "0.5", high: "1" },
  };
}

function projection(seed) {
  return {
    item: { expected: 240, complete: 238, excluded: 2, unstable: 1 },
    call: { expected: 720, evaluated: 716, parseInvalid: seed },
    confusion: { correctAccepted: 78, correctRejected: 2, wrongAccepted: 3, wrongRejected: 157 },
    agreement: binaryRate(235 - seed, 240),
    falseAccept: binaryRate(3 + seed, 160),
    falseReject: binaryRate(2, 80),
    instability: binaryRate(1, 240),
    parserInvalid: binaryRate(seed, 720),
  };
}

function methodResult(key) {
  if (key === "binary-instrument") {
    return {
      configuration: {
        candidateClasses: ["correct", "specific-wrong", "vague-topical-wrong"],
        strata: ["category-1", "category-2", "category-3", "category-4"],
        k: 3,
        measurementProfile: "binary-instrument@1",
        parserInvalidPolicy: "count-as-disagreement",
        truthAdmission: "prompted-screening/v2",
      },
      arms: Object.fromEntries(Array.from({ length: 6 }, (_, index) => {
        const overall = projection(index);
        return [`arm-${index}`, {
          ...overall,
          instrumentSha256: digest(`instrument-${index}`),
          byCandidateClass: { correct: projection(index) },
          byStratum: { "category-1": projection(index) },
        }];
      })),
      excluded: { count: 2, items: [] },
      conflicted: { count: 0, cellKeys: [] },
    };
  }
  if (key === "pairwise-disagreement") {
    return {
      pairs: [{
        armA: "arm-0", armB: "arm-1", n: 238, disagreements: 12, rate: "0.05042016806722689",
        interval: { lower: "0.029", upper: "0.085", alpha: "0.05" },
        byCandidateClass: [], byStratum: [], exclusions: [],
      }],
      conflicted: { count: 0, cellKeys: [] },
    };
  }
  return {
    baseline: "arm-0",
    candidate: "arm-1",
    n: 238,
    delta: "0.025210084033613446",
    interval: { lower: "-0.012", upper: "0.063", alpha: "0.05" },
    reasons: [],
    clusters: { count: 10 },
    byCandidateClass: [{ candidateClass: "correct", n: 79, delta: "0.01", interval: null, reasons: ["Synthetic slice"] }],
    byStratum: [{ stratum: "category-1", n: 60, delta: "0.02", interval: null, reasons: ["Synthetic slice"] }],
    exclusions: [],
    conflicted: { count: 0, cellKeys: [] },
  };
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

export function makeBundles(root, overrides = {}) {
  const runSha256 = overrides.runSha256 ?? digest("run");
  const matrixSha256 = overrides.matrixSha256 ?? digest("matrix");
  return methods.map(([key, methodId, resultKey], index) => {
    const directory = join(root, key);
    mkdirSync(directory, { recursive: true });
    const reportSha256 = overrides.reportSha256?.[index] ?? digest(`report-${index}`);
    const claim = {
      method: { id: methodId, version: "1", parameters: {}, preregistered: true },
      records: {
        runSha256: overrides.runSha256At?.[index] ?? runSha256,
        matrixSha256,
        reportSha256,
        benchmarkSha256: digest("benchmark"),
      },
      scope: {
        taskCount: 240,
        arms: Array.from({ length: 6 }, (_, arm) => ({ armId: `arm-${arm}`, pinning: { model: "fixture" } })),
        replicates: 3,
        venue: "synthetic",
      },
      verification: { command: "npx @colophon-claims/verify <bundle-dir>", checks: [], trustRoot: "fixture" },
      limitations: ["Synthetic fixture."],
      [resultKey]: methodResult(key),
    };
    writeJson(join(directory, "claim-package.json"), claim);
    writeJson(join(directory, "matrix.json"), { format: "fixture-matrix/1" });
    writeJson(join(directory, "report.json"), { reportedAt: "2026-08-26T12:00:00.000Z" });
    writeJson(join(directory, "run.json"), { lockedAt: "2026-08-26T11:00:00.000Z" });

    const files = ["claim-package.json", "matrix.json", "report.json", "run.json"].map((path) => {
      const bytes = readFileSync(join(directory, path));
      return { path, bytes: bytes.length, sha256: sha256(bytes) };
    });
    writeJson(join(directory, "bundle.json"), {
      format: key === "binary-instrument" ? "benchmark-product-public-bundle/4" : "benchmark-product-public-bundle/2",
      files,
    });
    return directory;
  });
}

test("groups and ingests exactly three byte-exact judge-report bundles", (context) => {
  const root = mkdtempSync(join(tmpdir(), "colophon-grouped-report-"));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  const bundles = makeBundles(join(root, "source"));
  const report = buildGroupedReport(bundles, { slug: "fixture-group", fixture: true, reportedAt: "2026-08-26T12:00:00Z" });
  assert.equal(report.digests.runSha256, digest("run"));
  assert.deepEqual(report.bundles.map((bundle) => bundle.key), methods.map(([key]) => key));
  assert.equal(new Set(report.bundles.map((bundle) => bundle.reportSha256)).size, 3);

  const siteRoot = join(root, "site");
  const ingested = ingestGroupedReport(bundles, { slug: "fixture-group", fixture: true, reportedAt: "2026-08-26T12:00:00Z" }, siteRoot);
  for (const bundle of ingested.bundles) {
    for (const file of bundle.files) {
      const source = readFileSync(join(bundles[methods.findIndex(([key]) => key === bundle.key)], file.path));
      const copy = readFileSync(join(siteRoot, "public", "reports", "fixture-group", "bundle", bundle.key, file.path));
      assert.deepEqual(copy, source);
    }
  }
  assert.throws(
    () => ingestGroupedReport(bundles, { slug: "fixture-group", fixture: true }, siteRoot),
    /refusing to overwrite existing append-only report slug/u,
  );
});

test("refuses a run mismatch, duplicate report digest, and manifest tamper", (context) => {
  const root = mkdtempSync(join(tmpdir(), "colophon-grouped-report-refusal-"));
  context.after(() => rmSync(root, { recursive: true, force: true }));

  const mismatch = makeBundles(join(root, "run-mismatch"), { runSha256At: [digest("run"), digest("other-run"), digest("run")] });
  assert.throws(() => buildGroupedReport(mismatch, { slug: "mismatch" }), /do not share one runSha256/u);

  const sameReport = digest("same-report");
  const duplicate = makeBundles(join(root, "report-duplicate"), { reportSha256: [sameReport, sameReport, digest("third-report")] });
  assert.throws(() => buildGroupedReport(duplicate, { slug: "duplicate" }), /distinct reportSha256/u);

  const tampered = makeBundles(join(root, "tampered"));
  writeFileSync(join(tampered[0], "matrix.json"), "tampered\n");
  assert.throws(() => buildGroupedReport(tampered, { slug: "tampered" }), /manifest mismatch for matrix.json/u);
  assert.throws(() => buildGroupedReport(makeBundles(join(root, "bad-date")), {
    slug: "bad-date",
    reportedAt: "2026-08-26 12:00:00",
  }), /reported-at must be an RFC 3339 UTC timestamp/u);
});
