#!/usr/bin/env node
/**
 * Ingests one immutable Colophon public bundle into the static site.
 *
 *   node scripts/ingest-report.mjs <bundle-dir> --slug <slug> [--fixture]
 *
 * Supported formats:
 *   - benchmark-product-public-bundle/1 (legacy application bundle)
 *   - benchmark-product-public-bundle/5 (evidence-native claim bundle)
 *
 * The bundle is validated against its own manifest, copied byte-exact, and
 * projected into a small site read model. Existing slugs are never replaced.
 */
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const LEGACY_FORMAT = "benchmark-product-public-bundle/1";
const EVIDENCE_FORMAT = "benchmark-product-public-bundle/5";

const LEGACY_FIXED_FILES = [
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

const LEGACY_OPTIONAL_FILES = ["verification/cancel-requested.json"];
const EVIDENCE_REQUIRED_FILES = [
  "README.md",
  "analysis-manifest.json",
  "benchmark.json",
  "claim-package.json",
  "cohort.json",
  "matrix.json",
  "presentation.json",
  "report-envelope.json",
  "report.json",
];

function fail(message) {
  console.error(`ingest-report: ${message}`);
  process.exit(1);
}

const args = process.argv.slice(2);
let bundleArg;
let slug;
let fixture = false;
for (let index = 0; index < args.length; index += 1) {
  if (args[index] === "--slug") {
    slug = args[index + 1];
    index += 1;
  } else if (args[index] === "--fixture") {
    fixture = true;
  } else if (bundleArg === undefined) {
    bundleArg = args[index];
  } else {
    fail(`unexpected argument: ${args[index]}`);
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

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const readJson = (name) => {
  try {
    return JSON.parse(readFileSync(join(bundleDir, ...name.split("/")), "utf8"));
  } catch {
    fail(`${name} is missing or is not valid JSON`);
  }
};

const manifestPath = join(bundleDir, "bundle.json");
if (!existsSync(manifestPath)) fail(`no bundle.json manifest in ${bundleDir}`);
const manifestBytes = readFileSync(manifestPath);
const manifest = readJson("bundle.json");
if (manifest.format !== LEGACY_FORMAT && manifest.format !== EVIDENCE_FORMAT) {
  fail(`unknown bundle format: ${manifest.format}`);
}
if (!Array.isArray(manifest.files) || manifest.files.length === 0) {
  fail("bundle.json carries no file entries");
}

const manifestPaths = new Set();
for (const entry of manifest.files) {
  const { path, bytes, sha256: expected } = entry;
  if (
    typeof path !== "string"
    || path === ""
    || path.startsWith("/")
    || path.includes("\\")
    || path.split("/").some((part) => part === "" || part === "." || part === "..")
    || path === "bundle.json"
  ) {
    fail(`manifest entry has an invalid path: ${path}`);
  }
  if (!Number.isSafeInteger(bytes) || bytes < 0 || !/^[a-f0-9]{64}$/.test(expected)) {
    fail(`manifest entry has invalid byte or digest metadata: ${path}`);
  }
  if (manifestPaths.has(path)) fail(`manifest lists ${path} twice`);
  manifestPaths.add(path);
  const absolute = join(bundleDir, ...path.split("/"));
  if (!existsSync(absolute) || !lstatSync(absolute).isFile()) {
    fail(`manifest lists ${path} but it is missing or not a regular file`);
  }
  const actual = readFileSync(absolute);
  if (actual.length !== bytes) {
    fail(`${path}: byte length ${actual.length} does not match manifest ${bytes}`);
  }
  const digest = sha256(actual);
  if (digest !== expected) {
    fail(`${path}: sha256 ${digest} does not match manifest ${expected}`);
  }
}

if (manifest.format === LEGACY_FORMAT) {
  for (const fixed of LEGACY_FIXED_FILES) {
    if (!manifestPaths.has(fixed)) fail(`fixed member missing from manifest: ${fixed}`);
  }
  if (![...manifestPaths].some((path) => /^records\/[a-f0-9]{64}\.bin$/.test(path))) {
    fail("bundle carries no records/<sha256>.bin evidence members");
  }
  for (const path of manifestPaths) {
    const isFixed = LEGACY_FIXED_FILES.includes(path) || LEGACY_OPTIONAL_FILES.includes(path);
    const isRecord = /^records\/[a-f0-9]{64}\.bin$/.test(path);
    if (!isFixed && !isRecord) fail(`manifest carries a member outside the legacy format: ${path}`);
  }
} else {
  for (const required of EVIDENCE_REQUIRED_FILES) {
    if (!manifestPaths.has(required)) fail(`evidence-native member missing from manifest: ${required}`);
  }
  if (![...manifestPaths].some((path) => /^records\/[a-f0-9]{64}\.bin$/.test(path))) {
    fail("evidence-native bundle carries no evidence records");
  }
  if (![...manifestPaths].some((path) => /^artifacts\/[a-f0-9]{64}\.bin$/.test(path))) {
    fail("evidence-native bundle carries no artifacts");
  }
}

const walk = (directory) => readdirSync(directory).flatMap((name) => {
  const absolute = join(directory, name);
  const stat = lstatSync(absolute);
  if (stat.isSymbolicLink()) fail(`bundle contains a symbolic link: ${relative(bundleDir, absolute)}`);
  return stat.isDirectory() ? walk(absolute) : [absolute];
});
for (const absolute of walk(bundleDir)) {
  const path = relative(bundleDir, absolute).split(sep).join("/");
  if (path !== "bundle.json" && !manifestPaths.has(path)) {
    fail(`file on disk is not in the manifest: ${path}`);
  }
}

const bundleIdentity = sha256(manifestBytes);
const files = [
  { path: "bundle.json", bytes: manifestBytes.length, sha256: bundleIdentity },
  ...manifest.files.map(({ path, bytes, sha256: digest }) => ({ path, bytes, sha256: digest })),
];

function extractLegacy() {
  const claim = readJson("claim-package.json");
  const report = readJson("report.json");
  const run = readJson("run.json");
  const benchmark = readJson("benchmark.json");
  if (claim.claimSchema !== "benchmark-product.claim-package/1") {
    fail(`unknown legacy claim package schema: ${claim.claimSchema}`);
  }
  const title = typeof report.title === "string" ? report.title : `Report ${slug}`;
  const isFixture = fixture || /fixture/i.test(title) || claim.fixture === true;
  return {
    format: LEGACY_FORMAT,
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
    socialCardPath: "social-card.svg",
    files,
  };
}

function extractEvidenceNative() {
  if (fixture) fail("--fixture is only valid for legacy test bundles");
  const claim = readJson("claim-package.json");
  const presentation = readJson("presentation.json");
  const reportEnvelopeBytes = readFileSync(join(bundleDir, "report-envelope.json"));
  if (claim.claimSchema !== "benchmark-product.claim-package/3") {
    fail(`unknown evidence-native claim package schema: ${claim.claimSchema}`);
  }
  if (presentation.schema !== "colophon.report-presentation/1") {
    fail(`unknown public presentation schema: ${presentation.schema}`);
  }
  if (presentation.slug !== slug) {
    fail(`presentation slug ${presentation.slug} does not match requested slug ${slug}`);
  }
  if (presentation.verification?.bundleFormat !== EVIDENCE_FORMAT) {
    fail("presentation does not identify its evidence-native bundle format");
  }
  if (presentation.verification.readerAvailability !== "available") {
    fail("presentation does not identify the public reader as available");
  }
  const reportEnvelopeSha256 = sha256(reportEnvelopeBytes);
  if (presentation.verification.reportEnvelopeSha256 !== reportEnvelopeSha256) {
    fail("presentation report-envelope digest does not match report-envelope.json");
  }
  if (typeof presentation.title !== "string" || /demo[- ]?1/i.test(presentation.title)) {
    fail("public report title is missing or exposes an internal run label");
  }
  if (
    typeof presentation.execution?.source?.upstreamRuntime?.name !== "string" ||
    typeof presentation.execution?.armConstruction?.reason !== "string" ||
    typeof presentation.execution?.agentHarness?.name !== "string" ||
    typeof presentation.execution?.grading?.verifier !== "string"
  ) {
    fail("public presentation execution provenance is incomplete");
  }
  return {
    format: EVIDENCE_FORMAT,
    slug,
    fixture: false,
    title: presentation.title,
    summary: presentation.summary,
    reportedAt: presentation.sealedAt,
    subject: presentation.subject,
    question: presentation.question,
    execution: presentation.execution,
    result: presentation.result,
    population: presentation.population,
    accounting: presentation.accounting,
    manipulationCheck: presentation.manipulationCheck,
    limitations: presentation.limitations,
    selfRunDisclosure: presentation.selfRunDisclosure,
    verification: presentation.verification,
    provenance: presentation.provenance,
    digests: {
      bundleIdentity,
      reportEnvelopeSha256,
      benchmarkSha256: presentation.provenance.benchmarkSha256,
      analysisManifestSha256: presentation.provenance.analysisManifestSha256,
      cohortSha256: presentation.provenance.cohortSha256,
      matrixSha256: presentation.provenance.matrixSha256,
    },
    socialCardPath: null,
    files,
  };
}

const data = manifest.format === LEGACY_FORMAT ? extractLegacy() : extractEvidenceNative();

for (const path of ["bundle.json", ...manifestPaths]) {
  const from = join(bundleDir, ...path.split("/"));
  const to = join(destDir, "bundle", ...path.split("/"));
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
}

mkdirSync(dirname(dataFile), { recursive: true });
writeFileSync(dataFile, `${JSON.stringify(data, null, 2)}\n`);

console.log(`ingested ${relative(root, bundleDir) || bundleDir}`);
console.log(`  format:   ${manifest.format}`);
console.log(`  bundle:   public/reports/${slug}/bundle/ (${manifestPaths.size + 1} files, byte-exact)`);
console.log(`  data:     data/reports/${slug}.json`);
console.log(`  identity: ${bundleIdentity}`);
if (data.fixture) console.log("  marked as FIXTURE");
