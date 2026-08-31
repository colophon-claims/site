#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const reportsDir = join(root, "data", "reports");
const publicReportsDir = join(root, "public", "reports");
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const groupedMethods = new Map([
  ["binary-instrument", "jinn.benchmarking.method/binary-instrument"],
  ["pairwise-disagreement", "jinn.benchmarking.method/pairwise-disagreement"],
  ["paired-majority-delta", "jinn.benchmarking.method/paired-majority-delta"],
]);

const QUALIFIED_FORMAT = "benchmark-product-public-bundle/7";
const DISCLOSED_FORMAT = "benchmark-product-public-bundle/8";
const SIX_VARIABLE_SPECIFICATION = "https://spec.jinn.network/disclosure/six-variable/v1";
const DISCLOSURE_RECORD_KIND = "https://spec.jinn.network/records/disclosure-specification/v1";
const DISCLOSURE_VARIABLE_KEYS = [
  "ingestion-model",
  "retrieval-config",
  "answer-model",
  "answer-prompt",
  "judge-model",
  "judge-prompt",
];
const DISCLOSURE_STATUSES = ["measured-here", "disclosed-by-publisher", "undisclosed"];
const ANCHORED_CHECKS = [
  "manifest",
  "evidence-closure",
  "trust",
  "matrix-rederivation",
  "report-verification",
  "claim-consistency",
  "integrity-anchors",
];
const DISCLOSED_CHECKS = [...ANCHORED_CHECKS, "disclosure-specification"];
/** Present because the bundle carries a sealed reading record, not because of
 * its format, so the claim's list and the record's differ by exactly this. */
const PRESENTATION_CHECK = "report-presentation";

function fail(message) {
  throw new Error(`validate-published-reports: ${message}`);
}

/** Key-sorted JSON, so two carriages of one sealed section compare as values. */
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

/**
 * Re-checks what the anchored closures add, against the copied bundle rather
 * than against the read model that claims it: the anchors and their carried
 * proofs, and the sealed six-variable declaration the disclosed closure names.
 */
