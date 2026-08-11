#!/usr/bin/env node
/**
 * Regenerates fixtures/sample-bundle, the ONE dev fixture bundle this repo
 * ships so the report route renders end to end before any real bundle exists.
 *
 * Every value in it is synthetic. The bundle says so on its face: the title,
 * the bundle README, share.txt, the badge, and the social card all carry the
 * word "fixture", and the signatures are placeholder strings that no verifier
 * would accept. The FILE LAYOUT follows the frozen public bundle format
 * `benchmark-product-public-bundle/1` (see PUBLIC-BUNDLE.md in the Jinn mono):
 * the 16 fixed members, one records/<sha256>.bin per evidence record, and a
 * bundle.json manifest binding every member's path, byte length, and SHA-256.
 *
 * Deterministic: fixed content, no clocks, so regeneration is byte-stable.
 */
import { createHash } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const bundleDir = join(root, "fixtures", "sample-bundle");

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const jsonBytes = (value) => Buffer.from(JSON.stringify(value, null, 2) + "\n", "utf8");

rmSync(bundleDir, { recursive: true, force: true });
mkdirSync(join(bundleDir, "records"), { recursive: true });
mkdirSync(join(bundleDir, "verification"), { recursive: true });
mkdirSync(join(bundleDir, "trust"), { recursive: true });

/** path -> bytes, in insertion order; bundle.json is derived from this map. */
const files = new Map();
const put = (path, bytes) => {
  files.set(path, bytes);
  return sha256(bytes);
};

// --- evidence records (synthetic, addressed by their real content digest) ---
const recordDigests = [];
const putRecord = (roles, body) => {
  const bytes = jsonBytes({
    fixture: true,
    note: "FIXTURE record: synthetic bytes for the sample bundle; not produced by any run",
    roles,
    ...body,
  });
  const digest = sha256(bytes);
  files.set(`records/${digest}.bin`, bytes);
  recordDigests.push({ digest, roles });
  return digest;
};

const taskDigests = [];
for (let i = 1; i <= 3; i += 1) {
  taskDigests.push(
    putRecord(["task"], {
      taskId: `fixture-task-${String(i).padStart(2, "0")}`,
      description: `Sample task ${i} of 40. Only 3 of the 40 task records are materialized in this fixture to keep it small; a real bundle carries one record per task.`,
    }),
  );
}
const evalSpecDigest = putRecord(["evaluation-spec"], {
  specId: "fixture-eval-spec",
  rule: "containerized test harness, pass/fail",
});
const deliveryDigest = putRecord(["solve-delivery"], {
  cellKey: "skill/fixture-task-01/r1",
  outcome: "pass",
});
const verdictRecordDigest = putRecord(["verdict"], {
  cellKey: "skill/fixture-task-01/r1",
  verdict: "met",
  evaluator: "fixture-evaluator-1",
});

// --- core records, digest-chained like the real emitter ---
const benchmarkSha256 = put(
  "benchmark.json",
  jsonBytes({
    fixture: true,
    schema: "benchmarking-records.benchmark/1",
    name: "sample-guidance-40 (fixture task set)",
    taskCount: 40,
    items: taskDigests.map((digest, i) => ({
      taskId: `fixture-task-${String(i + 1).padStart(2, "0")}`,
      task: { digest: { sha256: digest } },
    })),
    note: "FIXTURE: 40 tasks are declared; 3 synthetic task records are materialized.",
  }),
);

const lockedAt = "2026-08-09T14:20:11Z";
const runSha256 = put(
  "run.json",
  jsonBytes({
    fixture: true,
    schema: "benchmarking-records.run/1",
    draftId: "fixture-demo-1",
    benchmarkSha256,
    lockedAt,
    arms: ["skill", "agents-md", "no-guidance"],
    replicates: 5,
    policy: {
      independence: "disclosed",
      minVerdicts: 1,
      distinctEvaluator: false,
    },
    analysisPlan: [{ method: "wilson@1", parameters: { verdictRule: "sole", confidence: 0.95 } }],
  }),
);

const accounting = {
  expected: 600,
  judged: 587,
  excluded: {
    "task-failure": 0,
    "infrastructure-failure": 0,
    unscorable: 9,
    expired: 4,
    missing: 0,
    conflicted: 0,
    "cancellation-drained": 0,
  },
};

const matrixSha256 = put(
  "matrix.json",
  jsonBytes({
    fixture: true,
    schema: "benchmarking-records.matrix/1",
    runSha256,
    expectedCells: 600,
    judgedCells: 587,
    partition: accounting,
    cells: [
      {
        cellKey: "skill/fixture-task-01/r1",
        outcome: "met",
        delivery: deliveryDigest,
        verdicts: [verdictRecordDigest],
        note: "FIXTURE: one illustrative cell; a real Matrix carries all 600.",
      },
    ],
  }),
);

