import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const siteRoot = fileURLToPath(new URL("../", import.meta.url));
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

const QUALIFIED_FORMAT = "benchmark-product-public-bundle/7";
const DISCLOSED_FORMAT = "benchmark-product-public-bundle/8";
const SIX_VARIABLE_SPECIFICATION = "https://spec.jinn.network/disclosure/six-variable/v1";
const DISCLOSURE_RECORD_KIND = "https://spec.jinn.network/records/disclosure-specification/v1";
const MATRIX_RECORD_KIND = "https://spec.jinn.network/records/benchmark-matrix/v1";
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
const PRESENTATION_CHECK = "report-presentation";

/** A site root carrying only the scripts, so an ingest writes nowhere real. */
function scratchSite(context) {
  const root = mkdtempSync(join(tmpdir(), "colophon-qualified-"));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  cpSync(join(siteRoot, "scripts"), join(root, "scripts"), { recursive: true });
  return root;
}

function run(root, script, args) {
  return spawnSync(process.execPath, [join(root, "scripts", script), ...args], { encoding: "utf8" });
}

function walk(directory, base = directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) return walk(absolute, base);
    return [relative(base, absolute).split(sep).join("/")];
  });
}

function write(directory, path, bytes) {
  const absolute = join(directory, ...path.split("/"));
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, bytes);
  return sha256(readFileSync(absolute));
}