function validateQualified(report, bundleDir) {
  const disclosed = report.format === DISCLOSED_FORMAT;
  const claim = JSON.parse(readFileSync(join(bundleDir, "claim-package.json"), "utf8"));
  const expectedChecks = disclosed ? DISCLOSED_CHECKS : ANCHORED_CHECKS;

  // The reading record lives in exactly one of two places, and the read model
  // says which. A record supplied at ingest must NOT also be inside the bundle:
  // that would mean the published artifact was edited to carry it.
  const source = report.presentationSource;
  const sealed = source?.carriage === "sealed-bundle-member";
  if (source === undefined || (!sealed && source.carriage !== "supplied-at-ingest")) {
    fail(`${report.slug} read model does not say how its reading record was carried`);
  }
  const sealedPath = join(bundleDir, "presentation.json");
  if (sealed !== existsSync(sealedPath)) {
    fail(
      sealed
        ? `${report.slug} claims a sealed reading record but the bundle carries none`
        : `${report.slug} supplied a reading record at ingest, yet the bundle also carries one`,
    );
  }
  const presentationBytes = sealed
    ? readFileSync(sealedPath)
    : readFileSync(join(reportsDir, source.path));
  if (sha256(presentationBytes) !== source.sha256) {
    fail(`${report.slug} reading record does not match the digest its read model names`);
  }
  const presentation = JSON.parse(presentationBytes.toString("utf8"));

  if (presentation.verification?.bundleFormat !== report.format) {
    fail(`${report.slug} presentation names a bundle format other than ${report.format}`);
  }
  // The read model carries the reading record's list, which is the format's
  // list plus the one check a bundle earns by carrying a reading record at all.
  const expectedRecordChecks = sealed ? [...expectedChecks, PRESENTATION_CHECK] : expectedChecks;
  if (canonical(report.verification?.checks) !== canonical(expectedRecordChecks)) {
    fail(`${report.slug} read model does not carry the reading record's ${report.format} check list, in order`);
  }
  if (canonical(claim.verification?.checks) !== canonical(expectedChecks)) {
    fail(`${report.slug} claim does not carry the ${report.format} check list, in order`);
  }
  for (const [key, path] of [
    ["benchmarkSha256", "benchmark.json"],
    ["matrixSha256", "matrix.json"],
    ["reportSha256", "report.json"],
    ["runSha256", "run.json"],
    ["reportEnvelopeSha256", "report-envelope.json"],
  ]) {
    const actual = sha256(readFileSync(join(bundleDir, path)));
    if (report.digests?.[key] !== actual) fail(`${report.slug} read model ${key} does not match ${path}`);
    if (claim.records?.[key] !== actual) fail(`${report.slug} claim ${key} does not match ${path}`);
  }

  // Recomputed, not trusted: the one figure on the page that is arithmetic over
  // sealed records rather than a value the Report states outright.
  const decisions = claim.qualification?.itemDecisions;
  if (!Array.isArray(decisions)) fail(`${report.slug} claim carries no item decisions`);
  const graded = new Set(decisions.map((item) => item.taskDigest));
  const unstable = new Set(decisions.filter((item) => item.unstable === true).map((item) => item.taskDigest));
  const stated = report.manipulationCheck?.replicateInstability;
  if (stated?.gradedItems !== graded.size || stated?.unstableItems !== unstable.size) {
    fail(
      `${report.slug} replicate instability says ${stated?.unstableItems}/${stated?.gradedItems},`
      + ` recomputed ${unstable.size}/${graded.size}`,
    );
  }

  if (!Array.isArray(report.anchors)) fail(`${report.slug} read model carries no anchors`);
  if (canonical(report.anchors) !== canonical(claim.anchors)) {
    fail(`${report.slug} read model anchors are not the claim's anchors`);
  }
  const anchorDir = join(bundleDir, "anchors");
  const anchorMembers = new Set(
    existsSync(anchorDir)
      ? readdirSync(anchorDir, { withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) => entry.name)
      : [],
  );
  for (const anchor of report.anchors) {
    const name = `${anchor.recordSha256}.bin`;
    if (!anchorMembers.delete(name)) fail(`${report.slug} names anchor ${name}, which is not carried`);
    const bytes = readFileSync(join(bundleDir, "anchors", name));
    if (sha256(bytes) !== anchor.recordSha256) fail(`${report.slug} anchor ${name} does not match its name`);
  }
  if (anchorMembers.size > 0) {
    fail(`${report.slug} carries unclaimed anchor proofs: ${[...anchorMembers].join(", ")}`);
  }

  if (!disclosed) {
    if (report.disclosure !== null) fail(`${report.slug} is ${QUALIFIED_FORMAT} but carries a disclosure`);
    return { anchors: report.anchors.length, disclosed: 0 };
  }

  const disclosure = report.disclosure;
  if (disclosure === null) fail(`${report.slug} is ${DISCLOSED_FORMAT} but carries no disclosure`);
  if (disclosure.specification !== SIX_VARIABLE_SPECIFICATION) {
    fail(`${report.slug} disclosure names an unknown specification`);
  }
  if (disclosure.subjectSha256 !== sha256(readFileSync(join(bundleDir, "matrix.json")))) {
    fail(`${report.slug} disclosure subject is not this bundle's result matrix`);
  }
  const recordBytes = readFileSync(join(bundleDir, ...disclosure.recordPath.split("/")));
  if (sha256(recordBytes) !== disclosure.recordSha256) {
    fail(`${report.slug} disclosure record does not match its digest`);
  }
  const record = JSON.parse(recordBytes.toString("utf8"));
  if (record.kind !== DISCLOSURE_RECORD_KIND) {
    fail(`${report.slug} disclosure record is not a disclosure-specification record`);
  }
  if (record.author !== disclosure.author || record.subject?.kind !== disclosure.subjectKind) {
    fail(`${report.slug} read model disagrees with the sealed disclosure record`);
  }
  if (canonical(record.variables) !== canonical(disclosure.variables)) {
    fail(`${report.slug} read model variables are not the sealed record's variables`);
  }
  if (canonical(claim.disclosure?.variables) !== canonical(record.variables)) {
    fail(`${report.slug} claim disclosure section is not the sealed record's projection`);
  }
  let measured = 0;
  for (const key of DISCLOSURE_VARIABLE_KEYS) {
    const entry = disclosure.variables[key];
    if (entry === undefined) fail(`${report.slug} disclosure omits ${key}`);
    if (!DISCLOSURE_STATUSES.includes(entry.status)) {
      fail(`${report.slug} disclosure variable ${key} carries an unknown status`);
    }
    if (entry.status !== "measured-here") {
      if (entry.evidence !== undefined) fail(`${report.slug} ${key} asserts and carries evidence`);
      continue;
    }
    measured += 1;
    for (const citation of entry.evidence) {
      const cited = join(bundleDir, "records", `${citation.digest.sha256}.bin`);
      if (!existsSync(cited)) {
        fail(`${report.slug} ${key} cites record ${citation.digest.sha256}, which is not carried`);
      }
    }
  }
  if (Object.keys(disclosure.variables).length !== DISCLOSURE_VARIABLE_KEYS.length) {
    fail(`${report.slug} disclosure carries a variable outside the frozen six`);
  }
  return { anchors: report.anchors.length, disclosed: measured };
}

function walk(directory, bundleDir) {
  return readdirSync(directory).flatMap((name) => {
    const absolute = join(directory, name);
    const stat = lstatSync(absolute);
    const path = relative(bundleDir, absolute).split(sep).join("/");
    if (stat.isSymbolicLink()) fail(`${path} is a symbolic link`);
    return stat.isDirectory() ? walk(absolute, bundleDir) : [path];
  });
}

