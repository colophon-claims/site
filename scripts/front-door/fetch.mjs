/**
 * Fetches a submitted locator into an empty workspace, the way a stranger
 * would: plain HTTPS GETs with no credentials the claimant supplied.
 *
 * Every connection resolves its host through a lookup that refuses private,
 * loopback, link-local and similar addresses (policy.mjs), so a redirect or a
 * DNS answer cannot point the workflow inside a private network. Redirects are
 * followed by hand, a few hops, each hop checked the same way.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { lookup as dnsLookup } from "node:dns";
import {
  createWriteStream,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
} from "node:fs";
import { request } from "node:https";
import { dirname, join } from "node:path";
import { pipeline } from "node:stream/promises";
import { Transform } from "node:stream";

import { isBlockedAddress, isBlockedHostname, parseLocator, refuse } from "./policy.mjs";

export const LIMITS = {
  redirects: 5,
  files: 100_000,
  totalBytes: 2 * 1024 ** 3,
  timeoutMs: 60_000,
  concurrency: 16,
};

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

function guardedLookup(hostname, options, callback) {
  dnsLookup(hostname, { ...options, all: true }, (error, addresses) => {
    if (error) return callback(error);
    const blocked = addresses.find(({ address }) => isBlockedAddress(address));
    if (blocked !== undefined) {
      const refusal = new Error(`${hostname} resolves to an address the listing workflow does not reach`);
      refusal.code = "BLOCKED_ORIGIN";
      return callback(refusal);
    }
    if (options.all) return callback(null, addresses);
    return callback(null, addresses[0].address, addresses[0].family);
  });
}

function checkUrl(href) {
  const url = new URL(href);
  if (url.protocol !== "https:") refuse("blocked-origin", "Only https is fetched, including on redirects.");
  if (url.username !== "" || url.password !== "") refuse("blocked-origin", "Credential-bearing URLs are refused.");
  if (url.port !== "" && url.port !== "443") refuse("blocked-origin", "Only the standard https port is fetched.");
  if (isBlockedHostname(url.hostname)) {
    refuse("blocked-origin", "The locator points at a private, local or reserved address.");
  }
  return url;
}

function once(url, headers) {
  return new Promise((resolve, reject) => {
    const req = request(url, { method: "GET", headers, lookup: guardedLookup, timeout: LIMITS.timeoutMs }, resolve);
    req.on("timeout", () => req.destroy(new Error(`timed out fetching ${url.href}`)));
    req.on("error", reject);
    req.end();
  });
}

/** One GET, following up to LIMITS.redirects redirects, each hop checked. */
async function get(href, initialHeaders = {}) {
  let headers = initialHeaders;
  let url = checkUrl(href);
  for (let hop = 0; hop <= LIMITS.redirects; hop += 1) {
    let response;
    try {
      response = await once(url, { "user-agent": "colophon-claims-listing", ...headers });
    } catch (error) {
      if (error.code === "BLOCKED_ORIGIN") refuse("blocked-origin", "The locator points at a private, local or reserved address.");
      refuse("fetch-failed", `Could not fetch ${url.href}: ${error.message}`);
    }
    const status = response.statusCode ?? 0;
    if (status >= 300 && status < 400 && response.headers.location) {
      response.resume();
      let next;
      try {
        next = new URL(response.headers.location, url);
      } catch {
        refuse("fetch-failed", `${url.href} redirected to an address that is not a URL.`);
      }
      // A token never follows a redirect to another host.
      if (next.host !== url.host) {
        const { authorization: _dropped, ...rest } = headers;
        headers = rest;
      }
      url = checkUrl(next.href);
      continue;
    }
    if (status !== 200) {
      response.resume();
      refuse("fetch-failed", `${url.href} answered HTTP ${status}.`);
    }
    return response;
  }
  refuse("fetch-failed", `${href} redirected more than ${LIMITS.redirects} times.`);
}

class Budget {
  constructor() {
    this.bytes = 0;
    this.files = 0;
  }

  meter() {
    const budget = this;
    budget.files += 1;
    if (budget.files > LIMITS.files) refuse("fetch-failed", `The bundle has more than ${LIMITS.files} files.`);
    return new Transform({
      transform(chunk, _encoding, callback) {
        budget.bytes += chunk.length;
        if (budget.bytes > LIMITS.totalBytes) {
          callback(new Error(`the bundle is larger than ${LIMITS.totalBytes} bytes`));
          return;
        }
        callback(null, chunk);
      },
    });
  }
}

async function download(href, destination, budget, headers) {
  const response = await get(href, headers);
  mkdirSync(dirname(destination), { recursive: true });
  try {
    await pipeline(response, budget.meter(), createWriteStream(destination, { flags: "wx" }));
  } catch (error) {
    refuse("fetch-failed", `Could not fetch ${href}: ${error.message}`);
  }
}