function json(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function proportion(numerator, denominator, estimate, low, high) {
  return { numerator, denominator, estimate, wilsonInterval: { low, high } };
}

/**
 * A synthetic anchored binary-qualification bundle. Small, but shaped exactly
 * like the real thing everywhere the ingester looks: the v4 member list, one
 * OpenTimestamps anchor, evidence records, a sealed public reading record, and
 * on the disclosed closure a sealed six-variable declaration.
 */
export function makeQualifiedBundle(directory, options = {}) {
  const disclosed = options.disclosed === true;
  const slug = options.slug ?? "judge-report";
  mkdirSync(directory, { recursive: true });

  const filler = [
    ["static-bundle.json", json({ format: "jinn-benchmarking-static-bundle/1", reports: 1 })],
    ["verdicts.json", json({ verdicts: [] })],
    ["evidence.json", json({ records: [] })],
    ["verification/assembly.jsonl", '{"step":"manifest"}\n'],
    ["trust/public-keys.json", json({ keys: [] })],
    ["index.html", "<!doctype html><title>report</title>\n"],
    ["badge.svg", "<svg xmlns='http://www.w3.org/2000/svg'></svg>\n"],
    ["social-card.svg", "<svg xmlns='http://www.w3.org/2000/svg'></svg>\n"],
    ["README.md", "# Report\n"],
    ["share.txt", "report\n"],
  ];
  for (const [path, bytes] of filler) write(directory, path, bytes);

  const benchmarkSha256 = write(directory, "benchmark.json", json({ name: "Judge bench" }));
  const runSha256 = write(directory, "run.json", json({ venue: { kind: "self-run" }, replicates: 3 }));
  const matrixSha256 = write(directory, "matrix.json", json({ cells: 4320 }));
  const reportSha256 = write(directory, "report.json", json({ method: "binary-instrument" }));
  const reportEnvelopeSha256 = write(directory, "report-envelope.json", json({ payload: "…" }));
  write(directory, "qualification.json", json({
    claimSchema: options.qualificationClaimSchema ?? "benchmark-product.claim-package/2",
    configuration: { k: 3 },
  }));

  const instrumentBytes = json({ kind: "judge-instrument", arm: "audited" });
  const instrumentSha256 = write(directory, `records/${sha256(instrumentBytes)}.bin`, instrumentBytes);
  const itemBankBytes = json({ kind: "item-bank", items: 240 });
  const itemBankSha256 = write(directory, `records/${sha256(itemBankBytes)}.bin`, itemBankBytes);

  const anchorBytes = json({
    kind: "https://spec.jinn.network/records/anchor-evidence/v1",
    provider: "https://spec.jinn.network/trust/anchor-profiles/opentimestamps/v1",
    subject: { kind: "https://spec.jinn.network/records/benchmark-run/v1", digest: { sha256: runSha256 } },
  });
  const anchorSha256 = write(directory, `anchors/${sha256(anchorBytes)}.bin`, anchorBytes);
  const anchors = options.anchors ?? [{
    subject: "lock",
    kind: "https://spec.jinn.network/records/benchmark-run/v1",
    provider: "https://spec.jinn.network/trust/anchor-profiles/opentimestamps/v1",
    recordSha256: anchorSha256,
    facts: { pending: true },
  }];

  let disclosure;
  if (disclosed) {
    const variables = options.recordVariables ?? {
      "answer-model": { status: "undisclosed", reason: "not-stated" },
      "answer-prompt": { status: "undisclosed", reason: "not-stated" },
      "ingestion-model": {
        status: "disclosed-by-publisher",
        statement: "Fixed upstream and stated by the publisher of the answers we grade.",
        sources: [{ uri: "https://example.invalid/upstream" }],
      },
      "judge-model": {
        status: "measured-here",
        statement: "One dated snapshot, pinned at dispatch and recorded in the sealed run.",
        evidence: [{ role: "pinned-configuration", digest: { sha256: itemBankSha256 } }],
      },
      "judge-prompt": {
        status: "measured-here",
        statement: "Six judge instruments, each sealed and cited by digest.",
        evidence: [{ role: "pinned-configuration", digest: { sha256: instrumentSha256 } }],
      },
      "retrieval-config": { status: "undisclosed", reason: "outside-this-experiment" },
    };
    const recordBytes = json({
      kind: DISCLOSURE_RECORD_KIND,
      specification: SIX_VARIABLE_SPECIFICATION,
      author: "did:key:z6MkFixture",
      subject: { kind: MATRIX_RECORD_KIND, digest: { sha256: matrixSha256 } },
      variables,
    });
    const recordSha256 = write(directory, `records/${sha256(recordBytes)}.bin`, recordBytes);
    disclosure = {
      recordSha256,
      specification: SIX_VARIABLE_SPECIFICATION,
      subjectSha256: matrixSha256,
      variables: options.claimVariables ?? variables,
    };
  }

  const checks = options.checks ?? (disclosed ? DISCLOSED_CHECKS : ANCHORED_CHECKS);
  write(directory, "claim-package.json", json({
    claimSchema: options.claimSchema ?? (disclosed
      ? "benchmark-product.claim-package/6"
      : "benchmark-product.claim-package/5"),
    records: { benchmarkSha256, runSha256, matrixSha256, reportSha256, reportEnvelopeSha256 },
    method: { id: "jinn.benchmarking.method/binary-instrument", version: "1", parameters: {}, preregistered: true },
    // Three graded items, one of them unstable across replicates. The validator
    // recomputes the published figure from these rather than trusting it.
    qualification: {
      itemDecisions: [
        { taskDigest: "a".repeat(64), armId: "audited", unstable: false },
        { taskDigest: "a".repeat(64), armId: "mem0", unstable: true },
        { taskDigest: "b".repeat(64), armId: "audited", unstable: false },
        { taskDigest: "c".repeat(64), armId: "audited", unstable: false },
      ],
    },
    anchors,
    ...(options.claimDisclosure === null ? {} : { disclosure: options.claimDisclosure ?? disclosure }),
    verification: {
      checks,
      command: "npx @colophon-claims/verify@0.2.1 <bundle-dir>",
      compatibleCommand: "npx @colophon-claims/verify@0.2 <bundle-dir>",
      trustRoot: "Signatures verify against the bundle-carried public keys.",
    },
    limitations: ["This is a local, self-run venue."],
  }));

  const presentation = json({
      schema: options.presentationSchema ?? "colophon.report-presentation/2",
      slug,
      title: options.title ?? "Six judge prompts, one item set",
      summary: "Agreement against a screened truth set, held constant across six judge prompts.",
      sealedAt: "2026-08-29T16:30:51Z",
      subject: {
        judgeModel: "gpt-4o-mini-2024-07-18",
        harness: { id: "inspect-ai-judge", version: "1" },
        benchmark: { name: "Judge bench", description: "Long-conversation question answering.", sha256: benchmarkSha256 },
        arms: [
          { id: "audited", label: "Audited prompt", instrumentSha256: `sha256:${instrumentSha256}` },
          { id: "mem0", label: "Published prompt", instrumentSha256: `sha256:${itemBankSha256}` },
        ],
      },
      question: {
        designUrl: "https://example.invalid/design",
        postedOn: "2026-08-18",
        preRegistered: [
          { id: "q1", question: "Do judge prompts disagree?", answer: "Yes.", provenBy: "this-bundle" },
        ],
      },
      execution: {
        judgePrompts: { count: 2, provenance: "one audited, one published" },
        modelSnapshot: { id: "gpt-4o-mini-2024-07-18", temperature: "0.0", profile: "dated-snapshot-sampling" },
        replicates: 3,
        reduction: "strict-majority",
        abstainPolicy: { parserInvalid: "abstain", description: "Unparseable calls abstain." },
        intervals: "Wilson, alpha 0.05",
        truthAdmission: "screened-operator-sampled",
        venue: "self-run",
      },
      result: {
        primary: "Agreement ranged across the two prompts on the same items.",
        perArm: [
          {
            armId: "audited",
            agreement: proportion(197, 240, "0.8208", "0.7674", "0.8642"),
            acceptsSpecificWrong: proportion(43, 160, "0.2687", "0.2061", "0.3423"),
            acceptsVagueTopicalWrong: proportion(34, 80, "0.4250", "0.3213", "0.5350"),
            rejectsCorrect: proportion(0, 80, "0.0000", "0.0000", "0.0458"),
          },
          {
            armId: "mem0",
            agreement: proportion(211, 240, "0.8792", "0.8318", "0.9147"),
            acceptsSpecificWrong: proportion(9, 160, "0.0563", "0.0299", "0.1032"),
            acceptsVagueTopicalWrong: proportion(20, 80, "0.2500", "0.1680", "0.3549"),
            rejectsCorrect: proportion(0, 80, "0.0000", "0.0000", "0.0458"),
          },
        ],
        spread: { lowestArmId: "audited", highestArmId: "mem0", pointsBetween: "5.8" },
        interpretation: "The choice of judge prompt moves the score.",
        methodStatement: "Per-arm agreement against a screened truth set, three judge calls per cell.",
      },
      population: {
        items: 240,
        perCandidateClass: [{ candidateClass: "correct", items: 80 }],
        perStratum: [{ stratum: "category-1", items: 60 }],
        labels: "Screened by a pinned model, then hand-checked on the flagged set and a random sample.",
      },
      accounting: {
        cells: { expected: 1440, judged: 1440, lost: 0 },
        parserNeutral: { calls: 0, denominator: 1440, policy: "abstain", note: "No call failed to parse." },
        excludedItems: { count: 7, byArm: [{ armId: "mem0", items: 7 }] },
        completenessFloor: "0.995",
        runOutcome: "complete",
      },
      manipulationCheck: {
        replicateInstability: options.replicateInstability ?? { unstableItems: 1, gradedItems: 3 },
        conflictedCells: 0,
        companionChecks: [{ name: "corrupt-key", finding: "Verification refused.", provenBy: "companion-bundle" }],
      },
      limitations: ["This is a local, self-run venue."],
      selfRunDisclosure: "One operator designed, ran, graded, and sealed this comparison.",
      verification: {
        bundleFormat: options.presentationBundleFormat ?? (disclosed ? DISCLOSED_FORMAT : QUALIFIED_FORMAT),
        // The reading record's own list: the format's checks plus the one the
        // reader runs because this bundle carries a reading record.
        checks: options.presentationChecks
          ?? (options.suppliedPresentation === true ? checks : [...checks, PRESENTATION_CHECK]),
        command: "npx @colophon-claims/verify@0.2.1 <bundle-dir>",
        compatibleCommand: "npx @colophon-claims/verify@0.2 <bundle-dir>",
        readerAvailability: "available",
        reportEnvelopeSha256,
        reportSha256,
      },
      ...(options.narrative === undefined ? {} : { narrative: options.narrative }),
      provenance: {
        runSha256,
        benchmarkSha256,
        matrixSha256,
        reportSha256,
        reportEnvelopeSha256,
        anchors: anchors.map(({ subject, provider, recordSha256 }) => ({ subject, provider, recordSha256 })),
        siblingAnalyses: [
          { method: "jinn.benchmarking.method/pairwise-disagreement", version: "1", reportSha256: sha256("sibling") },
        ],
        companionBundles: [
          { name: "corrupt-key", runSha256: sha256("companion-run"), matrixSha256: sha256("companion-matrix"), bundleIdentity: sha256("companion") },
        ],
      },
  });
  if (options.omitPresentation !== true && options.suppliedPresentation !== true) {
    write(directory, "presentation.json", presentation);
  }
  if (options.suppliedPresentation === true) {
    writeFileSync(join(directory, "..", `${slug}.presentation.json`), presentation);
  }

  if (options.strayMember === true) write(directory, "notes/scratch.txt", "stray\n");

  const files = walk(directory)
    .filter((path) => path !== "bundle.json")
    .sort()
    .map((path) => {
      const bytes = readFileSync(join(directory, ...path.split("/")));
      return { path, bytes: bytes.length, sha256: sha256(bytes) };
    });
  writeFileSync(
    join(directory, "bundle.json"),
    json({ format: options.format ?? (disclosed ? DISCLOSED_FORMAT : QUALIFIED_FORMAT), files }),
  );
  return directory;
}

test("re-ingesting the published evidence-native report reproduces its read model byte for byte", (context) => {
  const root = scratchSite(context);
  const slug = "skill-vs-root-claude-md-haiku-4-5";
  const result = run(root, "ingest-report.mjs", [
    join(siteRoot, "public", "reports", slug, "bundle"),
    "--slug",
    slug,
  ]);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(
    readFileSync(join(root, "data", "reports", `${slug}.json`)),
    readFileSync(join(siteRoot, "data", "reports", `${slug}.json`)),
  );
});

test("ingests an anchored binary-qualification bundle and carries its anchors", (context) => {
  const root = scratchSite(context);
  const bundle = makeQualifiedBundle(join(root, "source-7"), { slug: "judge-7" });
  const result = run(root, "ingest-report.mjs", [bundle, "--slug", "judge-7"]);
  assert.equal(result.status, 0, result.stderr);

  const data = JSON.parse(readFileSync(join(root, "data", "reports", "judge-7.json"), "utf8"));
  assert.equal(data.format, QUALIFIED_FORMAT);
  assert.equal(data.disclosure, null);
  assert.equal(data.anchors.length, 1);
  assert.equal(data.anchors[0].facts.pending, true);
  assert.equal(data.socialCardPath, "social-card.svg");
  assert.equal(data.title, "Six judge prompts, one item set");
  // Seven for the closure, plus the check earned by carrying a reading record.
  assert.deepEqual(data.verification.checks, [...ANCHORED_CHECKS, PRESENTATION_CHECK]);
  assert.equal(data.memberCounts.anchors, 1);
  assert.equal(data.memberCounts.records, 2);
  // The complete manifest travels as bundle.json; the read model links the fixed members.
  assert.ok(data.canonicalFiles.length < data.memberCounts.total);
  assert.ok(data.canonicalFiles.some((file) => file.path === "presentation.json"));

  for (const path of walk(bundle)) {
    assert.deepEqual(
      readFileSync(join(root, "public", "reports", "judge-7", "bundle", ...path.split("/"))),
      readFileSync(join(bundle, ...path.split("/"))),
      `${path} was not copied byte for byte`,
    );
  }

  const validated = run(root, "validate-published-reports.mjs", []);
  assert.equal(validated.status, 0, validated.stderr);
});

test("ingests a disclosed bundle and projects the six variables from the sealed record", (context) => {
  const root = scratchSite(context);
  const bundle = makeQualifiedBundle(join(root, "source-8"), { slug: "judge-8", disclosed: true });
  const result = run(root, "ingest-report.mjs", [bundle, "--slug", "judge-8"]);
  assert.equal(result.status, 0, result.stderr);

  const data = JSON.parse(readFileSync(join(root, "data", "reports", "judge-8.json"), "utf8"));
  assert.equal(data.format, DISCLOSED_FORMAT);
  assert.deepEqual(data.verification.checks, [...DISCLOSED_CHECKS, PRESENTATION_CHECK]);
  assert.equal(data.disclosure.specification, SIX_VARIABLE_SPECIFICATION);
  assert.equal(data.disclosure.subjectSha256, sha256(readFileSync(join(bundle, "matrix.json"))));
  assert.deepEqual(Object.keys(data.disclosure.variables), [
    "ingestion-model",
    "retrieval-config",
    "answer-model",
    "answer-prompt",
    "judge-model",
    "judge-prompt",
  ]);
  assert.equal(data.disclosure.variables["judge-prompt"].status, "measured-here");
  assert.equal(data.disclosure.variables["ingestion-model"].status, "disclosed-by-publisher");
  assert.equal(data.disclosure.variables["answer-model"].status, "undisclosed");
  assert.equal(data.disclosure.variables["answer-model"].reason, "not-stated");
  assert.equal(data.disclosure.recordPath, `records/${data.disclosure.recordSha256}.bin`);

  const validated = run(root, "validate-published-reports.mjs", []);
  assert.equal(validated.status, 0, validated.stderr);
});

test("refuses an anchored bundle that carries no sealed public reading record", (context) => {
  const root = scratchSite(context);
  const bundle = makeQualifiedBundle(join(root, "source"), { slug: "no-presentation", omitPresentation: true });
  const result = run(root, "ingest-report.mjs", [bundle, "--slug", "no-presentation"]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /seals no presentation\.json and no --presentation/u);
  assert.match(result.stderr, /never assembles one here/u);
});

test("refuses a disclosure the sealed record does not make", (context) => {
  const root = scratchSite(context);
  const tampered = {
    "answer-model": {
      status: "disclosed-by-publisher",
      statement: "Restated in the claim but not in the sealed record.",
    },
    "answer-prompt": { status: "undisclosed", reason: "not-stated" },
    "ingestion-model": { status: "undisclosed", reason: "not-stated" },
    "judge-model": { status: "undisclosed", reason: "not-stated" },
    "judge-prompt": { status: "undisclosed", reason: "not-stated" },
    "retrieval-config": { status: "undisclosed", reason: "not-stated" },
  };
  const bundle = makeQualifiedBundle(join(root, "source"), {
    slug: "drifted",
    disclosed: true,
    claimVariables: tampered,
  });
  const result = run(root, "ingest-report.mjs", [bundle, "--slug", "drifted"]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /is not the sealed record's projection/u);
});

test("refuses a measured-here variable citing evidence the bundle does not carry", (context) => {
  const root = scratchSite(context);
  const absent = "b".repeat(64);
  const bundle = makeQualifiedBundle(join(root, "source"), {
    slug: "unbacked",
    disclosed: true,
    recordVariables: {
      "answer-model": { status: "undisclosed", reason: "not-stated" },
      "answer-prompt": { status: "undisclosed", reason: "not-stated" },
      "ingestion-model": { status: "undisclosed", reason: "not-stated" },
      "judge-model": { status: "undisclosed", reason: "not-stated" },
      "judge-prompt": {
        status: "measured-here",
        statement: "Cites a record this bundle never carried.",
        evidence: [{ role: "pinned-configuration", digest: { sha256: absent } }],
      },
      "retrieval-config": { status: "undisclosed", reason: "not-stated" },
    },
  });
  const result = run(root, "ingest-report.mjs", [bundle, "--slug", "unbacked"]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /which this bundle does not carry/u);
});

test("refuses an assertion that carries evidence, and a disclosure on the wrong closure", (context) => {
  const root = scratchSite(context);
  const asserting = makeQualifiedBundle(join(root, "asserting"), {
    slug: "asserting",
    disclosed: true,
    recordVariables: {
      "answer-model": { status: "undisclosed", reason: "not-stated" },
      "answer-prompt": { status: "undisclosed", reason: "not-stated" },
      "ingestion-model": {
        status: "disclosed-by-publisher",
        statement: "An assertion with a digest attached.",
        evidence: [{ role: "pinned-configuration", digest: { sha256: "c".repeat(64) } }],
      },
      "judge-model": { status: "undisclosed", reason: "not-stated" },
      "judge-prompt": { status: "undisclosed", reason: "not-stated" },
      "retrieval-config": { status: "undisclosed", reason: "not-stated" },
    },
  });
  const first = run(root, "ingest-report.mjs", [asserting, "--slug", "asserting"]);
  assert.equal(first.status, 1);
  assert.match(first.stderr, /is an assertion carrying evidence/u);

  const misplaced = makeQualifiedBundle(join(root, "misplaced"), {
    slug: "misplaced",
    disclosed: true,
    format: QUALIFIED_FORMAT,
    claimSchema: "benchmark-product.claim-package/5",
    checks: ANCHORED_CHECKS,
    presentationBundleFormat: QUALIFIED_FORMAT,
  });
  const second = run(root, "ingest-report.mjs", [misplaced, "--slug", "misplaced"]);
  assert.equal(second.status, 1);
  assert.match(second.stderr, /must not carry a disclosure section/u);
});

test("refuses a wrong claim id, a wrong check list, and a stray member", (context) => {
  const root = scratchSite(context);

  const wrongClaim = makeQualifiedBundle(join(root, "claim"), {
    slug: "claim",
    claimSchema: "benchmark-product.claim-package/4",
  });
  const claimResult = run(root, "ingest-report.mjs", [wrongClaim, "--slug", "claim"]);
  assert.equal(claimResult.status, 1);
  assert.match(claimResult.stderr, /requires benchmark-product\.claim-package\/5/u);

  const wrongQualification = makeQualifiedBundle(join(root, "qualification"), {
    slug: "qualification",
    qualificationClaimSchema: "benchmark-product.claim-package/5",
  });
  const qualificationResult = run(root, "ingest-report.mjs", [wrongQualification, "--slug", "qualification"]);
  assert.equal(qualificationResult.status, 1);
  assert.match(qualificationResult.stderr, /qualification\.json must declare/u);

  const wrongChecks = makeQualifiedBundle(join(root, "checks"), {
    slug: "checks",
    checks: ANCHORED_CHECKS.slice(0, 6),
  });
  const checksResult = run(root, "ingest-report.mjs", [wrongChecks, "--slug", "checks"]);
  assert.equal(checksResult.status, 1);
  assert.match(checksResult.stderr, /checks are not the benchmark-product-public-bundle\/7 list/u);

  // The reading record must own the extra check, not echo the claim's list.
  const echoedChecks = makeQualifiedBundle(join(root, "echoed"), {
    slug: "echoed",
    presentationChecks: ANCHORED_CHECKS,
  });
  const echoedResult = run(root, "ingest-report.mjs", [echoedChecks, "--slug", "echoed"]);
  assert.equal(echoedResult.status, 1);
  assert.match(echoedResult.stderr, /plus report-presentation, in order/u);

  const stray = makeQualifiedBundle(join(root, "stray"), { slug: "stray", strayMember: true });
  const strayResult = run(root, "ingest-report.mjs", [stray, "--slug", "stray"]);
  assert.equal(strayResult.status, 1);
  assert.match(strayResult.stderr, /member outside benchmark-product-public-bundle\/7/u);
});

test("refuses an unclaimed anchor proof and an anchor the bundle does not carry", (context) => {
  const root = scratchSite(context);

  const unclaimed = makeQualifiedBundle(join(root, "unclaimed"), { slug: "unclaimed", anchors: [] });
  const unclaimedResult = run(root, "ingest-report.mjs", [unclaimed, "--slug", "unclaimed"]);
  assert.equal(unclaimedResult.status, 1);
  assert.match(unclaimedResult.stderr, /which the claim does not name/u);

  const missing = makeQualifiedBundle(join(root, "missing"), {
    slug: "missing",
    anchors: [{
      subject: "matrix",
      kind: "https://spec.jinn.network/records/benchmark-matrix/v1",
      provider: "https://spec.jinn.network/trust/anchor-profiles/opentimestamps/v1",
      recordSha256: "d".repeat(64),
      facts: { pending: true },
    }],
  });
  const missingResult = run(root, "ingest-report.mjs", [missing, "--slug", "missing"]);
  assert.equal(missingResult.status, 1);
  assert.match(missingResult.stderr, /but the bundle carries no anchors\//u);
});

test("refuses a presentation whose sections this site does not project", (context) => {
  const root = scratchSite(context);
  const bundle = makeQualifiedBundle(join(root, "source"), { slug: "extra" });
  const presentationPath = join(bundle, "presentation.json");
  const presentation = JSON.parse(readFileSync(presentationPath, "utf8"));
  presentation.practiceGuidance = { blocks: [] };
  writeFileSync(presentationPath, json(presentation));
  const manifest = JSON.parse(readFileSync(join(bundle, "bundle.json"), "utf8"));
  for (const entry of manifest.files) {
    if (entry.path !== "presentation.json") continue;
    const bytes = readFileSync(presentationPath);
    entry.bytes = bytes.length;
    entry.sha256 = sha256(bytes);
  }
  writeFileSync(join(bundle, "bundle.json"), json(manifest));

  const result = run(root, "ingest-report.mjs", [bundle, "--slug", "extra"]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /carries a section this site does not project: practiceGuidance/u);
});

test("takes a reading record supplied at ingest and leaves the bundle untouched", (context) => {
  const root = scratchSite(context);
  const bundle = makeQualifiedBundle(join(root, "supplied", "bundle"), {
    slug: "supplied",
    suppliedPresentation: true,
  });
  const record = join(root, "supplied", "supplied.presentation.json");
  const result = run(root, "ingest-report.mjs", [bundle, "--slug", "supplied", "--presentation", record]);
  assert.equal(result.status, 0, result.stderr);

  const data = JSON.parse(readFileSync(join(root, "data", "reports", "supplied.json"), "utf8"));
  assert.equal(data.presentationSource.carriage, "supplied-at-ingest");
  assert.equal(data.presentationSource.sha256, sha256(readFileSync(record)));
  // Read with the format's own list: the extra check is earned by sealing.
  assert.deepEqual(data.verification.checks, ANCHORED_CHECKS);

  // The record is published beside the read model, never inside the bundle.
  const copied = join(root, "public", "reports", "supplied", "bundle");
  assert.ok(!walk(copied).includes("presentation.json"));
  assert.deepEqual(
    readFileSync(join(root, "data", "reports", "supplied.presentation.json")),
    readFileSync(record),
  );

  const validated = run(root, "validate-published-reports.mjs", []);
  assert.equal(validated.status, 0, validated.stderr);
});

test("refuses a report carrying both a sealed and a supplied reading record", (context) => {
  const root = scratchSite(context);
  const bundle = makeQualifiedBundle(join(root, "both", "bundle"), { slug: "both" });
  const record = join(root, "both", "bundle", "presentation.json");
  const result = run(root, "ingest-report.mjs", [bundle, "--slug", "both", "--presentation", record]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /one report has one public reading record/u);
});

test("recomputes the published replicate-instability figure rather than trusting it", (context) => {
  const root = scratchSite(context);
  const bundle = makeQualifiedBundle(join(root, "drifted"), {
    slug: "drifted",
    replicateInstability: { unstableItems: 0, gradedItems: 3 },
  });
  assert.equal(run(root, "ingest-report.mjs", [bundle, "--slug", "drifted"]).status, 0);
  const validated = run(root, "validate-published-reports.mjs", []);
  assert.equal(validated.status, 1);
  assert.match(validated.stderr, /replicate instability says 0\/3, recomputed 1\/3/u);
});

test("carries the report's own prose and refuses a block the page cannot render", (context) => {
  const root = scratchSite(context);
  const narrative = [{
    slot: "why-this-matters",
    heading: "Why this matters",
    blocks: [
      { kind: "heading", text: "Graders differ" },
      { kind: "paragraph", text: "Changing only the grader moved agreement.", strong: true },
      { kind: "list", ordered: true, items: ["Ask for the judge prompt."] },
      { kind: "table", columns: ["Variable", "Meaning"], rows: [["Judge model", "What grades the answer"]] },
    ],
  }];
  const good = makeQualifiedBundle(join(root, "prose"), { slug: "prose", narrative });
  assert.equal(run(root, "ingest-report.mjs", [good, "--slug", "prose"]).status, 0);
  const data = JSON.parse(readFileSync(join(root, "data", "reports", "prose.json"), "utf8"));
  assert.deepEqual(data.narrative, narrative);

  const broken = makeQualifiedBundle(join(root, "broken"), {
    slug: "broken",
    narrative: [{ slot: "why", heading: null, blocks: [{ kind: "diagram", src: "x.svg" }] }],
  });
  const result = run(root, "ingest-report.mjs", [broken, "--slug", "broken"]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /unknown block kind: diagram/u);

  const unorderedFlag = makeQualifiedBundle(join(root, "unordered-flag"), {
    slug: "unordered-flag",
    narrative: [{
      slot: "why",
      heading: null,
      blocks: [{ kind: "list", ordered: "yes", items: ["Ask for the judge prompt."] }],
    }],
  });
  const unorderedFlagResult = run(root, "ingest-report.mjs", [unorderedFlag, "--slug", "unordered-flag"]);
  assert.equal(unorderedFlagResult.status, 1);
  assert.match(unorderedFlagResult.stderr, /invalid ordered-list flag/u);

  const ragged = makeQualifiedBundle(join(root, "ragged"), {
    slug: "ragged",
    narrative: [{
      slot: "why",
      heading: null,
      blocks: [{ kind: "table", columns: ["A", "B"], rows: [["only one cell"]] }],
    }],
  });
  const raggedResult = run(root, "ingest-report.mjs", [ragged, "--slug", "ragged"]);
  assert.equal(raggedResult.status, 1);
  assert.match(raggedResult.stderr, /table row of the wrong width/u);
});
