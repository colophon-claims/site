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

function fail(message) {
  throw new Error(`validate-published-reports: ${message}`);
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

for (const dataName of readdirSync(reportsDir).filter((name) => name.endsWith(".json")).sort()) {
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

  const validated = validateBundle(
    report.slug,
    join(publicReportsDir, report.slug, "bundle"),
    report.digests?.bundleIdentity,
  );
  console.log(`validated ${report.slug} (${validated.fileCount} files, sha256:${validated.identity})`);
}