const headline = {
  skill: { n: 196, pass: 74, passRate: "0.378", wilsonInterval: { low: "0.312", high: "0.448" } },
  "agents-md": { n: 195, pass: 74, passRate: "0.379", wilsonInterval: { low: "0.313", high: "0.450" } },
  "no-guidance": { n: 196, pass: 62, passRate: "0.316", wilsonInterval: { low: "0.253", high: "0.385" } },
};

const reportedAt = "2026-08-10T21:05:37Z";
const reportSha256 = put(
  "report.json",
  jsonBytes({
    fixture: true,
    schema: "benchmarking-records.report/1",
    matrixSha256,
    title: "Fixture: skills vs AGENTS.md on identical guidance (synthetic sample data)",
    summary:
      "FIXTURE DATA. Packaging identical guidance as a skill versus a flat AGENTS.md file showed no detectable difference on this synthetic sample (delta -0.1 points, 95% CI -9.7 to +9.5). Both guided arms passed about 6 points more of the 587 judged executions than the no-guidance arm. Every number on this page is invented to exercise the report template.",
    reportedAt,
    method: { id: "wilson", version: "1", parameters: { confidence: 0.95, verdictRule: "sole" }, preregistered: true },
    results: {
      perSubject: [
        {
          results: {
            arms: headline,
            conflicted: { count: 0, cellKeys: [] },
          },
        },
      ],
    },
  }),
);

const reportEnvelopeSha256 = put(
  "report-envelope.json",
  jsonBytes({
    fixture: true,
    payloadType: "application/vnd.benchmarking-report+json",
    payloadSha256: reportSha256,
    signatures: [{ keyid: "fixture-report-key", sig: "FIXTURE-SIGNATURE-NOT-VERIFIABLE" }],
  }),
);

// --- claim package (shape mirrors benchmark-product.claim-package/1) ---
const verificationCommand = "colophon bundle verify --bundle <bundle-dir> --json";
const limitations = [
  "FIXTURE: every number in this bundle is synthetic sample data; nothing was run.",
  "This is a self-run venue: the same operator controls task dispatch, execution, and evaluation. Locking the method is a discipline, not a proof against the run owner.",
  "The minimum detectable effect declared before the run is 4 points; a smaller real difference would look exactly like this null.",
  "One agent, one model, one instruction set: the measurement covers this content on these tasks, not skills in general.",
  "Task contamination cannot be ruled out: tasks postdate the model's stated training cutoff per repo history, but semantic overlap with public code is possible.",
  "3 disclosed preview runs preceded the lock; none entered official results.",
  "Cost figures are self-reported from this venue's own resource observations; nothing settled them.",
];

const claimSha256 = put(
  "claim-package.json",
  jsonBytes({
    claimSchema: "benchmark-product.claim-package/1",
    fixture: true,
    scope: {
      draftId: "fixture-demo-1",
      benchmarkSha256,
      taskCount: 40,
      arms: [
        { armId: "skill", pinning: { harness: { id: "fixture-harness", version: "2.0.0" }, loadout: { id: "guidance-as-skill" } } },
        { armId: "agents-md", pinning: { harness: { id: "fixture-harness", version: "2.0.0" }, loadout: { id: "guidance-as-agents-md" } } },
        { armId: "no-guidance", pinning: { harness: { id: "fixture-harness", version: "2.0.0" }, loadout: { id: "none" } } },
      ],
      replicates: 5,
      venue: "self-run",
    },
    records: { benchmarkSha256, runSha256, matrixSha256, reportSha256, reportEnvelopeSha256 },
    method: { id: "wilson", version: "1", parameters: { confidence: 0.95, verdictRule: "sole" }, preregistered: true },
    results: { note: "see report.json results.perSubject" },
    headline,
    completeness: { expected: accounting.expected, judged: accounting.judged },
    attrition: accounting.excluded,
    conflicted: { count: 0, cellKeys: [] },
    assurance: {
      preset: "deterministic-tests",
      resolved: { independence: "disclosed", minVerdicts: 1, distinctEvaluator: false, verdictRule: "sole" },
      disclosure:
        "Distinct evaluator identities are workspace-minted keys; they prove agent-distinctness, not party-independence, on this self-run venue.",
    },
    disclosures: {
      perSubject: [
        {
          integrityTiers: { "re-derivable": 587, "attested-only": 0 },
          pinning: { harness: { unverifiable: 0 }, model: { unverifiable: 0 }, loadout: { unverifiable: 0 }, isolation: { unverifiable: 600 } },
        },
      ],
      integrityTierCounts: { "re-derivable": 587, "attested-only": 0 },
      pinningUnverifiableCounts: { harness: 0, model: 0, loadout: 0, isolation: 600 },
    },
    limitations,
    venueHonesty: {
      venue: "self-run",
      note: "Local execution provides reproducibility and preregistration discipline, not proof of owner honesty.",
    },
    verification: {
      command: verificationCommand,
      checks: ["manifest", "evidence-closure", "trust", "matrix-rederivation", "report-verification", "claim-consistency"],
      trustRoot:
        "Signatures verify against the bundle-carried public keys minted by this workspace; there is no third-party trust anchor on the self-run venue.",
    },
    rehearsal: {
      previewCount: 3,
      timestamps: ["2026-08-05T09:12:00Z", "2026-08-06T10:03:00Z", "2026-08-07T16:41:00Z"],
    },
  }),
);