/** A manifest path that stays inside the bundle directory. */
function safeMemberPath(path) {
  return typeof path === "string"
    && path !== ""
    && !path.startsWith("/")
    && !path.includes("\\")
    && !path.split("/").some((part) => part === "" || part === "." || part === "..");
}

async function fetchDirectory(baseHref, into) {
  const budget = new Budget();
  await download(new URL("bundle.json", baseHref).href, join(into, "bundle.json"), budget);
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(join(into, "bundle.json"), "utf8"));
  } catch {
    refuse("unknown-format", "bundle.json at the locator is not valid JSON.");
  }
  const entries = Array.isArray(manifest?.files) ? manifest.files : [];
  if (entries.length === 0) refuse("unknown-format", "bundle.json lists no files.");
  if (entries.length > LIMITS.files) refuse("fetch-failed", `The bundle lists more than ${LIMITS.files} files.`);
  const paths = entries.map((entry) => entry?.path);
  const unsafe = paths.find((path) => !safeMemberPath(path) || path === "bundle.json");
  if (unsafe !== undefined) refuse("unknown-format", `bundle.json lists a path the workflow will not write: ${String(unsafe)}`);
  const queue = [...new Set(paths)];
  const worker = async () => {
    for (let path = queue.shift(); path !== undefined; path = queue.shift()) {
      const href = new URL(path.split("/").map(encodeURIComponent).join("/"), baseHref).href;
      const destination = join(into, ...path.split("/"));
      try {
        await download(href, destination, budget);
      } catch (error) {
        // Static hosts that drop "index.html" from URLs (this site among them)
        // serve that member at its directory instead. The checker verifies
        // every byte, so the second address is only a place to look.
        if (!(path === "index.html" || path.endsWith("/index.html")) || !/HTTP 404/.test(error.message)) throw error;
        rmSync(destination, { force: true });
        await download(href.slice(0, -"index.html".length), destination, budget);
      }
    }
  };
  await Promise.all(Array.from({ length: LIMITS.concurrency }, worker));
}

/** Refuses symbolic links and anything that is not a plain file or directory. */
function assertPlainTree(directory) {
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    const stat = lstatSync(path);
    if (stat.isDirectory()) assertPlainTree(path);
    else if (!stat.isFile()) refuse("unknown-format", `The archive carries something that is not a plain file: ${name}`);
  }
}

/**
 * The bundle root inside an unpacked tree: the tree itself, or its one
 * top-level directory. A bundle nested deeper is refused with that reason.
 */
function bundleRoot(tree) {
  if (existsSync(join(tree, "bundle.json"))) return tree;
  const entries = readdirSync(tree);
  if (entries.length === 1 && lstatSync(join(tree, entries[0])).isDirectory()) {
    const inner = join(tree, entries[0]);
    if (existsSync(join(inner, "bundle.json"))) return inner;
  }
  refuse(
    "unknown-format",
    "There is no bundle.json at the root of the archive or of its one top-level directory. Archive the bundle directory itself, not a folder above it.",
  );
}

/**
 * Lists an archive before unpacking it, and refuses any entry that is not a
 * plain file or directory, or whose path is absolute or climbs out with "..".
 * A link inside an archive could otherwise let a later entry write through it.
 */
function preflightArchive(archivePath, kind) {
  const listing = kind === "zip"
    ? spawnSync("unzip", ["-Z", archivePath], { encoding: "utf8", maxBuffer: 256 * 1024 ** 2 })
    : spawnSync("tar", ["-tvf", archivePath], { encoding: "utf8", maxBuffer: 256 * 1024 ** 2 });
  const names = kind === "zip"
    ? spawnSync("unzip", ["-Z1", archivePath], { encoding: "utf8", maxBuffer: 256 * 1024 ** 2 })
    : spawnSync("tar", ["-tf", archivePath], { encoding: "utf8", maxBuffer: 256 * 1024 ** 2 });
  if (listing.status !== 0 || names.status !== 0) {
    refuse("fetch-failed", "The archive could not be read as a zip or tarball.");
  }
  const lines = listing.stdout.split("\n").filter((line) => line !== "");
  // zipinfo prints a header and a trailer around one line per entry, each
  // starting with its permission string; tar prints only entry lines.
  const entryLines = kind === "zip" ? lines.filter((line) => /^[-dlbcps?][rwxsStT-]{9}/.test(line)) : lines;
  const entryNames = names.stdout.split("\n").filter((line) => line !== "");
  if (entryNames.length > LIMITS.files) refuse("fetch-failed", `The archive holds more than ${LIMITS.files} entries.`);
  // Every entry must be accounted for by a Unix-style line, or the size cap
  // below could be walked around.
  if (entryLines.length !== entryNames.length) {
    refuse("unknown-format", "The archive's entries could not all be read. Pack the bundle with a standard zip or tar tool.");
  }
  let unpackedBytes = 0;
  for (const line of entryLines) {
    if (line[0] !== "-" && line[0] !== "d") {
      refuse("unknown-format", "The archive carries a link or special file. A bundle holds only plain files.");
    }
    // The entry's unpacked size: the fourth column of zipinfo, or the first
    // bare number after the owner in tar -tv.
    const columns = line.trim().split(/\s+/);
    const size = kind === "zip" ? columns[3] : columns.slice(2).find((column) => /^\d+$/.test(column));
    if (size === undefined || !/^\d+$/.test(size)) refuse("unknown-format", "The archive does not state an entry's size.");
    unpackedBytes += Number(size);
  }
  if (unpackedBytes > LIMITS.totalBytes) refuse("fetch-failed", `The archive unpacks to more than ${LIMITS.totalBytes} bytes.`);
  for (const name of entryNames) {
    if (name.startsWith("/") || name.includes("\\") || name.split("/").includes("..")) {
      refuse("unknown-format", `The archive carries a path outside itself: ${name}`);
    }
  }
}

