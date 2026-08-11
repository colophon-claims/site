#!/usr/bin/env node
/**
 * Ingests one published benchmark bundle (benchmark-product-public-bundle/1)
 * into the site:
 *
 *   node scripts/ingest-report.mjs <bundle-dir> --slug <slug> [--fixture]
 *
 * 1. Validates the bundle: bundle.json manifest present; the 16 fixed members
 *    all present; every manifest entry exists on disk with the exact byte
 *    length and SHA-256 it declares; no stray files beyond the manifest.
 * 2. Copies the bundle BYTE-EXACT into public/reports/<slug>/bundle/. The
 *    site is a display case, not a CMS: it never transforms a published
 *    bundle, so the copy is the manifest's own bytes, nothing added, nothing
 *    rewritten.
 * 3. Emits data/reports/<slug>.json, the read model the report page renders.
 *    Every field in it is EXTRACTED from the bundle's records, never invented.
 *
 * Append-only: report URLs are immutable. If the slug already exists in
 * either public/reports/ or data/reports/, this script refuses. Publishing a
 * correction means publishing a new bundle under a new slug.
 */
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const FIXED_FILES = [
  "static-bundle.json",
  "benchmark.json",
  "run.json",
  "matrix.json",
  "report.json",
  "report-envelope.json",
  "claim-package.json",
  "verdicts.json",
  "evidence.json",
  "verification/assembly.jsonl",
  "trust/public-keys.json",
  "index.html",
  "badge.svg",
  "social-card.svg",
  "README.md",
  "share.txt",
];

const OPTIONAL_FILES = ["verification/cancel-requested.json"];

function fail(message) {
  console.error(`ingest-report: ${message}`);
  process.exit(1);
}

// --- arguments ---
const args = process.argv.slice(2);
let bundleArg;
let slug;
let fixture = false;
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === "--slug") {
    slug = args[i + 1];
    i += 1;
  } else if (args[i] === "--fixture") {
    fixture = true;
  } else if (bundleArg === undefined) {
    bundleArg = args[i];
  } else {
    fail(`unexpected argument: ${args[i]}`);
  }
}
if (bundleArg === undefined || slug === undefined) {
  fail("usage: node scripts/ingest-report.mjs <bundle-dir> --slug <slug> [--fixture]");
}
if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
  fail(`slug must be lowercase [a-z0-9-], got: ${slug}`);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const bundleDir = resolve(bundleArg);
const destDir = join(root, "public", "reports", slug);
const dataFile = join(root, "data", "reports", `${slug}.json`);

// --- append-only gate ---
if (existsSync(destDir)) {
  fail(
    `refusing to overwrite: public/reports/${slug} already exists. Report URLs are append-only; publish a new bundle under a new slug.`,
  );
}
if (existsSync(dataFile)) {
  fail(
    `refusing to overwrite: data/reports/${slug}.json already exists. Report URLs are append-only; publish a new bundle under a new slug.`,
  );
}

// --- validate the bundle ---
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

const manifestPath = join(bundleDir, "bundle.json");
if (!existsSync(manifestPath)) fail(`no bundle.json manifest in ${bundleDir}`);
const manifestBytes = readFileSync(manifestPath);
let manifest;
try {
  manifest = JSON.parse(manifestBytes.toString("utf8"));
} catch {
  fail("bundle.json is not valid JSON");
}
if (manifest.format !== "benchmark-product-public-bundle/1") {
  fail(`unknown bundle format: ${manifest.format}`);
}
if (!Array.isArray(manifest.files) || manifest.files.length === 0) {
  fail("bundle.json carries no file entries");
}

const manifestPaths = new Set();
for (const entry of manifest.files) {
  const { path, bytes, sha256: expected } = entry;
  if (typeof path !== "string" || path.startsWith("/") || path.split("/").includes("..") || path === "bundle.json") {
    fail(`manifest entry has an invalid path: ${path}`);
  }
  if (manifestPaths.has(path)) fail(`manifest lists ${path} twice`);
  manifestPaths.add(path);
  const abs = join(bundleDir, ...path.split("/"));
  if (!existsSync(abs)) fail(`manifest lists ${path} but the file is missing`);
  const actual = readFileSync(abs);
  if (actual.length !== bytes) {
    fail(`${path}: byte length ${actual.length} does not match manifest ${bytes}`);
  }
  const digest = sha256(actual);
  if (digest !== expected) {
    fail(`${path}: sha256 ${digest} does not match manifest ${expected}`);
  }
}