// --- remaining fixed members ---
put(
  "static-bundle.json",
  jsonBytes({
    fixture: true,
    schema: "benchmarking-interop.static-bundle/1",
    matrixSha256,
    reportSha256s: [reportSha256],
  }),
);

put(
  "verdicts.json",
  jsonBytes({
    fixture: true,
    schema: "benchmark-product.bundle-verdicts/1",
    verdicts: [
      {
        cellKey: "skill/fixture-task-01/r1",
        verdict: "met",
        evaluator: "fixture-evaluator-1",
        recordSha256: verdictRecordDigest,
        note: "FIXTURE: one illustrative verdict; a real catalog carries all 587.",
      },
    ],
  }),
);

put(
  "evidence.json",
  jsonBytes({
    fixture: true,
    schema: "benchmark-product.bundle-evidence/1",
    records: recordDigests.map(({ digest, roles }) => ({ sha256: digest, roles })),
  }),
);

put(
  "verification/assembly.jsonl",
  Buffer.from(
    [
      JSON.stringify({ fixture: true, kind: "header", schema: "benchmark-product.bundle-assembly/1", runSha256, expectedCells: 600 }),
      JSON.stringify({ fixture: true, kind: "cell", cellKey: "skill/fixture-task-01/r1", outcome: "met", deliverySha256: deliveryDigest, verdictSha256s: [verdictRecordDigest] }),
    ].join("\n") + "\n",
    "utf8",
  ),
);

put(
  "trust/public-keys.json",
  jsonBytes({
    fixture: true,
    schema: "benchmark-product.bundle-trust/1",
    evaluators: [
      {
        evaluatorId: "fixture-evaluator-1",
        publicKeyPem: "-----BEGIN PUBLIC KEY-----\nFIXTURE-NOT-A-REAL-KEY\n-----END PUBLIC KEY-----\n",
      },
    ],
    reportKey: {
      keyid: "fixture-report-key",
      publicKeyPem: "-----BEGIN PUBLIC KEY-----\nFIXTURE-NOT-A-REAL-KEY\n-----END PUBLIC KEY-----\n",
    },
  }),
);

put(
  "index.html",
  Buffer.from(
    `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Fixture: skills vs AGENTS.md on identical guidance (synthetic sample data)</title>
<style>
body{font-family:Georgia,serif;max-width:66ch;margin:2rem auto;padding:0 1rem;color:#14120e;background:#f7f4ed;line-height:1.6}
code{font-family:Menlo,monospace;font-size:.9em}
.fixture{border:2px solid #a9741a;background:#f2e6cc;padding:.75rem 1rem;font-family:Helvetica,sans-serif;font-size:.85rem}
table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #c6bfb4;padding:.4rem .6rem;text-align:left}
</style>
</head>
<body>
<p class="fixture">FIXTURE. Every number in this bundle is synthetic sample data. Nothing was run. This member exists so the bundle conforms to benchmark-product-public-bundle/1; it is not evidence of anything.</p>
<h1>Fixture: skills vs AGENTS.md on identical guidance (synthetic sample data)</h1>
<p>Method locked ${lockedAt}. Report digest <code>sha256:${reportSha256}</code>.</p>
<table>
<tr><th>Arm</th><th>Judged</th><th>Pass rate</th><th>95% interval</th></tr>
<tr><td>skill</td><td>196 of 200 expected</td><td>37.8% (74 of 196)</td><td>31.2% to 44.8%</td></tr>
<tr><td>agents-md</td><td>195 of 200 expected</td><td>37.9% (74 of 195)</td><td>31.3% to 45.0%</td></tr>
<tr><td>no-guidance</td><td>196 of 200 expected</td><td>31.6% (62 of 196)</td><td>25.3% to 38.5%</td></tr>
</table>
<p>600 expected executions: 587 judged, 9 unscorable, 4 expired, 0 silently dropped. No comparative winner is stated.</p>
</body>
</html>
`,
    "utf8",
  ),
);

