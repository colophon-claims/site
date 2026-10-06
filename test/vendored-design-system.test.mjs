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

// Hash what git would track. Git never records empty directories, and it skips
// whatever .gitignore excludes, so a Finder-made .DS_Store must not fail this
// test. Plain-name .gitignore lines (no slash, no wildcard) are honoured, and
// .DS_Store is always skipped. No shelling out to git, so this also works
// outside a checkout.
function ignoredNames() {
  const names = new Set([".DS_Store"]);
  try {
    for (const raw of readFileSync(join(siteRoot, ".gitignore"), "utf8").split("\n")) {
      const line = raw.trim();
      if (line && !line.startsWith("#") && !/[\/*?[!]/.test(line)) names.add(line);
    }
  } catch {
    // no .gitignore: only the built-in name applies
  }
  return names;
}
const ignored = ignoredNames();

const sha1 = (...parts) => {
  const hash = createHash("sha1");
  for (const part of parts) hash.update(part);
  return hash;
};

function blobHash(bytes) {
  return sha1(`blob ${bytes.length}\0`, bytes).digest();
}

function treeHash(dir) {
  const entries = [];
  for (const name of readdirSync(dir)) {
    if (ignored.has(name)) continue;
    const path = join(dir, name);
    const stat = lstatSync(path);
    if (stat.isSymbolicLink()) throw new Error(`symlink in vendored tree: ${path}`);
    if (stat.isDirectory()) {
      const sha = treeHash(path);
      if (sha) entries.push({ name, sortKey: `${name}/`, mode: "40000", sha });
      continue;
    }
    if (!stat.isFile()) throw new Error(`unexpected entry in vendored tree: ${path}`);
    // git records 100755 only from the owner execute bit.
    const mode = stat.mode & 0o100 ? "100755" : "100644";
    entries.push({ name, sortKey: name, mode, sha: blobHash(readFileSync(path)) });
  }
  if (entries.length === 0) return null; // git does not record empty directories
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
  const actual = (treeHash(referenceDir) ?? Buffer.alloc(0)).toString("hex");
  assert.equal(
    actual,
    match[1],
    `vendor/design-system/reference hashes to ${actual}, VENDORED.md records ${match[1]}. ` +
      "Look for an edited vendored file, a removed file, a changed owner-execute bit, " +
      "or a new untracked file under vendor/design-system/reference. " +
      "To fix: restore the file (git checkout -- vendor/design-system/reference, and delete the stray file), " +
      "or, if this is a real re-vendor, refresh the tree hash in VENDORED.md.",
  );
});
