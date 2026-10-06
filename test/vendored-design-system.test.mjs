import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

// The vendored design system must stay byte-identical to its source. VENDORED.md
// records the git tree hash of vendor/design-system/reference/. This test hashes
// the files on disk the way git hashes a tree, so an uncommitted edit fails too.

const siteRoot = fileURLToPath(new URL("../", import.meta.url));
const referenceDir = join(siteRoot, "vendor", "design-system", "reference");
const notePath = join(siteRoot, "vendor", "design-system", "VENDORED.md");

const sha1 = (...parts) => {
  const hash = createHash("sha1");
  for (const part of parts) hash.update(part);
  return hash;
};

function blobHash(bytes) {
  return sha1(`blob ${bytes.length}\0`, bytes).digest();
}

function treeHash(dir) {
  const entries = readdirSync(dir).map((name) => {
    const path = join(dir, name);
    const stat = lstatSync(path);
    if (stat.isSymbolicLink()) throw new Error(`symlink in vendored tree: ${path}`);
    if (stat.isDirectory()) {
      return { name, sortKey: `${name}/`, mode: "40000", sha: treeHash(path) };
    }
    if (!stat.isFile()) throw new Error(`unexpected entry in vendored tree: ${path}`);
    const mode = stat.mode & 0o111 ? "100755" : "100644";
    return { name, sortKey: name, mode, sha: blobHash(readFileSync(path)) };
  });
  entries.sort((a, b) => Buffer.compare(Buffer.from(a.sortKey), Buffer.from(b.sortKey)));
  const body = Buffer.concat(
    entries.map((e) => Buffer.concat([Buffer.from(`${e.mode} ${e.name}\0`), e.sha])),
  );
  return sha1(`tree ${body.length}\0`, body).digest();
}

test("the vendored design system matches the tree hash recorded in VENDORED.md", () => {
  assert.ok(existsSync(referenceDir), "vendor/design-system/reference is missing");
  const note = readFileSync(notePath, "utf8");
  const match = note.match(/^\| Tree hash of `reference\/` \| `([0-9a-f]{40})` \|$/m);
  assert.ok(match, "VENDORED.md must record the tree hash in a row starting 'Tree hash of `reference/`'");
  const actual = treeHash(referenceDir).toString("hex");
  assert.equal(
    actual,
    match[1],
    `vendor/design-system/reference hashes to ${actual}, VENDORED.md records ${match[1]}. ` +
      "Do not edit the vendored files: re-vendor and update VENDORED.md.",
  );
});