function validateBundle(label, bundleDir, expectedIdentity) {
  const manifestPath = join(bundleDir, "bundle.json");
  if (!existsSync(manifestPath)) fail(`${label} has no bundle.json`);
  const manifestBytes = readFileSync(manifestPath);
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  if (!Array.isArray(manifest.files)) fail(`${label} has an invalid bundle manifest`);

  const expectedPaths = new Set(["bundle.json"]);
  for (const entry of manifest.files) {
    if (expectedPaths.has(entry.path)) fail(`${label} lists ${entry.path} twice`);
    expectedPaths.add(entry.path);
    const absolute = join(bundleDir, ...entry.path.split("/"));
    if (!existsSync(absolute) || !lstatSync(absolute).isFile()) fail(`${label} is missing ${entry.path}`);
    const bytes = readFileSync(absolute);
    if (bytes.length !== entry.bytes || sha256(bytes) !== entry.sha256) {
      fail(`${label}/${entry.path} does not match its manifest`);
    }
  }

  const actualPaths = walk(bundleDir, bundleDir);
  const stray = actualPaths.find((path) => !expectedPaths.has(path));
  if (stray !== undefined) fail(`${label} contains unexpected file ${JSON.stringify(stray)}`);
  const missing = [...expectedPaths].find((path) => !actualPaths.includes(path));
  if (missing !== undefined) fail(`${label} is missing ${missing}`);
  const identity = sha256(manifestBytes);
  if (expectedIdentity !== identity) fail(`${label} read model names bundle ${expectedIdentity ?? "<missing>"}, found ${identity}`);
  return { identity, fileCount: actualPaths.length };
}

const REPORT_DATA = (name) => name.endsWith(".json") && !name.endsWith(".presentation.json");

for (const dataName of readdirSync(reportsDir).filter(REPORT_DATA).sort()) {
  const report = JSON.parse(readFileSync(join(reportsDir, dataName), "utf8"));
  if (report.format === "colophon-grouped-report/1") {
    if (!Array.isArray(report.bundles) || report.bundles.length !== 3) fail(`${report.slug} does not carry three grouped bundles`);
    const methods = new Set(report.bundles.map((bundle) => bundle.key));
    for (const required of ["binary-instrument", "pairwise-disagreement", "paired-majority-delta"]) {
      if (!methods.has(required)) fail(`${report.slug} is missing grouped method ${required}`);
    }
    if (new Set(report.bundles.map((bundle) => bundle.reportSha256)).size !== 3) {
      fail(`${report.slug} does not carry three distinct report digests`);
    }
    let fileCount = 0;
    for (const bundle of report.bundles) {
      const bundleDir = join(publicReportsDir, report.slug, "bundle", bundle.key);
      const validated = validateBundle(
        `${report.slug}/${bundle.key}`,
        bundleDir,
        bundle.bundleIdentity,
      );
      const claim = JSON.parse(readFileSync(join(bundleDir, "claim-package.json"), "utf8"));
      if (claim.method?.id !== groupedMethods.get(bundle.key) || claim.method?.version !== "1") {
        fail(`${report.slug}/${bundle.key} method differs from its read model`);
      }
      if (claim.records?.runSha256 !== report.digests.runSha256
        || claim.records?.matrixSha256 !== report.digests.matrixSha256
        || claim.records?.reportSha256 !== bundle.reportSha256) {
        fail(`${report.slug}/${bundle.key} record identities differ from its read model`);
      }
      for (const [recordKey, path] of [
        ["benchmarkSha256", "benchmark.json"],
        ["matrixSha256", "matrix.json"],
        ["reportSha256", "report.json"],
        ["runSha256", "run.json"],
      ]) {
        const absolute = join(bundleDir, path);
        if (!existsSync(absolute)) fail(`${report.slug}/${bundle.key} is missing ${path}`);
        const actual = sha256(readFileSync(absolute));
        if (claim.records?.[recordKey] !== actual) {
          fail(`${report.slug}/${bundle.key}/${path} does not match claim.records.${recordKey}`);
        }
      }
      fileCount += validated.fileCount;
    }
    console.log(`validated ${report.slug} (3 bundles, ${fileCount} files, run sha256:${report.digests.runSha256})`);
    continue;
  }

  const bundleDir = join(publicReportsDir, report.slug, "bundle");
  const validated = validateBundle(report.slug, bundleDir, report.digests?.bundleIdentity);
  if (report.format === QUALIFIED_FORMAT || report.format === DISCLOSED_FORMAT) {
    const extra = validateQualified(report, bundleDir);
    console.log(
      `validated ${report.slug} (${validated.fileCount} files, ${extra.anchors} anchors,`
      + ` ${extra.disclosed} variables measured here, sha256:${validated.identity})`,
    );
    continue;
  }
  console.log(`validated ${report.slug} (${validated.fileCount} files, sha256:${validated.identity})`);
}
