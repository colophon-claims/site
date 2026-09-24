import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

/**
 * The boards index and the judge report's board print facts from the read
 * model and from the sealed bundle. The first group of tests pins every figure
 * the board prints to the sealed bytes it comes from, recomputing the counts
 * from the signed report and the call trace rather than trusting the read
 * model. The second group reads the exported pages, and runs only after
 * `npm run build` has written out/: the static HTML is the page with no
 * script, so the default order, every written count and the header links are
 * checked there.
 */
const siteRoot = fileURLToPath(new URL("../", import.meta.url));
const slug = "locomo-judge-report";
const boardSlug = "locomo-judge-report-frozen-bank";
const bundleDir = join(siteRoot, "public", "reports", slug, "bundle");
const report = JSON.parse(readFileSync(join(siteRoot, "data", "reports", `${slug}.json`), "utf8"));
const member = (path) => readFileSync(join(bundleDir, ...path.split("/")));
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const percent = (rate) => `${(Number(rate) * 100).toFixed(1)}%`;

const RECORD_ORDER = ["audited", "backboard", "mem0", "mem0-evidence", "revised", "strict-dial"];
const COUNTS = {
  audited: [197, 240],
  backboard: [164, 240],
  mem0: [188, 240],
  "mem0-evidence": [163, 233],
  revised: [146, 240],
  "strict-dial": [211, 240],
};

const manifest = JSON.parse(member("bundle.json").toString("utf8"));
const listed = new Map(manifest.files.map((file) => [file.path, file.sha256]));

function sealedJson(path) {
  const bytes = member(path);
  assert.equal(sha256(bytes), listed.get(path), `${path} hashes to its file-list entry`);
  return JSON.parse(bytes.toString("utf8"));
}

test("the board is keyed on the locked method's digest, and its address comes from the method's sealed name", () => {
  assert.equal(sha256(member("bundle.json")), report.digests.bundleIdentity);
  assert.equal(sha256(member("benchmark.json")), report.digests.benchmarkSha256);
  assert.equal(report.digests.benchmarkSha256, "9ae50617f9112b750518c04309b96648207f6d0e17ba044a077d0d5185b84c9e");
  assert.notEqual(report.digests.runSha256, report.digests.benchmarkSha256);
  const method = JSON.parse(member("benchmark.json").toString("utf8"));
  assert.equal(method.name, "LoCoMo judge report frozen bank");
  assert.equal(method.version, "1.0.0");
  assert.equal(method.items.length, 240);
  const derived = method.name.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-+|-+$/gu, "");
  assert.equal(derived, boardSlug);
});

test("the claimant is the signing key that both owns the run and wrote the method", () => {
  const run = JSON.parse(member("run.json").toString("utf8"));
  const method = JSON.parse(member("benchmark.json").toString("utf8"));
  assert.equal(run.owner, "did:key:z6Mkmz8SWiUshwDMszSqwzMngt7ScNmsEj7vZoFRLjpcZTm9");
  assert.equal(method.author, run.owner);
  assert.equal(run.venue.kind, "self-run");
  assert.equal(report.execution.venue, "self-run");
  assert.equal(report.reportedAt, "2026-08-29T16:30:51Z");
  assert.equal(new Date(run.closeAt).toISOString().slice(0, 19), report.reportedAt.slice(0, 19));
});

test("the six rows are the record's arms, in its order, each pinned to the judge model and harness it names", () => {
  const run = JSON.parse(member("run.json").toString("utf8"));
  assert.deepEqual(report.subject.arms.map((arm) => arm.id), RECORD_ORDER);
  assert.deepEqual(run.arms.map((arm) => arm.armId), RECORD_ORDER);
  assert.equal(report.subject.judgeModel, "gpt-4o-mini-2024-07-18");
  assert.deepEqual(report.subject.harness, { id: "inspect-ai-judge", version: "1" });
  for (const [index, arm] of run.arms.entries()) {
    assert.equal(arm.pinning.model.id, report.subject.judgeModel);
    assert.deepEqual(arm.pinning.harness, report.subject.harness);
    const instrument = Object.entries(arm.pinning).find(([name]) => name.endsWith(".instrument"))[1];
    assert.equal(instrument, report.subject.arms[index].instrumentSha256);
  }
});

test("each row's count, denominator and rate is the record's own", () => {
  for (const arm of report.result.perArm) {
    const [passed, scored] = COUNTS[arm.armId];
    assert.equal(arm.agreement.numerator, passed, arm.armId);
    assert.equal(arm.agreement.denominator, scored, arm.armId);
    assert.equal(percent(arm.agreement.estimate), `${((passed / scored) * 100).toFixed(1)}%`, arm.armId);
  }
  const rates = report.result.perArm.map((arm) => percent(arm.agreement.estimate));
  assert.deepEqual(rates, ["82.1%", "68.3%", "78.3%", "70.0%", "60.8%", "87.9%"]);
  assert.deepEqual(report.accounting.excludedItems, { count: 7, byArm: [{ armId: "mem0-evidence", items: 7 }] });
});

