#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const reportsDir = join(root, "data", "reports");
const publicReportsDir = join(root, "public", "reports");
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

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

for (const dataName of readdirSync(reportsDir).filter((name) => name.endsWith(".json")).sort()) {
  const report = JSON.parse(readFileSync(join(reportsDir, dataName), "utf8"));
  const bundleDir = join(publicReportsDir, report.slug, "bundle");
  const manifestPath = join(bundleDir, "bundle.json");
  if (!existsSync(manifestPath)) fail(`${report.slug} has no bundle.json`);

  const manifestBytes = readFileSync(manifestPath);
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  if (!Array.isArray(manifest.files)) fail(`${report.slug} has an invalid bundle manifest`);

  const expectedPaths = new Set(["bundle.json"]);
  for (const entry of manifest.files) {
    if (expectedPaths.has(entry.path)) fail(`${report.slug} lists ${entry.path} twice`);
    expectedPaths.add(entry.path);
    const absolute = join(bundleDir, ...entry.path.split("/"));
    if (!existsSync(absolute) || !lstatSync(absolute).isFile()) {
      fail(`${report.slug} is missing ${entry.path}`);
    }
    const bytes = readFileSync(absolute);
    if (bytes.length !== entry.bytes || sha256(bytes) !== entry.sha256) {
      fail(`${report.slug}/${entry.path} does not match its manifest`);
    }
  }

  const actualPaths = walk(bundleDir, bundleDir);
  const stray = actualPaths.filter((path) => !expectedPaths.has(path));
  if (stray.length !== 0) fail(`${report.slug} contains unexpected file ${JSON.stringify(stray[0])}`);
  const missing = [...expectedPaths].filter((path) => !actualPaths.includes(path));
  if (missing.length !== 0) fail(`${report.slug} is missing ${missing[0]}`);

  const identity = sha256(manifestBytes);
  if (report.digests?.bundleIdentity !== identity) {
    fail(`${report.slug} read model names bundle ${report.digests?.bundleIdentity ?? "<missing>"}, found ${identity}`);
  }
  console.log(`validated ${report.slug} (${actualPaths.length} files, sha256:${identity})`);
}