put(
  "badge.svg",
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="340" height="24" role="img" aria-label="FIXTURE colophon: no detectable difference, 40 tasks, no winner stated. Report sha256:${reportSha256}. Arms: skill, agents-md, no-guidance.">
<rect width="90" height="24" fill="#14120e"/><rect x="90" width="250" height="24" fill="#fffdf8" stroke="#c6bfb4"/>
<text x="8" y="16" font-family="Menlo,monospace" font-size="11" fill="#f4f1e9">FIXTURE</text>
<text x="98" y="16" font-family="Menlo,monospace" font-size="11" fill="#14120e">no detectable difference &#183; 40 tasks &#183; no winner</text>
</svg>
`,
    "utf8",
  ),
);

put(
  "social-card.svg",
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="FIXTURE Colophon report card, synthetic sample data, no comparative winner stated. Report sha256:${reportSha256}. Arms: skill, agents-md, no-guidance.">
<rect width="1200" height="630" fill="#f7f4ed"/>
<rect x="0" y="0" width="1200" height="8" fill="#c7402a"/>
<text x="72" y="96" font-family="Helvetica,sans-serif" font-size="26" letter-spacing="4" fill="#a9741a">FIXTURE &#183; SYNTHETIC SAMPLE DATA</text>
<text x="72" y="200" font-family="Georgia,serif" font-size="54" fill="#14120e">Skills vs AGENTS.md on identical guidance</text>
<text x="72" y="280" font-family="Georgia,serif" font-size="34" fill="#5c554c">No detectable difference between containers.</text>
<text x="72" y="330" font-family="Georgia,serif" font-size="34" fill="#5c554c">No comparative winner is stated.</text>
<text x="72" y="430" font-family="Menlo,monospace" font-size="24" fill="#5c554c">arms: skill &#183; agents-md &#183; no-guidance</text>
<text x="72" y="470" font-family="Menlo,monospace" font-size="24" fill="#5c554c">587 of 600 expected executions judged</text>
<text x="72" y="560" font-family="Menlo,monospace" font-size="20" fill="#7c746a">report sha256:${reportSha256.slice(0, 24)}&#8230;</text>
</svg>
`,
    "utf8",
  ),
);

put(
  "README.md",
  Buffer.from(
    `# FIXTURE public bundle

Every number in this bundle is synthetic sample data. Nothing was run, no
signature verifies, and no claim in it is about the world. It exists so the
colophon.claims site can build and render its report route before the first
real bundle is published, and so the ingest pipeline has a conforming input
to validate against.

Layout follows benchmark-product-public-bundle/1: the 16 fixed members, one
records/<sha256>.bin per evidence record, and bundle.json binding every
member's path, byte length, and SHA-256. Deviations from a real bundle, on
purpose: only 3 of the declared 40 task records are materialized, only one
cell's delivery and verdict records are present, and the DSSE signatures are
placeholder strings.

Regenerate with: node scripts/make-fixture.mjs
`,
    "utf8",
  ),
);

put(
  "share.txt",
  Buffer.from(
    `FIXTURE (synthetic sample data): skills vs AGENTS.md on identical guidance. No detectable difference between containers on 587 of 600 expected executions judged; no comparative winner is stated. Report sha256:${reportSha256}. Nothing was run; this bundle exercises the report pipeline.
`,
    "utf8",
  ),
);

// --- manifest: every member except bundle.json itself, canonical order ---
const manifest = {
  format: "benchmark-product-public-bundle/1",
  fixture: true,
  files: [...files.entries()]
    .map(([path, bytes]) => ({ path, bytes: bytes.length, sha256: sha256(bytes) }))
    .sort((a, b) => (a.path < b.path ? -1 : 1)),
};
const manifestBytes = jsonBytes(manifest);
files.set("bundle.json", manifestBytes);

for (const [path, bytes] of files) {
  mkdirSync(join(bundleDir, dirname(path)), { recursive: true });
  writeFileSync(join(bundleDir, path), bytes);
}

console.log(`fixture bundle written to ${bundleDir}`);
console.log(`members: ${files.size} (incl. bundle.json)`);
console.log(`bundle identity (sha256 of bundle.json): ${sha256(manifestBytes)}`);