test("the counts recompute from the signed report's item decisions, and the exclusions carry their reason", () => {
  assert.equal(sha256(member("report.json")), report.digests.reportSha256);
  const signed = sealedJson("report.json");
  const [subject] = signed.results.perSubject;
  assert.equal(subject.subjectSha256, report.digests.matrixSha256);
  const tally = Object.fromEntries(RECORD_ORDER.map((arm) => [arm, { agreed: 0, notAgreed: 0, excluded: 0 }]));
  for (const item of subject.results.itemDecisions) {
    const agreed = (item.decision === "ACCEPT") === (item.context.truthLabel === "CORRECT");
    tally[item.armId][agreed ? "agreed" : "notAgreed"] += 1;
  }
  for (const item of subject.results.excluded.items) {
    tally[item.armId].excluded += 1;
    assert.deepEqual(item.reasons.map((reason) => reason.reason), ["no-valid-majority"]);
  }
  for (const arm of RECORD_ORDER) {
    const [passed, scored] = COUNTS[arm];
    assert.deepEqual(tally[arm], { agreed: passed, notAgreed: scored - passed, excluded: 240 - scored }, arm);
  }
  assert.deepEqual(tally["mem0-evidence"], { agreed: 163, notAgreed: 70, excluded: 7 });
});

test("every planned call is judged in the result matrix and traced to a native log the bundle seals", () => {
  assert.equal(sha256(member("matrix.json")), report.digests.matrixSha256);
  const matrix = sealedJson("matrix.json");
  assert.equal(matrix.cells.length, 4320);
  assert.ok(matrix.cells.every((call) => call.outcome === "judged"));
  const solveOutputs = new Set(
    sealedJson("evidence.json").records.filter((record) => record.roles.includes("solve-output")).map((record) => record.sha256),
  );
  const trace = member("verification/assembly.jsonl");
  assert.equal(sha256(trace), listed.get("verification/assembly.jsonl"));
  const calls = trace.toString("utf8").split("\n").filter((line) => line.trim() !== "")
    .map((line) => JSON.parse(line)).filter((entry) => entry.kind === "cell");
  assert.equal(calls.length, 4320);
  const logs = new Set();
  let unreadable = 0;
  for (const call of calls) {
    const log = call.solveOutputs.find((output) => output.name === "inspect-log").sha256;
    assert.equal(listed.get(`native/inspect/${log}.eval`), log);
    assert.ok(solveOutputs.has(log));
    logs.add(log);
    if (call.verdicts[0].measurements.judgeDecision === "INVALID") unreadable += 1;
  }
  assert.equal(logs.size, 4320);
  assert.equal(unreadable, report.accounting.parserNeutral.calls);
  assert.equal(unreadable, 22);
  for (const arm of RECORD_ORDER) {
    assert.deepEqual(
      [matrix.attrition.perArm[arm].expected, matrix.attrition.perArm[arm].judged],
      [720, report.accounting.cells.judged / RECORD_ORDER.length],
      arm,
    );
  }
});

const out = join(siteRoot, "out");
const built = existsSync(join(out, "boards", boardSlug, "index.html"));
const skip = built ? false : "run npm run build first; these read the exported pages";
const page = (path) => readFileSync(join(out, ...path.split("/")), "utf8");
/** The HTML a reader gets with no script: everything before the hydration data. */
const staticHtml = (path) => {
  const html = page(path);
  const cut = html.indexOf("<script>self.__next_f");
  return cut === -1 ? html : html.slice(0, cut);
};
/** That HTML as the words a reader sees, tags as spaces and React's text markers dropped. */
const staticText = (path) => staticHtml(path).replace(/<!--.*?-->/gsu, "").replace(/<[^>]+>/gu, " ").replace(/\s+/gu, " ");

