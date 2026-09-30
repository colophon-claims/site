import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:http";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { memberUrl, parseArgs, run, selectMembers } from "../scripts/check-bundle-urls.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const vercel = JSON.parse(readFileSync(`${root}vercel.json`, "utf8"));

// The two path-to-regexp forms vercel.json may use for a rewrite source:
// ":name" is one path segment, ":name+" is one or more segments.
function sourceToRegExp(source) {
  let out = "^";
  for (const part of source.split("/").slice(1)) {
    const m = /^:(\w+)(\+)?$/.exec(part);
    if (!m) out += "/" + part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    else out += m[2] ? "/([^/]+(?:/[^/]+)*)" : "/([^/]+)";
  }
  return new RegExp(out + "$");
}

function rewrite(path) {
  for (const rule of vercel.rewrites) {
    const m = sourceToRegExp(rule.source).exec(path);
    if (!m) continue;
    const names = [...rule.source.matchAll(/:(\w+)/g)].map((n) => n[1]);
    let dest = rule.destination;
    names.forEach((n, i) => (dest = dest.replace(new RegExp(`:${n}\\+?`), m[i + 1])));
    return dest;
  }
  return null;
}

test("vercel.json only rewrites, and only under a bundle", () => {
  assert.deepEqual(Object.keys(vercel).filter((k) => k !== "$schema"), ["rewrites"]);
  for (const rule of vercel.rewrites) {
    assert.match(rule.source, /^\/reports\/:slug\/bundle\//);
    assert.match(rule.destination, /^\/reports\/:slug\/bundle\//);
    assert.ok(rule.destination.endsWith("/"), "the destination is the directory URL, never a redirect target");
  }
});

test("the rewrite serves index.html at any depth from its directory and touches nothing else", () => {
  assert.equal(rewrite("/reports/a-b/bundle/index.html"), "/reports/a-b/bundle/");
  assert.equal(rewrite("/reports/a-b/bundle/x/index.html"), "/reports/a-b/bundle/x/");
  assert.equal(rewrite("/reports/a-b/bundle/x/y/index.html"), "/reports/a-b/bundle/x/y/");
  for (const p of [
    "/",
    "/index.html",
    "/reports/a-b/",
    "/reports/a-b/index.html",
    "/reports/a-b/bundle/",
    "/reports/a-b/bundle/README.md",
    "/reports/a-b/bundle/not-index.html",
    "/reports/a-b/bundle/x/other.html",
    "/reports/a-b/other/index.html",
    "/reports/a-b/bundle/index.html/x",
  ]) assert.equal(rewrite(p), null, p);
});

test("every .html member of every published bundle is covered by a rewrite", () => {
  let seen = 0;
  for (const slug of readdirSync(`${root}public/reports`)) {
    let manifest;
    try {
      manifest = JSON.parse(readFileSync(`${root}public/reports/${slug}/bundle/bundle.json`, "utf8"));
    } catch {
      continue;
    }
    for (const { path } of manifest.files.filter((f) => f.path.endsWith(".html"))) {
      seen++;
      const dir = path.slice(0, path.length - "index.html".length);
      assert.equal(rewrite(`/reports/${slug}/bundle/${path}`), path.endsWith("index.html") ? `/reports/${slug}/bundle/${dir}` : null,
        `${slug}: ${path} needs a rewrite rule in vercel.json`);
      assert.ok(path.endsWith("index.html"), `${slug}: ${path} is an .html member that is not an index.html; add a rule for it`);
    }
  }
  assert.ok(seen > 0);
});

test("the checker parses options and selects members", () => {
  assert.deepEqual(parseArgs(["https://x.test", "s", "--html-only", "--every", "3"]).every, 3);
  assert.throws(() => parseArgs(["only-one"]));
  assert.throws(() => parseArgs(["a", "b", "--every", "0"]));
  const files = ["a.json", "index.html", "c.md", "d/index.html"].map((path) => ({ path }));
  assert.deepEqual(selectMembers(files, { htmlOnly: true, every: 1 }).map((f) => f.path), ["index.html", "d/index.html"]);
  assert.deepEqual(selectMembers(files, { htmlOnly: false, every: 2 }).map((f) => f.path), ["a.json", "c.md"]);
  assert.equal(memberUrl("https://x.test/", "s", "a b/c.json"), "https://x.test/reports/s/bundle/a%20b/c.json");
});

test("the checker reports non-200s and hash mismatches and retries a 5xx", async (context) => {
  const sha = (s) => createHash("sha256").update(s).digest("hex");
  const files = [
    { path: "ok.json", sha256: sha("ok") },
    { path: "index.html", sha256: sha("html") },
    { path: "wrong.bin", sha256: sha("expected") },
    { path: "flaky.txt", sha256: sha("flaky") },
  ];
  const fake = mkdtempSync(join(tmpdir(), "bundle-urls-"));
  context.after(() => rmSync(fake, { recursive: true, force: true }));
  mkdirSync(join(fake, "public/reports/s/bundle"), { recursive: true });
  writeFileSync(join(fake, "public/reports/s/bundle/bundle.json"), JSON.stringify({ files }));
  let flaky = 0;
  const server = createServer((req, res) => {
    const path = req.url.replace("/reports/s/bundle/", "");
    if (path === "index.html") return void res.writeHead(404).end();
    if (path === "flaky.txt" && flaky++ < 1) return void res.writeHead(503).end();
    res.end(path === "wrong.bin" ? "actual" : path === "flaky.txt" ? "flaky" : "ok");
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  context.after(() => server.close());
  const base = { base: `http://127.0.0.1:${server.address().port}`, slug: "s", htmlOnly: false, every: 1, concurrency: 2, retries: 2 };
  const head = await run({ ...base, verifyBytes: false }, fake + "/");
  assert.equal(head.checked, 4);
  assert.deepEqual(head.failures.map((f) => [f.path, f.problem]), [["index.html", "status 404"]]);
  flaky = 0;
  const verified = await run({ ...base, verifyBytes: true }, fake + "/");
  assert.deepEqual(verified.failures.map((f) => f.path), ["index.html", "wrong.bin"]);
  assert.match(verified.failures[1].problem, /does not match manifest/);
});
