#!/usr/bin/env node
/**
 * Ingests one immutable Colophon public bundle into the static site.
 *
 *   node scripts/ingest-report.mjs <bundle-dir> --slug <slug> [--fixture]
 *
 * Supported formats:
 *   - benchmark-product-public-bundle/1 (legacy application bundle)
 *   - benchmark-product-public-bundle/5 (evidence-native claim bundle)
 *   - benchmark-product-public-bundle/7 (anchored binary-qualification bundle)
 *   - benchmark-product-public-bundle/8 (the same, plus a sealed six-variable
 *     disclosure-specification record)
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
/** The anchored binary-qualification closure: the legacy member list plus
 * `qualification.json`, plus one `anchors/<sha256>.bin` per carried anchor. */
const QUALIFIED_FORMAT = "benchmark-product-public-bundle/7";
/** The same closure carrying a sealed six-variable disclosure-specification
 * record at `records/<sha256>.bin`, plus the `disclosure` claim section. */
const DISCLOSED_FORMAT = "benchmark-product-public-bundle/8";

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

/**
 * The /7 and /8 member list: the legacy sixteen with `qualification.json` added.
 *
 * The public reading record is NOT in this list. It reaches the site one of two
 * ways: sealed into the bundle as a `presentation.json` member, on a closure
 * that allows one, or supplied at ingest with `--presentation` and stored beside
 * the read model. The second exists because no current closure carries the
 * member, and inserting one into a published bundle would break the very digest
 * an auditor checks. Either way the site assembles no public copy of its own.
 */