for (const fixed of FIXED_FILES) {
  if (!manifestPaths.has(fixed)) fail(`fixed member missing from manifest: ${fixed}`);
}
if (![...manifestPaths].some((p) => p.startsWith("records/") && p.endsWith(".bin"))) {
  fail("bundle carries no records/<sha256>.bin evidence members");
}
for (const path of manifestPaths) {
  const isFixed = FIXED_FILES.includes(path) || OPTIONAL_FILES.includes(path);
  const isRecord = /^records\/[a-f0-9]{64}\.bin$/.test(path);
  if (!isFixed && !isRecord) fail(`manifest carries a member outside the format: ${path}`);
}

// no stray files on disk beyond the manifest + bundle.json
const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const abs = join(dir, name);
    return statSync(abs).isDirectory() ? walk(abs) : [abs];
  });
for (const abs of walk(bundleDir)) {
  const rel = relative(bundleDir, abs).split(sep).join("/");
  if (rel !== "bundle.json" && !manifestPaths.has(rel)) {
    fail(`file on disk is not in the manifest: ${rel}`);
  }
}

const bundleIdentity = sha256(manifestBytes);

// --- extract the read model (never invented, always from the records) ---
const readJson = (name) => JSON.parse(readFileSync(join(bundleDir, name), "utf8"));
const claim = readJson("claim-package.json");
const report = readJson("report.json");
const run = readJson("run.json");
const benchmark = readJson("benchmark.json");

if (claim.claimSchema !== "benchmark-product.claim-package/1") {
  fail(`unknown claim package schema: ${claim.claimSchema}`);
}

const title = typeof report.title === "string" ? report.title : `Report ${slug}`;
const isFixture = fixture || /fixture/i.test(title) || claim.fixture === true;

const data = {
  slug,
  fixture: isFixture,
  title,
  summary: typeof report.summary === "string" ? report.summary : null,
  taskSet: typeof benchmark.name === "string" ? benchmark.name : null,
  taskCount: claim.scope.taskCount,
  replicates: claim.scope.replicates,
  venue: claim.scope.venue,
  arms: claim.scope.arms,
  method: claim.method,
  lockedAt: typeof run.lockedAt === "string" ? run.lockedAt : null,
  reportedAt: typeof report.reportedAt === "string" ? report.reportedAt : null,
  headline: claim.headline,
  completeness: claim.completeness,
  attrition: claim.attrition,
  conflicted: claim.conflicted,
  assurance: claim.assurance,
  disclosures: {
    integrityTierCounts: claim.disclosures.integrityTierCounts,
    pinningUnverifiableCounts: claim.disclosures.pinningUnverifiableCounts,
  },
  limitations: claim.limitations,
  rehearsal: claim.rehearsal ?? null,
  verification: claim.verification,
  digests: {
    bundleIdentity,
    benchmarkSha256: claim.records.benchmarkSha256,
    runSha256: claim.records.runSha256,
    matrixSha256: claim.records.matrixSha256,
    reportSha256: claim.records.reportSha256,
    reportEnvelopeSha256: claim.records.reportEnvelopeSha256,
  },
  files: [
    { path: "bundle.json", bytes: manifestBytes.length, sha256: bundleIdentity },
    ...manifest.files.map(({ path, bytes, sha256: digest }) => ({ path, bytes, sha256: digest })),
  ],
};

// --- copy byte-exact ---
for (const path of ["bundle.json", ...manifestPaths]) {
  const from = join(bundleDir, ...path.split("/"));
  const to = join(destDir, "bundle", ...path.split("/"));
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
}

mkdirSync(dirname(dataFile), { recursive: true });
writeFileSync(dataFile, JSON.stringify(data, null, 2) + "\n");

console.log(`ingested ${relative(root, bundleDir) || bundleDir}`);
console.log(`  bundle:   public/reports/${slug}/bundle/ (${manifestPaths.size + 1} files, byte-exact)`);
console.log(`  data:     data/reports/${slug}.json`);
console.log(`  identity: ${bundleIdentity}`);
if (isFixture) console.log("  marked as FIXTURE");
