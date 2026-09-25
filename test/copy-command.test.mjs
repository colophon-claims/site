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
