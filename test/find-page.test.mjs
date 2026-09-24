import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

/**
 * /find/ is a lookup, not a feed and not a ranking: every public claim
 * listed on Colophon, newest first, with a search box and a board filter
 * that only ever hide or show what the server already rendered. These tests
 * read the exported pages and run only after `npm run build` has written
 * out/: the static HTML is the page with no script, so the row's facts, the
 * default order, the live count and the absence of any control that cannot
 * yet do anything are all checked there. /reports/ renders the same lookup
 * component, so it is checked the same way.
 */
const siteRoot = fileURLToPath(new URL("../", import.meta.url));
const slug = "locomo-judge-report";
const boardSlug = "locomo-judge-report-frozen-bank";
const bundleDir = join(siteRoot, "public", "reports", slug, "bundle");
const report = JSON.parse(readFileSync(join(siteRoot, "data", "reports", `${slug}.json`), "utf8"));
const member = (path) => readFileSync(join(bundleDir, ...path.split("/")));

const out = join(siteRoot, "out");
const built = existsSync(join(out, "find", "index.html"));
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

test("the claim's own finding is the first sentence of the sealed result, and it matches the issue's own row", () => {
  const first = report.result.primary.split(/(?<=\.)\s+/u)[0];
  assert.equal(first, "Changing only the grader moved agreement with the same correctness labels from 60.8% to 87.9%.");
});

test("the row's claimant is the signing key both records name, the same fact the board and the claim page print", () => {
  const run = JSON.parse(member("run.json").toString("utf8"));
  const method = JSON.parse(member("benchmark.json").toString("utf8"));
  assert.equal(run.owner, "did:key:z6Mkmz8SWiUshwDMszSqwzMngt7ScNmsEj7vZoFRLjpcZTm9");
  assert.equal(method.author, run.owner);
  assert.equal(method.name, "LoCoMo judge report frozen bank");
  assert.equal(report.reportedAt, "2026-08-29T16:30:51Z");
});

test("/find/ renders with no script: the row, its facts, and the live count", { skip }, () => {
  const html = staticHtml("find/index.html");
  const text = staticText("find/index.html");
  assert.ok(text.includes("Find a claim"));
  assert.ok(text.includes("Every public claim listed on Colophon, newest first. The order is by date, not merit."));
  assert.match(html, /<h2 class="find-row-title"><a href="\/reports\/locomo-judge-report\/">Judging the LoCoMo judges<\/a><\/h2>/u);
  assert.ok(text.includes("LoCoMo judge report frozen bank, Full method, 240 items"));
  assert.ok(text.includes("Self-run"));
  assert.ok(text.includes("Sealed 2026-08-29"));
  // The shortened key is on the row itself; the full key sits behind the
  // same collapsible disclosure the board and the claim page use.
  assert.match(html, /<code>z6Mkmz8SWi…pcZTm9<\/code>/u);
  assert.ok(text.includes("Method author and run owner"));
  assert.ok(text.includes("did:key:z6Mkmz8SWiUshwDMszSqwzMngt7ScNmsEj7vZoFRLjpcZTm9"));
  assert.ok(
    text.includes("Changing only the grader moved agreement with the same correctness labels from 60.8% to 87.9%."),
  );
  assert.match(html, new RegExp(`On the <a href="/boards/${boardSlug}/">LoCoMo judge report frozen bank</a> board`, "u"));
  assert.match(html, /<p class="find-count" role="status" aria-live="polite">/u);
  assert.ok(text.includes("1 claim listed."));
  assert.ok(
    text.includes(
      "Colophon does not rank claims against each other, and claims sealed on different suites or methods are never compared.",
    ),
  );
});

test("/find/ renders in date order with no script, and offers no control script has not enhanced yet", { skip }, () => {
  const html = staticHtml("find/index.html");
  assert.match(html, /<ul class="find-list">/u);
  const rows = [...html.matchAll(/data-find-row="" data-slug="([^"]+)"/gu)].map((match) => match[1]);
  assert.deepEqual(rows, [slug]);
  // No search box or board filter before the script has run: nothing here
  // looks live but is actually dead.
  assert.doesNotMatch(html, /<input\b/u, "no search box before hydration");
  assert.doesNotMatch(html, /<select\b/u, "no board filter before hydration");
  assert.doesNotMatch(html, /find-empty/u, "no empty-state block when the full list is showing");
});

test("/find/ keeps to the site's copy rules", { skip }, () => {
  for (const path of ["find/index.html", "reports/index.html"]) {
    const html = page(path);
    const text = staticText(path);
    assert.doesNotMatch(html, /—|&mdash;|&#8212;|&#x2014;/u, `${path}: no em dash`);
    assert.doesNotMatch(html, /Jinn|Independently run|spec\.jinn\.network|product\.jinn\.network/u, path);
    assert.doesNotMatch(text, /\bcells?\b/iu, `${path}: no "cell" in reader text`);
    assert.doesNotMatch(text, /\b(rank|ranked)\s*#|\bwinner\b|trusted by/iu, path);
    assert.doesNotMatch(html, /<(script|link|img|iframe)\b[^>]*(src|href)="(https?:)?\/\//u, `${path}: no external resource`);
  }
});

test("/reports/ renders the same lookup as /find/", { skip }, () => {
  const findText = staticText("find/index.html");
  const reportsText = staticText("reports/index.html");
  assert.equal(reportsText, findText);
});
