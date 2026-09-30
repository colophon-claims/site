import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

/**
 * The shared copy control (components/copy-command.tsx) renders its "Copy"
 * button only once the client component has mounted, the same pattern the
 * board's sort headings use (components/board-sort-table.tsx): the value
 * stays visible and selectable with no script, and the control offers no
 * button that cannot yet do anything. These tests read the exported pages
 * and run only after `npm run build` has written out/.
 */
const siteRoot = fileURLToPath(new URL("../", import.meta.url));
const slug = "locomo-judge-report";
const boardSlug = "locomo-judge-report-frozen-bank";

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

const pagesWithACopyControl = [`reports/${slug}/index.html`, `boards/${boardSlug}/index.html`, "find/index.html"];

test("the claim page, the board and Find a claim carry no copy button before the script can run it", { skip }, () => {
  for (const path of pagesWithACopyControl) {
    const html = staticHtml(path);
    const controls = [...html.matchAll(/<div class="copy-command">.*?<\/div>/gsu)].map((match) => match[0]);
    assert.ok(controls.length > 0, `${path}: at least one copy control is rendered`);
    for (const control of controls) {
      assert.doesNotMatch(control, /<button/u, `${path}: no button before hydration`);
      // The button's space is reserved by an inert placeholder, not left out,
      // so its later arrival does not resize the control or move the value.
      assert.match(control, /<span class="copy-command__placeholder" aria-hidden="true"><\/span>/u, `${path}: the button's space is reserved`);
    }
    // Not just before the hydration script: nowhere in the page, including
    // the data Next serialises for hydration, does a copy button appear.
    assert.doesNotMatch(page(path), /copy-command__button/u, `${path}: no copy-command__button anywhere in the page`);
  }
});

const css = () => readFileSync(join(siteRoot, "app", "globals.css"), "utf8");

test("the copy button keeps the site's standard focus outline and nothing clips it", () => {
  const source = css();
  assert.doesNotMatch(source, /\.copy-command__button:focus-visible/u, "no copy-button focus override: the vendored :focus-visible outline applies");
  const container = source.match(/\n\.copy-command \{[^}]*\}/u);
  assert.ok(container, "the .copy-command rule exists");
  assert.doesNotMatch(container[0], /overflow/u, ".copy-command does not clip its children, so the outline can draw outside the button");
  const button = source.match(/\n\.copy-command__button \{[^}]*\}/u);
  assert.match(button[0], /border-radius: 0 var\(--copy-inner-radius\) var\(--copy-inner-radius\) 0/u, "the button carries the container's inner corner radius");
});