test("the board renders in date-sealed order with no script, arms in the record's order", { skip }, () => {
  const html = staticHtml(`boards/${boardSlug}/index.html`);
  const sealed = [...html.matchAll(/data-sealed="([^"]+)"/gu)].map((match) => match[1]);
  assert.equal(sealed.length, 6);
  for (let index = 1; index < sealed.length; index += 1) assert.ok(sealed[index - 1] >= sealed[index]);
  assert.deepEqual([...html.matchAll(/data-arm="([^"]+)"/gu)].map((match) => match[1]), RECORD_ORDER);
  const sorts = [...html.matchAll(/aria-sort="([^"]+)"/gu)].map((match) => match[1]);
  assert.equal(sorts.filter((value) => value === "descending").length, 1);
  assert.equal(sorts.filter((value) => value === "none").length, 5);
  assert.match(html, /<th scope="col" class="board-col-sealed" aria-sort="descending"><span class="board-sort-label">Date sealed<\/span>/u);
  const head = html.slice(html.indexOf('<table class="board-table">'), html.indexOf("</thead>"));
  assert.doesNotMatch(head, /<button/u, "no sort control before the script can run it");
  assert.equal((head.match(/aria-sort="descending"/gu) ?? []).length, 1);
  assert.equal((head.match(/aria-sort="none"/gu) ?? []).length, 5);
});

test("every bar part and every rate is written out, with its denominator", { skip }, () => {
  const text = staticText(`boards/${boardSlug}/index.html`);
  for (const [passed, scored, notAgreed, rate] of [
    [197, 240, 43, "82.1%"],
    [164, 240, 76, "68.3%"],
    [188, 240, 52, "78.3%"],
    [163, 233, 70, "70.0%"],
    [146, 240, 94, "60.8%"],
    [211, 240, 29, "87.9%"],
  ]) {
    assert.ok(text.includes(`${passed} agreed ${notAgreed} did not agree`), `${passed} agreed`);
    assert.ok(text.includes(`${rate} (${passed} of ${scored})`), rate);
  }
  assert.ok(text.includes("7 excluded (no valid majority)"));
  assert.ok(text.includes("Full method, 240 items"));
  assert.ok(text.includes("Method author and run owner: signing key z6Mkmz8SWi…pcZTm9"));
  assert.ok(text.includes("did:key:z6Mkmz8SWiUshwDMszSqwzMngt7ScNmsEj7vZoFRLjpcZTm9"));
  assert.ok(text.includes("9ae50617f9112b750518c04309b96648207f6d0e17ba044a077d0d5185b84c9e"));
  assert.ok(text.includes("Date sealed, newest first, unless you re-sort. One group is one sealed claim."));
  assert.ok(text.includes("A result for these tasks, not a ranking of overall ability."));
  assert.ok(text.includes("A later claim on the same 240 answers may use a different judge model"));
});

test("task by task holds every planned item, failures and exclusions included, each call linked to its log", { skip }, () => {
  const html = staticHtml(`boards/${boardSlug}/index.html`);
  const outcomes = [...html.matchAll(/<td class="board-task board-task--([a-z-]+)"><details><summary>/gu)];
  assert.equal(outcomes.length, 240 * 6);
  const count = (kind) => outcomes.filter((match) => match[1] === kind).length;
  assert.deepEqual([count("passed"), count("not-passed"), count("excluded")], [1069, 364, 7]);
  const logs = [...html.matchAll(/href="\/reports\/locomo-judge-report\/bundle\/native\/inspect\/([0-9a-f]{64})\.eval"/gu)];
  assert.equal(new Set(logs.map((match) => match[1])).size, 4320);
  assert.equal((html.match(/Reason: no valid majority\./gu) ?? []).length, 7);
});

test("the pages keep to the site's copy rules", { skip }, () => {
  for (const path of ["boards/index.html", `boards/${boardSlug}/index.html`]) {
    const html = page(path);
    const text = staticText(path);
    assert.doesNotMatch(html, /—|&mdash;|&#8212;|&#x2014;/u, `${path}: no em dash`);
    assert.doesNotMatch(html, /Jinn|Independently run|spec\.jinn\.network|product\.jinn\.network/u, path);
    assert.doesNotMatch(text, /\bcells?\b/iu, `${path}: no "cell" in reader text`);
    assert.doesNotMatch(text, /\b(rank|ranked)\s*#|\bwinner\b|trusted by|List a claim/iu, path);
    assert.doesNotMatch(html, /<(script|link|img|iframe)\b[^>]*(src|href)="(https?:)?\/\//u, `${path}: no external resource`);
  }
});

test("the boards index lists the board, most recent seal first, and sends a claim lookup to Reports", { skip }, () => {
  const html = staticHtml("boards/index.html");
  assert.match(html, new RegExp(`<a href="/boards/${boardSlug}/">LoCoMo judge report frozen bank</a>`, "u"));
  const text = staticText("boards/index.html");
  assert.ok(text.includes("Board Coverages on it Claims Most recent seal"));
  assert.ok(text.includes("Full method, 240 items 1 claim, 6 grading prompts 2026-08-29"));
  assert.ok(text.includes("Boards are not ranked against each other, and neither are the claims on them."));
  assert.match(html, /Looking for one particular claim\? <a href="\/reports\/">/u);
  assert.doesNotMatch(html, /href="\/find\//u);
});

test("the header, the claim page and the homepage card link to the board", { skip }, () => {
  for (const path of ["index.html", "docs/index.html", "reports/index.html", `reports/${slug}/index.html`, "boards/index.html"]) {
    assert.match(staticHtml(path), /<nav class="site-nav" aria-label="Site"><a href="\/boards\/">Boards<\/a><a href="\/reports\/">Reports<\/a><a href="\/docs\/">Docs<\/a>/u, path);
  }
  const claimPage = staticHtml(`reports/${slug}/index.html`);
  assert.match(claimPage, new RegExp(`On the board: <a href="/boards/${boardSlug}/">LoCoMo judge report frozen bank</a>`, "u"));
  const crumb = claimPage.match(/<nav class="claim-crumb" aria-label="Breadcrumb">(.*?)<\/nav>/su)?.[1] ?? "";
  assert.match(crumb, /^<a href="\/reports\/">Reports<\/a>/u);
  assert.match(crumb, new RegExp(`<a href="/boards/${boardSlug}/">LoCoMo judge report frozen bank</a>$`, "u"));
  assert.match(staticHtml("index.html"), new RegExp(`<a href="/boards/${boardSlug}/">See its board</a>`, "u"));
});
