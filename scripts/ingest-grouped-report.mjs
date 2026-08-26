#!/usr/bin/env node
/**
 * Validates and ingests the three LoCoMo judge-report bundles emitted from one
 * run: binary-instrument, pairwise-disagreement, and paired-majority-delta.
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

const GROUP_FORMAT = "colophon-grouped-report/1";
const SUPPORTED_BUNDLE_FORMATS = new Set([
  "benchmark-product-public-bundle/2",
  "benchmark-product-public-bundle/4",
]);
const METHOD_ORDER = [
  {
    id: "jinn.benchmarking.method/binary-instrument",
    key: "binary-instrument",
    label: "Binary instrument",
    resultKey: "qualification",
  },
  {
    id: "jinn.benchmarking.method/pairwise-disagreement",
    key: "pairwise-disagreement",
    label: "Pairwise disagreement",
    resultKey: "pairwiseDisagreement",
  },
  {
    id: "jinn.benchmarking.method/paired-majority-delta",
    key: "paired-majority-delta",
    label: "Paired-majority delta",
    resultKey: "pairedMajorityDelta",
  },
];
const SHA256 = /^[a-f0-9]{64}$/;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

function refuse(message) {
  throw new Error(`ingest-grouped-report: ${message}`);
}

function readJson(directory, path) {
  try {
    return JSON.parse(readFileSync(join(directory, ...path.split("/")), "utf8"));
  } catch {
    refuse(`${path} is missing or is not valid JSON in ${directory}`);
  }
}

function walk(directory, root = directory) {
  return readdirSync(directory).flatMap((name) => {
    const absolute = join(directory, name);
    const stat = lstatSync(absolute);
    const path = relative(root, absolute).split(sep).join("/");
    if (stat.isSymbolicLink()) refuse(`bundle contains a symbolic link: ${path}`);
    return stat.isDirectory() ? walk(absolute, root) : [path];
  });
}

function safeManifestPath(path) {
  return typeof path === "string"
    && path !== ""
    && path !== "bundle.json"
    && !path.startsWith("/")
    && !path.includes("\\")
    && path.split("/").every((part) => part !== "" && part !== "." && part !== "..");
}

export function validateGroupedBundle(bundleArgument) {
  const directory = resolve(bundleArgument);
  const manifestPath = join(directory, "bundle.json");
  if (!existsSync(manifestPath)) refuse(`no bundle.json in ${directory}`);
  const manifestBytes = readFileSync(manifestPath);
  const manifest = readJson(directory, "bundle.json");
  if (!SUPPORTED_BUNDLE_FORMATS.has(manifest.format)) {
    refuse(`unsupported grouped bundle format ${manifest.format}`);
  }
  if (!Array.isArray(manifest.files) || manifest.files.length === 0) {
    refuse(`bundle manifest has no members in ${directory}`);
  }

  const paths = new Set(["bundle.json"]);
  let previousPath = "";
  for (const entry of manifest.files) {
    if (!safeManifestPath(entry.path) || paths.has(entry.path)) {
      refuse(`invalid or duplicate manifest path ${entry.path}`);
    }
    if (previousPath !== "" && previousPath >= entry.path) {
      refuse(`manifest paths are not strictly sorted: ${previousPath}, ${entry.path}`);
    }
    previousPath = entry.path;
    if (!Number.isSafeInteger(entry.bytes) || entry.bytes < 0 || !SHA256.test(entry.sha256)) {
      refuse(`invalid manifest metadata for ${entry.path}`);
    }
    const absolute = join(directory, ...entry.path.split("/"));
    if (!existsSync(absolute) || !lstatSync(absolute).isFile()) {
      refuse(`manifest member is missing or not a regular file: ${entry.path}`);
    }
    const memberBytes = readFileSync(absolute);
    if (memberBytes.length !== entry.bytes || sha256(memberBytes) !== entry.sha256) {
      refuse(`manifest mismatch for ${entry.path}`);
    }
    paths.add(entry.path);
  }
  const actualPaths = walk(directory);
  const unexpected = actualPaths.find((path) => !paths.has(path));
  if (unexpected !== undefined) refuse(`bundle carries an unmanifested file: ${unexpected}`);
  const missing = [...paths].find((path) => !actualPaths.includes(path));
  if (missing !== undefined) refuse(`bundle is missing ${missing}`);
  for (const required of ["claim-package.json", "matrix.json", "report.json", "run.json"]) {
    if (!paths.has(required)) refuse(`bundle is missing required member ${required}`);
  }

  const claim = readJson(directory, "claim-package.json");
  const report = readJson(directory, "report.json");
  const run = readJson(directory, "run.json");
  const method = METHOD_ORDER.find((candidate) => candidate.id === claim.method?.id);
  if (method === undefined || claim.method?.version !== "1") {
    refuse(`bundle has an unexpected method ${claim.method?.id}@${claim.method?.version}`);
  }
  const records = claim.records;
  if (![records?.runSha256, records?.matrixSha256, records?.reportSha256, records?.benchmarkSha256].every((digest) => SHA256.test(digest))) {
    refuse(`${method.key} claim carries an invalid record digest`);
  }
  if (claim[method.resultKey] === undefined || typeof claim[method.resultKey] !== "object") {
    refuse(`${method.key} claim does not carry ${method.resultKey}`);
  }
  if (method.key === "binary-instrument" && manifest.format !== "benchmark-product-public-bundle/4") {
    refuse("binary-instrument bundle must use public-bundle/4");
  }
  if (!Array.isArray(claim.scope?.arms) || claim.scope.arms.length !== 6) {
    refuse(`${method.key} claim does not carry the six-arm scope`);
  }

  return {
    directory,
    manifest,
    manifestBytes,
    paths: [...paths].sort(),
    claim,
    report,
    run,
    method,
    bundleIdentity: sha256(manifestBytes),
  };
}

export function buildGroupedReport(bundleArguments, options) {
  if (!Array.isArray(bundleArguments) || bundleArguments.length !== 3) {
    refuse("exactly three bundle directories are required");
  }
  const slug = options?.slug;
  if (typeof slug !== "string" || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    refuse(`slug must be lowercase [a-z0-9-], got: ${slug}`);
  }
  if (options?.reportedAt !== undefined && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(options.reportedAt)) {
    refuse(`reported-at must be an RFC 3339 UTC timestamp, got: ${options.reportedAt}`);
  }
  const bundles = bundleArguments.map(validateGroupedBundle);
  const byMethod = new Map(bundles.map((bundle) => [bundle.method.id, bundle]));
  if (byMethod.size !== 3 || METHOD_ORDER.some((method) => !byMethod.has(method.id))) {
    refuse("group must contain one bundle for each registered judge-report method");
  }
  const ordered = METHOD_ORDER.map((method) => byMethod.get(method.id));
  const runDigests = new Set(ordered.map((bundle) => bundle.claim.records.runSha256));
  const matrixDigests = new Set(ordered.map((bundle) => bundle.claim.records.matrixSha256));
  const reportDigests = new Set(ordered.map((bundle) => bundle.claim.records.reportSha256));
  if (runDigests.size !== 1) refuse("the three bundles do not share one runSha256");
  if (matrixDigests.size !== 1) refuse("the three bundles do not share one matrixSha256");
  if (reportDigests.size !== 3) refuse("the three bundles do not carry distinct reportSha256 values");

  const first = ordered[0].claim;
  const scopeIdentity = JSON.stringify({
    benchmarkSha256: first.records.benchmarkSha256,
    taskCount: first.scope.taskCount,
    arms: first.scope.arms,
    replicates: first.scope.replicates,
    venue: first.scope.venue,
  });
  for (const bundle of ordered.slice(1)) {
    const claim = bundle.claim;
    const candidate = JSON.stringify({
      benchmarkSha256: claim.records.benchmarkSha256,
      taskCount: claim.scope.taskCount,
      arms: claim.scope.arms,
      replicates: claim.scope.replicates,
      venue: claim.scope.venue,
    });
    if (candidate !== scopeIdentity) refuse(`${bundle.method.key} scope differs from the binary-instrument scope`);
  }

  const groupedBundles = ordered.map((bundle) => ({
    key: bundle.method.key,
    label: bundle.method.label,
    bundleFormat: bundle.manifest.format,
    bundleIdentity: bundle.bundleIdentity,
    method: bundle.claim.method,
    reportSha256: bundle.claim.records.reportSha256,
    verification: bundle.claim.verification,
    limitations: Array.isArray(bundle.claim.limitations) ? bundle.claim.limitations : [],
    result: bundle.claim[bundle.method.resultKey],
    files: [
      { path: "bundle.json", bytes: bundle.manifestBytes.length, sha256: bundle.bundleIdentity },
      ...bundle.manifest.files,
    ],
  }));
  const runSha256 = ordered[0].claim.records.runSha256;
  const matrixSha256 = ordered[0].claim.records.matrixSha256;
  return {
    format: GROUP_FORMAT,
    slug,
    fixture: options?.fixture === true,
    title: options?.title ?? "LoCoMo judge report",
    summary: "Three independently verifiable analyses of one six-arm judge run.",
    reportedAt: options?.reportedAt ?? null,
    lockedAt: null,
    socialCardPath: null,
    scope: {
      benchmarkSha256: first.records.benchmarkSha256,
      taskCount: first.scope.taskCount,
      arms: first.scope.arms,
      replicates: first.scope.replicates,
      venue: first.scope.venue,
    },
    digests: { runSha256, matrixSha256 },
    bundles: groupedBundles,
    licenseRegisterUrl: "https://github.com/colophon-claims/locomo-judge-report/blob/main/source-register.json",
  };
}

export function ingestGroupedReport(bundleArguments, options, siteRoot = fileURLToPath(new URL("..", import.meta.url))) {
  const data = buildGroupedReport(bundleArguments, options);
  const destination = join(siteRoot, "public", "reports", data.slug);
  const dataFile = join(siteRoot, "data", "reports", `${data.slug}.json`);
  if (existsSync(destination) || existsSync(dataFile)) {
    refuse(`refusing to overwrite existing append-only report slug ${data.slug}`);
  }
  const validated = bundleArguments.map(validateGroupedBundle);
  const byMethod = new Map(validated.map((bundle) => [bundle.method.id, bundle]));
  for (const method of METHOD_ORDER) {
    const bundle = byMethod.get(method.id);
    const bundleDestination = join(destination, "bundle", method.key);
    for (const path of bundle.paths) {
      const target = join(bundleDestination, ...path.split("/"));
      mkdirSync(dirname(target), { recursive: true });
      copyFileSync(join(bundle.directory, ...path.split("/")), target);
    }
  }
  mkdirSync(dirname(dataFile), { recursive: true });
  writeFileSync(dataFile, `${JSON.stringify(data, null, 2)}\n`);
  return data;
}

function parseCli(argv) {
  const bundleArguments = [];
  const options = { fixture: false };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--slug" || value === "--title" || value === "--reported-at") {
      options[value.slice(2)] = argv[index + 1];
      index += 1;
    } else if (value === "--fixture") {
      options.fixture = true;
    } else {
      bundleArguments.push(value);
    }
  }
  return { bundleArguments, options };
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { bundleArguments, options } = parseCli(process.argv.slice(2));
    const data = ingestGroupedReport(bundleArguments, options);
    console.log(`ingested grouped report ${data.slug}`);
    for (const bundle of data.bundles) {
      console.log(`  ${bundle.key}: sha256:${bundle.bundleIdentity}`);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