export function unpack(archivePath, kind, into) {
  preflightArchive(archivePath, kind);
  mkdirSync(into, { recursive: true });
  const result = kind === "zip"
    ? spawnSync("unzip", ["-qq", "-o", archivePath, "-d", into], { encoding: "utf8" })
    : spawnSync("tar", ["-xf", archivePath, "-C", into, "--no-same-owner", "--no-same-permissions"], { encoding: "utf8" });
  if (result.status !== 0) refuse("fetch-failed", `The archive did not unpack: ${(result.stderr || "").trim()}`);
  assertPlainTree(into);
}

async function fetchArchive(href, kind, workspace) {
  const archivePath = join(workspace, kind === "zip" ? "bundle.zip" : "bundle.tar");
  await download(href, archivePath, new Budget());
  const tree = join(workspace, "unpacked");
  unpack(archivePath, kind, tree);
  return bundleRoot(tree);
}

async function githubJson(path, token) {
  const headers = { accept: "application/vnd.github+json" };
  if (token) headers.authorization = `Bearer ${token}`;
  const response = await get(`https://api.github.com${path}`, headers);
  const chunks = [];
  for await (const chunk of response) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

/**
 * owner/repo@ref:path on public GitHub. The ref is resolved to an exact commit
 * first; the listing is of that commit's bytes, and records it.
 */
async function fetchGithubTree(locator, workspace, token) {
  const { owner, repo, ref, path } = locator;
  const repository = await githubJson(`/repos/${owner}/${repo}`, token);
  if (repository.private !== false) refuse("blocked-origin", "The repository is not public.");
  const commit = await githubJson(`/repos/${owner}/${repo}/commits/${encodeURIComponent(ref)}`, token);
  const oid = commit?.sha;
  if (typeof oid !== "string" || !/^[a-f0-9]{40}$/.test(oid)) refuse("fetch-failed", `${ref} does not resolve to a commit.`);
  const archivePath = join(workspace, "tree.tar.gz");
  await download(`https://codeload.github.com/${owner}/${repo}/tar.gz/${oid}`, archivePath, new Budget());
  const tree = join(workspace, "tree");
  unpack(archivePath, "tar", tree);
  const [top] = readdirSync(tree);
  const root = join(tree, top, ...(path === "" ? [] : path.split("/")));
  if (!existsSync(join(root, "bundle.json"))) {
    refuse("unknown-format", `There is no bundle.json at ${path === "" ? "the repository root" : path} in ${owner}/${repo} at ${oid}.`);
  }
  return { root, resolvedCommit: oid };
}

/**
 * Fetches a locator into a new directory under `parent` and returns where the
 * bundle landed, its identity (the SHA-256 of its bundle.json bytes) and the
 * provenance the listing records.
 */
export async function fetchLocator(locatorText, parent, { githubToken } = {}) {
  const locator = parseLocator(locatorText);
  const workspace = mkdtempSync(join(parent, "fetch-"));
  let root;
  let resolvedCommit;
  if (locator.kind === "directory") {
    root = join(workspace, "bundle");
    mkdirSync(root);
    await fetchDirectory(locator.url, root);
  } else if (locator.kind === "archive") {
    root = await fetchArchive(locator.url, locator.archive, workspace);
  } else {
    ({ root, resolvedCommit } = await fetchGithubTree(locator, workspace, githubToken));
  }
  // The bundle is moved to a fixed name so the checker's path is predictable.
  const bundleDir = join(parent, "bundle");
  rmSync(bundleDir, { recursive: true, force: true });
  renameSync(root, bundleDir);
  rmSync(workspace, { recursive: true, force: true });
  const identity = sha256(readFileSync(join(bundleDir, "bundle.json")));
  const provenance = { locator: locatorText, syntax: locator.kind };
  if (resolvedCommit !== undefined) provenance.resolvedCommit = resolvedCommit;
  return { bundleDir, identity, provenance };
}
