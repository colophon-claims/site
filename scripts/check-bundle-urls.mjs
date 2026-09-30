#!/usr/bin/env node
// Walks a published bundle's manifest against a base URL and reports every
// member that does not come back with 200 (and, with --verify-bytes, with the
// SHA-256 the manifest lists). No dependencies.
//
//   node scripts/check-bundle-urls.mjs <base-url> <slug> [options]
//
//   --verify-bytes    GET each member and check its SHA-256 (default: HEAD)
//   --html-only       only members whose path ends in .html
//   --every <n>       only every nth manifest path (the first, then each nth)
//   --concurrency <n> parallel requests (default 8)
//   --retries <n>     extra attempts per member on a network error or 5xx (default 2)
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export function parseArgs(argv) {
  const opts = { verifyBytes: false, htmlOnly: false, every: 1, concurrency: 8, retries: 2 };
  const positional = [];
  const number = (flag, value, min) => {
    const n = Number(value);
    if (!Number.isInteger(n) || n < min) throw new Error(`${flag} needs a whole number of at least ${min}`);
    return n;
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--verify-bytes") opts.verifyBytes = true;
    else if (a === "--html-only") opts.htmlOnly = true;
    else if (a === "--every") opts.every = number(a, argv[++i], 1);
    else if (a === "--concurrency") opts.concurrency = number(a, argv[++i], 1);
    else if (a === "--retries") opts.retries = number(a, argv[++i], 0);
    else if (a.startsWith("--")) throw new Error(`unknown option ${a}`);
    else positional.push(a);
  }
  if (positional.length !== 2) throw new Error("usage: check-bundle-urls.mjs <base-url> <slug> [options]");
  [opts.base, opts.slug] = positional;
  return opts;
}

export function memberUrl(base, slug, path) {
  const root = base.replace(/\/+$/, "");
  return `${root}/reports/${slug}/bundle/${path.split("/").map(encodeURIComponent).join("/")}`;
}

export function selectMembers(files, { htmlOnly, every }) {
  return files.filter((f, i) => i % every === 0 && (!htmlOnly || f.path.endsWith(".html")));
}

async function checkOne(url, member, { verifyBytes, retries }) {
  let last = "";
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { method: verifyBytes ? "GET" : "HEAD", redirect: "manual" });
      if (res.status >= 500 && attempt < retries) {
        last = `status ${res.status}`;
        continue;
      }
      if (res.status !== 200) return `status ${res.status}`;
      if (!verifyBytes) return null;
      const digest = createHash("sha256").update(Buffer.from(await res.arrayBuffer())).digest("hex");
      return digest === member.sha256 ? null : `sha256 ${digest} does not match manifest ${member.sha256}`;
    } catch (error) {
      last = `request failed: ${error.message}`;
    }
  }
  return last;
}

export async function run(opts, root = fileURLToPath(new URL("../", import.meta.url))) {
  const manifest = JSON.parse(readFileSync(`${root}public/reports/${opts.slug}/bundle/bundle.json`, "utf8"));
  const members = selectMembers(manifest.files, opts);
  const failures = [];
  let next = 0;
  const worker = async () => {
    while (next < members.length) {
      const member = members[next++];
      const url = memberUrl(opts.base, opts.slug, member.path);
      const problem = await checkOne(url, member, opts);
      if (problem) failures.push({ path: member.path, url, problem });
    }
  };
  await Promise.all(Array.from({ length: Math.min(opts.concurrency, members.length) }, worker));
  failures.sort((a, b) => a.path.localeCompare(b.path));
  return { checked: members.length, listed: manifest.files.length, failures };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exit(2);
  }
  const { checked, listed, failures } = await run(opts);
  const mode = opts.verifyBytes ? "GET + SHA-256" : "HEAD";
  console.log(`${opts.base} ${opts.slug}: checked ${checked} of ${listed} listed paths (${mode}), ${checked - failures.length} ok, ${failures.length} failed`);
  for (const f of failures) console.log(`FAIL ${f.problem}  ${f.url}`);
  process.exit(failures.length ? 1 : 0);
}