const QUALIFIED_FIXED_FILES = [
  "static-bundle.json",
  "benchmark.json",
  "run.json",
  "matrix.json",
  "report.json",
  "report-envelope.json",
  "claim-package.json",
  "qualification.json",
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

/** Allowed but never required on these closures. */
const QUALIFIED_OPTIONAL_FILES = [
  "verification/cancel-requested.json",
  "presentation.json",
];

const PRESENTATION_SCHEMA = "colophon.report-presentation/2";
const QUALIFIED_CLAIM_SCHEMA = "benchmark-product.claim-package/5";
const DISCLOSED_CLAIM_SCHEMA = "benchmark-product.claim-package/6";
/** `qualification.json` names the projection shape its graph was built for. It
 * stays pinned at /2 on every closure and never co-varies with the claim id. */
const QUALIFICATION_CLAIM_SCHEMA = "benchmark-product.claim-package/2";

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
/**
 * The one check whose presence is a property of the bundle rather than of its
 * format: a closure that carries a sealed reading record runs it, and one that
 * does not never lists it. So the claim carries the format's list and the
 * reading record carries that list plus this, and the two legitimately differ
 * by exactly one entry. A page promising the claim's count while the reader
 * runs one more would be wrong in the place a reader is most entitled to check.
 */
const PRESENTATION_CHECK = "report-presentation";

const DISCLOSURE_RECORD_KIND = "https://spec.jinn.network/records/disclosure-specification/v1";
const SIX_VARIABLE_SPECIFICATION = "https://spec.jinn.network/disclosure/six-variable/v1";
/** Frozen and closed. A seventh variable is a conformance failure, not an extra. */
const DISCLOSURE_VARIABLE_KEYS = [
  "ingestion-model",
  "retrieval-config",
  "answer-model",
  "answer-prompt",
  "judge-model",
  "judge-prompt",
];
const DISCLOSURE_EVIDENCE_ROLES = ["pinned-configuration", "execution-observation"];
const DISCLOSURE_UNDISCLOSED_REASONS = [
  "not-stated",
  "stated-without-identifiers",
  "outside-this-experiment",
];

/** Every top-level section a sealed reading record carries. The site refuses a
 * record with a section it does not project, rather than dropping it silently. */
const PRESENTATION_SECTIONS = [
  "schema",
  "slug",
  "title",
  "summary",
  "sealedAt",
  "subject",
  "question",
  "execution",
  "result",
  "population",
  "accounting",
  "manipulationCheck",
  "limitations",
  "selfRunDisclosure",
  "verification",
  "provenance",
];

const SHA256_HEX = /^[a-f0-9]{64}$/;

function fail(message) {
  console.error(`ingest-report: ${message}`);
  process.exit(1);
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

const args = process.argv.slice(2);
let bundleArg;
let slug;
let presentationArg;
let fixture = false;
for (let index = 0; index < args.length; index += 1) {
  if (args[index] === "--slug") {
    slug = args[index + 1];
    index += 1;
  } else if (args[index] === "--presentation") {
    presentationArg = args[index + 1];
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
  fail("usage: node scripts/ingest-report.mjs <bundle-dir> --slug <slug> [--presentation <file>] [--fixture]");
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
let presentationInput;
if (presentationArg !== undefined) {
  const presentationPath = resolve(presentationArg);
  if (!existsSync(presentationPath) || !lstatSync(presentationPath).isFile()) {
    fail(`--presentation names no readable file: ${presentationArg}`);
  }
  presentationInput = readFileSync(presentationPath);
}
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
const SUPPORTED_FORMATS = [LEGACY_FORMAT, EVIDENCE_FORMAT, QUALIFIED_FORMAT, DISCLOSED_FORMAT];
if (!SUPPORTED_FORMATS.includes(manifest.format)) {
  fail(`unknown bundle format: ${manifest.format}`);
}
const isQualified = manifest.format === QUALIFIED_FORMAT || manifest.format === DISCLOSED_FORMAT;
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
} else if (isQualified) {
  for (const fixed of QUALIFIED_FIXED_FILES) {
    if (!manifestPaths.has(fixed)) fail(`fixed member missing from manifest: ${fixed}`);
  }
  if (![...manifestPaths].some((path) => /^records\/[a-f0-9]{64}\.bin$/.test(path))) {
    fail("bundle carries no records/<sha256>.bin evidence members");
  }
  for (const path of manifestPaths) {
    const isFixed = QUALIFIED_FIXED_FILES.includes(path) || QUALIFIED_OPTIONAL_FILES.includes(path);
    const isRecord = /^records\/[a-f0-9]{64}\.bin$/.test(path);
    const isAnchor = /^anchors\/[a-f0-9]{64}\.bin$/.test(path);
    const isNative = /^native\/inspect\/[a-f0-9]{64}\.eval$/.test(path);
    if (!isFixed && !isRecord && !isAnchor && !isNative) {
      fail(`manifest carries a member outside ${manifest.format}: ${path}`);
    }
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

/**
 * Reads and checks the sealed disclosure-specification record the `/8` claim
 * names, and re-derives the claim's `disclosure` section from the record's own
 * bytes. The site is not a verifier and does not replace one; this is the
 * narrow part it can check on its own, so a page never renders a declaration
 * the carried record does not make.
 */
function readDisclosureRecord(section) {
  if (canonical(Object.keys(section).sort()) !== canonical([
    "recordSha256",
    "specification",
    "subjectSha256",
    "variables",
  ])) {
    fail("claim disclosure section does not carry exactly the four projected keys");
  }
  if (!SHA256_HEX.test(section.recordSha256) || !SHA256_HEX.test(section.subjectSha256)) {
    fail("claim disclosure section carries an invalid digest");
  }
  if (section.specification !== SIX_VARIABLE_SPECIFICATION) {
    fail(`claim disclosure section names an unknown specification: ${section.specification}`);
  }
  const recordPath = `records/${section.recordSha256}.bin`;
  if (!manifestPaths.has(recordPath)) {
    fail(`claim names disclosure record ${section.recordSha256} but the bundle carries no ${recordPath}`);
  }
  const record = readJson(recordPath);
  if (record.kind !== DISCLOSURE_RECORD_KIND) {
    fail(`${recordPath} is not a disclosure-specification record`);
  }
  if (record.specification !== SIX_VARIABLE_SPECIFICATION) {
    fail(`${recordPath} names an unknown specification: ${record.specification}`);
  }
  if (typeof record.author !== "string" || record.author === "") {
    fail(`${recordPath} carries no author`);
  }
  if (record.subject?.digest?.sha256 !== section.subjectSha256) {
    fail("disclosure record subject digest does not match the claim disclosure section");
  }
  if (typeof record.subject?.kind !== "string" || record.subject.kind === "") {
    fail(`${recordPath} carries no subject kind`);
  }
  const variableKeys = Object.keys(record.variables ?? {}).sort();
  if (canonical(variableKeys) !== canonical([...DISCLOSURE_VARIABLE_KEYS].sort())) {
    fail("disclosure record does not carry exactly the six frozen variables");
  }
  for (const key of DISCLOSURE_VARIABLE_KEYS) {
    const entry = record.variables[key];
    if (entry === null || typeof entry !== "object") fail(`disclosure variable ${key} is not an entry`);
    if (entry.status === "measured-here") {
      if (typeof entry.statement !== "string" || entry.statement === "") {
        fail(`disclosure variable ${key} is measured-here with no statement`);
      }
      if (!Array.isArray(entry.evidence) || entry.evidence.length === 0) {
        fail(`disclosure variable ${key} is measured-here with no evidence`);
      }
      let pinned = false;
      for (const citation of entry.evidence) {
        if (!DISCLOSURE_EVIDENCE_ROLES.includes(citation?.role)) {
          fail(`disclosure variable ${key} cites an unknown evidence role: ${citation?.role}`);
        }
        if (!SHA256_HEX.test(citation?.digest?.sha256 ?? "")) {
          fail(`disclosure variable ${key} cites an invalid digest`);
        }
        if (!manifestPaths.has(`records/${citation.digest.sha256}.bin`)) {
          fail(
            `disclosure variable ${key} cites record ${citation.digest.sha256}, which this bundle`
            + " does not carry",
          );
        }
        if (citation.role === "pinned-configuration") pinned = true;
      }
      if (!pinned) {
        fail(`disclosure variable ${key} is measured-here but cites no pinned-configuration`);
      }
    } else if (entry.status === "disclosed-by-publisher") {
      if (typeof entry.statement !== "string" || entry.statement === "") {
        fail(`disclosure variable ${key} is disclosed-by-publisher with no statement`);
      }
      if (entry.evidence !== undefined) {
        fail(`disclosure variable ${key} is an assertion carrying evidence`);
      }
      if (entry.sources !== undefined) {
        if (!Array.isArray(entry.sources) || entry.sources.length === 0) {
          fail(`disclosure variable ${key} carries an empty sources list`);
        }
        for (const source of entry.sources) {
          if (typeof source?.uri !== "string" || source.uri === "") {
            fail(`disclosure variable ${key} carries a source with no uri`);
          }
        }
      }
    } else if (entry.status === "undisclosed") {
      if (!DISCLOSURE_UNDISCLOSED_REASONS.includes(entry.reason)) {
        fail(`disclosure variable ${key} is undisclosed for an unknown reason: ${entry.reason}`);
      }
      if (entry.statement !== undefined || entry.evidence !== undefined || entry.sources !== undefined) {
        fail(`disclosure variable ${key} is undisclosed but carries a statement, evidence, or sources`);
      }
    } else {
      fail(`disclosure variable ${key} carries an unknown status: ${entry.status}`);
    }
  }
  if (canonical(record.variables) !== canonical(section.variables)) {
    fail("claim disclosure section is not the sealed record's projection");
  }
  return {
    recordSha256: section.recordSha256,
    recordPath,
    specification: section.specification,
    subjectSha256: section.subjectSha256,
    subjectKind: record.subject.kind,
    author: record.author,
    variables: Object.fromEntries(
      DISCLOSURE_VARIABLE_KEYS.map((key) => [key, record.variables[key]]),
    ),
  };
}

function extractQualified() {
  if (fixture) fail("--fixture is only valid for legacy test bundles");
  const disclosed = manifest.format === DISCLOSED_FORMAT;
  const claim = readJson("claim-package.json");
  const qualification = readJson("qualification.json");

  // Two carriages, exactly one of them. Sealed: the bundle binds the record in
  // its own manifest, and the reader runs one extra check for it. Supplied: the
  // record arrives beside the bundle and the bundle stays byte-for-byte the
  // artifact its run produced, which is the digest an auditor checks.
  const sealedPresentation = manifestPaths.has("presentation.json");
  if (sealedPresentation && presentationArg !== undefined) {
    fail(
      "bundle seals a presentation.json and --presentation was also supplied;"
      + " one report has one public reading record",
    );
  }
  if (!sealedPresentation && presentationArg === undefined) {
    fail(
      `${manifest.format} bundle seals no presentation.json and no --presentation <file> was`
      + " supplied. The site renders a report from a public reading record and never assembles"
      + " one here; pass the sealed record with --presentation, or ingest a bundle that binds it.",
    );
  }
  const presentationBytes = sealedPresentation
    ? readFileSync(join(bundleDir, "presentation.json"))
    : presentationInput;
  let presentation;
  try {
    presentation = JSON.parse(presentationBytes.toString("utf8"));
  } catch {
    fail("the public reading record is not valid JSON");
  }
  const presentationSha256 = sha256(presentationBytes);

  const expectedClaimSchema = disclosed ? DISCLOSED_CLAIM_SCHEMA : QUALIFIED_CLAIM_SCHEMA;
  if (claim.claimSchema !== expectedClaimSchema) {
    fail(`${manifest.format} requires ${expectedClaimSchema}, found ${claim.claimSchema}`);
  }
  if (qualification.claimSchema !== QUALIFICATION_CLAIM_SCHEMA) {
    fail(
      `qualification.json must declare ${QUALIFICATION_CLAIM_SCHEMA}, found ${qualification.claimSchema}`,
    );
  }

  const expectedChecks = disclosed ? DISCLOSED_CHECKS : ANCHORED_CHECKS;
  if (canonical(claim.verification?.checks) !== canonical(expectedChecks)) {
    fail(`claim verification checks are not the ${manifest.format} list, in order`);
  }

  // Every digest the claim names, checked against the bytes this bundle carries.
  const digestOf = (path) => sha256(readFileSync(join(bundleDir, ...path.split("/"))));
  const reportEnvelopeSha256 = digestOf("report-envelope.json");
  for (const [key, path] of [
    ["benchmarkSha256", "benchmark.json"],
    ["matrixSha256", "matrix.json"],
    ["reportSha256", "report.json"],
    ["runSha256", "run.json"],
    ["reportEnvelopeSha256", "report-envelope.json"],
  ]) {
    const actual = digestOf(path);
    if (claim.records?.[key] !== actual) {
      fail(`${path} does not match claim.records.${key}`);
    }
  }

  if (presentation.schema !== PRESENTATION_SCHEMA) {
    fail(`unknown public presentation schema: ${presentation.schema}`);
  }
  const sections = Object.keys(presentation).sort();
  if (canonical(sections) !== canonical([...PRESENTATION_SECTIONS].sort())) {
    fail("public presentation does not carry exactly the sections this site projects");
  }
  if (presentation.slug !== slug) {
    fail(`presentation slug ${presentation.slug} does not match requested slug ${slug}`);
  }
  if (presentation.verification?.bundleFormat !== manifest.format) {
    fail(`presentation names bundle format ${presentation.verification?.bundleFormat}, not ${manifest.format}`);
  }
  if (presentation.verification.readerAvailability !== "available") {
    fail("presentation does not identify the public reader as available");
  }
  if (presentation.verification.reportEnvelopeSha256 !== reportEnvelopeSha256) {
    fail("presentation report-envelope digest does not match report-envelope.json");
  }
  // The extra check is earned by SEALING the record, not by having one. A
  // bundle that carries no member is read with the format's own list.
  const expectedRecordChecks = sealedPresentation
    ? [...expectedChecks, PRESENTATION_CHECK]
    : expectedChecks;
  if (canonical(presentation.verification.checks) !== canonical(expectedRecordChecks)) {
    fail(
      `presentation verification checks are not the ${manifest.format} list`
      + `${sealedPresentation ? ` plus ${PRESENTATION_CHECK}` : ""}, in order`,
    );
  }
  if (typeof presentation.title !== "string" || presentation.title === "") {
    fail("public report title is missing");
  }
  if (/\b(demo[- ]?1|canary|rehearsal|fixture)\b/i.test(presentation.title)) {
    fail("public report title exposes an internal run label");
  }
  if (typeof presentation.summary !== "string" || presentation.summary === "") {
    fail("public report summary is missing");
  }
  if (typeof presentation.sealedAt !== "string" || presentation.sealedAt === "") {
    fail("public presentation carries no seal time");
  }
  if (!Array.isArray(presentation.limitations) || presentation.limitations.length === 0) {
    fail("public presentation carries no limitations");
  }
  if (typeof presentation.selfRunDisclosure !== "string" || presentation.selfRunDisclosure === "") {
    fail("public presentation carries no self-run disclosure");
  }
  for (const [key, path] of [
    ["runSha256", "run.json"],
    ["benchmarkSha256", "benchmark.json"],
    ["matrixSha256", "matrix.json"],
    ["reportSha256", "report.json"],
    ["reportEnvelopeSha256", "report-envelope.json"],
  ]) {
    if (presentation.provenance?.[key] !== digestOf(path)) {
      fail(`presentation provenance.${key} does not match ${path}`);
    }
  }

  // Anchors. Each carried proof is one `anchors/<sha256>.bin` member, and the
  // correspondence runs both ways so neither an unclaimed proof nor a claimed
  // one the bundle does not carry can pass.
  if (!Array.isArray(claim.anchors)) fail("claim package carries no anchors section");
  const anchorMembers = [...manifestPaths].filter((path) => path.startsWith("anchors/"));
  const claimedAnchors = new Set();
  for (const anchor of claim.anchors) {
    if (!SHA256_HEX.test(anchor?.recordSha256 ?? "")) fail("an anchor carries an invalid record digest");
    if (typeof anchor.subject !== "string" || anchor.subject === "") fail("an anchor names no subject");
    if (typeof anchor.provider !== "string" || anchor.provider === "") fail("an anchor names no provider");
    if (anchor.facts === null || typeof anchor.facts !== "object") fail("an anchor carries no facts");
    const path = `anchors/${anchor.recordSha256}.bin`;
    if (!manifestPaths.has(path)) fail(`claim names anchor ${anchor.recordSha256} but the bundle carries no ${path}`);
    if (claimedAnchors.has(path)) fail(`claim names anchor ${anchor.recordSha256} twice`);
    claimedAnchors.add(path);
  }
  for (const path of anchorMembers) {
    if (!claimedAnchors.has(path)) fail(`bundle carries ${path}, which the claim does not name`);
  }
  const presentedAnchors = presentation.provenance.anchors;
  if (!Array.isArray(presentedAnchors)) fail("presentation provenance carries no anchors list");
  const anchorIdentity = (list) => canonical(
    list
      .map(({ subject, provider, recordSha256 }) => ({ subject, provider, recordSha256 }))
      .sort((left, right) => left.recordSha256.localeCompare(right.recordSha256)),
  );
  if (anchorIdentity(presentedAnchors) !== anchorIdentity(claim.anchors)) {
    fail("presentation anchors do not match the claim's anchors");
  }

  if (disclosed && claim.disclosure === undefined) {
    fail(`${DISCLOSED_FORMAT} carries no disclosure section in its claim package`);
  }
  if (!disclosed && claim.disclosure !== undefined) {
    fail(`${QUALIFIED_FORMAT} must not carry a disclosure section; publish it as ${DISCLOSED_FORMAT}`);
  }
  const disclosure = disclosed ? readDisclosureRecord(claim.disclosure) : null;

  const countMembers = (prefix) => [...manifestPaths].filter((path) => path.startsWith(prefix)).length;
  // The fixed members, plus whichever optional ones this bundle carries, so a
  // sealed reading record is linked from the page like any other member.
  const canonicalFiles = files.filter((file) => file.path === "bundle.json"
    || QUALIFIED_FIXED_FILES.includes(file.path)
    || QUALIFIED_OPTIONAL_FILES.includes(file.path));

  return {
    format: manifest.format,
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
    anchors: claim.anchors,
    disclosure,
    digests: {
      bundleIdentity,
      reportEnvelopeSha256,
      benchmarkSha256: claim.records.benchmarkSha256,
      runSha256: claim.records.runSha256,
      matrixSha256: claim.records.matrixSha256,
      reportSha256: claim.records.reportSha256,
    },
    // How the public reading record reached this page. Stated because a record
    // supplied at ingest is not covered by the bundle's own digest, and a
    // reader is entitled to know which of the two they are looking at.
    presentationSource: {
      carriage: sealedPresentation ? "sealed-bundle-member" : "supplied-at-ingest",
      sha256: presentationSha256,
      path: sealedPresentation ? "presentation.json" : `${slug}.presentation.json`,
    },
    socialCardPath: "social-card.svg",
    // The complete manifest is `bundle.json`, served byte-exact under the
    // report. Listing every member here would put tens of thousands of rows in
    // the read model and on the page; the fixed members are what the page links.
    canonicalFiles,
    memberCounts: {
      total: files.length,
      records: countMembers("records/"),
      anchors: countMembers("anchors/"),
      native: countMembers("native/"),
    },
  };
}

const data = manifest.format === LEGACY_FORMAT
  ? extractLegacy()
  : isQualified
    ? extractQualified()
    : extractEvidenceNative();

for (const path of ["bundle.json", ...manifestPaths]) {
  const from = join(bundleDir, ...path.split("/"));
  const to = join(destDir, "bundle", ...path.split("/"));
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
}

mkdirSync(dirname(dataFile), { recursive: true });
writeFileSync(dataFile, `${JSON.stringify(data, null, 2)}\n`);
// A record supplied at ingest is published beside the read model, byte for
// byte as it was handed over, never inside the bundle directory.
if (data.presentationSource?.carriage === "supplied-at-ingest") {
  writeFileSync(join(root, "data", "reports", data.presentationSource.path), presentationInput);
}

console.log(`ingested ${relative(root, bundleDir) || bundleDir}`);
console.log(`  format:   ${manifest.format}`);
console.log(`  bundle:   public/reports/${slug}/bundle/ (${manifestPaths.size + 1} files, byte-exact)`);
console.log(`  data:     data/reports/${slug}.json`);
console.log(`  identity: ${bundleIdentity}`);
if (data.presentationSource !== undefined) {
  console.log(`  reading:  ${data.presentationSource.carriage} (sha256:${data.presentationSource.sha256})`);
}
if (data.fixture) console.log("  marked as FIXTURE");
