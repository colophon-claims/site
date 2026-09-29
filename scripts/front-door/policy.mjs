/**
 * The front door's rules, as pure functions: what a submission may name, where
 * the workflow may fetch from, which checker line it may run, and which slug a
 * listing gets. Nothing here touches the network or the file system, so each
 * rule is tested on its own (test/front-door.test.mjs).
 *
 * Refusal codes are the ones the listing design names; each refusal carries a
 * plain sentence the workflow posts on the submission issue.
 */
import { isIP } from "node:net";

export class Refusal extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

export const refuse = (code, message) => {
  throw new Refusal(code, message);
};

// ---------------------------------------------------------------------------
// The submission issue

/**
 * Reads the fields a GitHub issue form renders into an issue body: each field
 * is a `### <label>` heading followed by its value, and an empty optional field
 * renders as `_No response_`.
 */
export function parseIssueForm(body) {
  const fields = new Map();
  const sections = String(body ?? "").replace(/\r\n/g, "\n").split(/^### /m).slice(1);
  for (const section of sections) {
    const newline = section.indexOf("\n");
    const label = (newline === -1 ? section : section.slice(0, newline)).trim();
    const value = newline === -1 ? "" : section.slice(newline + 1).trim();
    fields.set(label, value === "_No response_" ? "" : value);
  }
  return fields;
}

export const FORM_LABELS = { locator: "Bundle locator", slug: "Proposed slug" };

export function readSubmission(body) {
  const fields = parseIssueForm(body);
  const locator = fields.get(FORM_LABELS.locator) ?? "";
  const slug = fields.get(FORM_LABELS.slug) ?? "";
  if (locator === "") {
    refuse("fetch-failed", `The issue has no "${FORM_LABELS.locator}" field. Open the submission with the "List a sealed claim" form.`);
  }
  if (/\s/.test(locator)) refuse("fetch-failed", "The locator must be one address with no spaces.");
  return { locator, proposedSlug: slug === "" ? null : slug };
}

// ---------------------------------------------------------------------------
// The locator: one string, three syntaxes

const GITHUB_TREE = /^([A-Za-z0-9-]{1,39})\/([A-Za-z0-9._-]{1,100})@([^:\s]{1,255}):(.*)$/;
const ARCHIVE_SUFFIXES = [
  [".tar.gz", "tar"],
  [".tgz", "tar"],
  [".tar", "tar"],
  [".zip", "zip"],
];

/**
 * One locator, three syntaxes: an https URL of a bundle directory, an https URL
 * of a zip or tarball of one, or `owner/repo@ref:path` on public GitHub.
 */
export function parseLocator(locator) {
  const tree = GITHUB_TREE.exec(locator);
  if (tree !== null) {
    const [, owner, repo, ref, rawPath] = tree;
    const path = rawPath.replace(/^\/+|\/+$/g, "");
    if (path.split("/").some((part) => part === "." || part === "..")) {
      refuse("fetch-failed", "The repository path may not contain . or .. segments.");
    }
    return { kind: "github-tree", owner, repo, ref, path };
  }
  let url;
  try {
    url = new URL(locator);
  } catch {
    refuse(
      "fetch-failed",
      "The locator is neither an https URL nor owner/repo@ref:path.",
    );
  }
  if (url.protocol !== "https:") refuse("blocked-origin", "Only https locators are accepted.");
  if (url.username !== "" || url.password !== "") {
    refuse("blocked-origin", "Locators that carry credentials are refused.");
  }
  if (url.port !== "" && url.port !== "443") refuse("blocked-origin", "Only the standard https port is accepted.");
  url.hash = "";
  const pathname = url.pathname.toLowerCase();
  const archive = ARCHIVE_SUFFIXES.find(([suffix]) => pathname.endsWith(suffix));
  if (archive !== undefined) return { kind: "archive", archive: archive[1], url: url.href };
  // A bundle directory: bundle.json and every member are fetched relative to it.
  if (!url.pathname.endsWith("/")) url.pathname += "/";
  return { kind: "directory", url: url.href };
}

// ---------------------------------------------------------------------------
// Destination policy: the workflow must not become a way into private networks

function ipv4Octets(address) {
  return address.split(".").map(Number);
}

function blockedIPv4(address) {
  const [a, b, c] = ipv4Octets(address);
  return (
    a === 0 // unspecified, "this network"
    || a === 10 // private
    || a === 127 // loopback
    || (a === 100 && b >= 64 && b <= 127) // carrier-grade NAT
    || (a === 169 && b === 254) // link-local
    || (a === 172 && b >= 16 && b <= 31) // private
    || (a === 192 && b === 0 && c === 0) // IETF protocol assignments
    || (a === 192 && b === 0 && c === 2) // documentation
    || (a === 192 && b === 88 && c === 99) // 6to4 relay anycast
    || (a === 192 && b === 168) // private
    || (a === 198 && (b === 18 || b === 19)) // benchmarking
    || (a === 198 && b === 51 && c === 100) // documentation
    || (a === 203 && b === 0 && c === 113) // documentation
    || a >= 224 // multicast, reserved, broadcast
  );
}

function expandIPv6(address) {
  let text = address.toLowerCase().split("%")[0];
  // An embedded IPv4 tail becomes two hextets.
  const tail = /(\d+\.\d+\.\d+\.\d+)$/.exec(text);
  if (tail !== null) {
    const [a, b, c, d] = ipv4Octets(tail[1]);
    text = text.slice(0, -tail[1].length)
      + `${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }
  const [head, rest] = text.split("::");
  const headParts = head === "" ? [] : head.split(":");
  const restParts = rest === undefined || rest === "" ? [] : rest.split(":");
  const fill = rest === undefined ? [] : Array(8 - headParts.length - restParts.length).fill("0");
  return [...headParts, ...fill, ...restParts].map((part) => Number.parseInt(part, 16));
}

function blockedIPv6(address) {
  const h = expandIPv6(address);
  if (h.length !== 8 || h.some((part) => Number.isNaN(part))) return true;
  const allZeroUntil = (n) => h.slice(0, n).every((part) => part === 0);
  if (allZeroUntil(8)) return true; // unspecified
  if (allZeroUntil(7) && h[7] === 1) return true; // loopback
  // IPv4-mapped (::ffff:a.b.c.d) and IPv4-compatible: judge the IPv4 inside.
  if (allZeroUntil(5) && (h[5] === 0xffff || h[5] === 0)) {
    return blockedIPv4(`${h[6] >> 8}.${h[6] & 0xff}.${h[7] >> 8}.${h[7] & 0xff}`);
  }
  if (h[0] === 0x64 && h[1] === 0xff9b) { // NAT64: judge the IPv4 inside
    return blockedIPv4(`${h[6] >> 8}.${h[6] & 0xff}.${h[7] >> 8}.${h[7] & 0xff}`);
  }
  return (
    (h[0] & 0xfe00) === 0xfc00 // unique local
    || (h[0] & 0xffc0) === 0xfe80 // link-local
    || (h[0] & 0xffc0) === 0xfec0 // site-local (deprecated)
    || (h[0] & 0xff00) === 0xff00 // multicast
    || (h[0] === 0x2001 && h[1] === 0x0db8) // documentation
    || (h[0] === 0x2001 && h[1] < 0x0200) // IETF protocol assignments, Teredo
    || h[0] === 0x2002 // 6to4, which can wrap a private IPv4
    || (h[0] === 0x0100 && h[1] === 0 && h[2] === 0 && h[3] === 0) // discard-only
  );
}

/** True when an address is anywhere the workflow must not reach. */
export function isBlockedAddress(address) {
  const family = isIP(address);
  if (family === 4) return blockedIPv4(address);
  if (family === 6) return blockedIPv6(address);
  return true;
}

/** Host names that never leave the machine, refused before any lookup. */
export function isBlockedHostname(hostname) {
  const host = hostname.toLowerCase().replace(/\.$/, "").replace(/^\[|\]$/g, "");
  if (isIP(host) !== 0) return isBlockedAddress(host);
  return (
    host === "localhost"
    || host.endsWith(".localhost")
    || host.endsWith(".local")
    || host.endsWith(".internal")
    || host.endsWith(".home.arpa")
    || !host.includes(".")
  );
}

// ---------------------------------------------------------------------------
// The checker line the bundle sealed

/** The packages a sealed verification line may name. Anything else is not run. */
export const CHECKER_PACKAGES = ["@colophon-claims/verify", "@colophon-claims/check"];
const EXACT_VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
export const BUNDLE_DIR_TOKEN = "<bundle-dir>";

/**
 * Parses the claim package's verification.command into the arguments npx is
 * given. The line must be `npx <checker>@<exact version> <bundle-dir>`: one
 * published checker at an exact release, and exactly one <bundle-dir>
 * placeholder, which is replaced by the fetched directory as one argument,
 * never through a shell. The package name is not rewritten.
 *
 * Only the published checker may run. The line comes from the submitted
 * bytes, and the workflow must not run a program a stranger chose.
 */
export function parseVerificationCommand(command) {
  if (typeof command !== "string" || command.trim() === "") {
    refuse("unknown-format", "claim-package.json carries no verification.command.");
  }
  const tokens = command.trim().split(/\s+/);
  if (tokens[0] !== "npx") {
    refuse("unknown-format", `verification.command does not start with npx: ${command}`);
  }
  const rest = tokens.slice(1);
  if (rest.filter((token) => token === BUNDLE_DIR_TOKEN).length !== 1) {
    refuse("unknown-format", `verification.command must carry exactly one ${BUNDLE_DIR_TOKEN}: ${command}`);
  }
  if (rest.length !== 2 || rest[1] !== BUNDLE_DIR_TOKEN) {
    refuse(
      "unknown-format",
      `verification.command must be "npx <checker>@<version> ${BUNDLE_DIR_TOKEN}" with no other arguments: ${command}`,
    );
  }
  const spec = rest[0];
  const at = spec.lastIndexOf("@");
  const name = at > 0 ? spec.slice(0, at) : spec;
  const version = at > 0 ? spec.slice(at + 1) : "";
  if (!CHECKER_PACKAGES.includes(name)) {
    refuse("unknown-format", `verification.command names ${name}, which is not the published checker.`);
  }
  if (!EXACT_VERSION.test(version)) {
    refuse("unknown-format", `verification.command must pin an exact checker release, got: ${spec}`);
  }
  return { spec, name, version, command };
}

/** The npx arguments for a parsed line, with the fetched directory in place. */
export function checkerArgs(parsed, bundleDir) {
  return parsed.command.trim().split(/\s+/).slice(1)
    .map((token) => (token === BUNDLE_DIR_TOKEN ? bundleDir : token));
}

/**
 * Reads the checker's own report of a pass: its first line says how many
 * checks passed out of how many ran, and its second names the bundle it read.
 * A pass is every check passing on the bundle the workflow fetched.
 */
export function readCheckerPass(stdout, bundleIdentity) {
  const lines = String(stdout).split("\n").map((line) => line.trim());
  const verdict = /^Verified: (\d+) of (\d+) checks passed$/.exec(lines[0] ?? "");
  const bundle = /^Bundle: sha256:([a-f0-9]{64})$/.exec(lines[1] ?? "");
  if (verdict === null || verdict[1] !== verdict[2] || Number(verdict[2]) === 0) {
    return { passed: false, reason: "the checker did not report every check passed" };
  }
  if (bundle === null || bundle[1] !== bundleIdentity) {
    return { passed: false, reason: "the checker reported a different bundle than the one fetched" };
  }
  return { passed: true, checks: Number(verdict[2]) };
}

// ---------------------------------------------------------------------------
// Slugs

const SLUG = /^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$|^[a-z0-9]$/;

export function isValidSlug(slug) {
  return typeof slug === "string" && SLUG.test(slug) && !slug.includes("--");
}

/**
 * The slug a listing gets. A free proposed slug is used. A proposed slug held
 * by the same bundle is a duplicate. Otherwise the listing takes `sha256-` and
 * the first twelve hex characters of its identity, extended until it is free.
 * An existing slug is never replaced.
 *
 * `listed` maps each existing slug to its bundle identity.
 */
export function assignSlug(proposed, bundleIdentity, listed) {
  for (const [slug, identity] of listed) {
    if (identity === bundleIdentity) {
      refuse("duplicate-identity", `This bundle is already listed at /reports/${slug}/.`);
    }
  }
  const notes = [];
  if (proposed !== null) {
    if (!isValidSlug(proposed)) {
      notes.push(`The proposed slug "${proposed}" is not lowercase letters, digits and single hyphens, so the listing takes one from its identity.`);
    } else if (!listed.has(proposed)) {
      return { slug: proposed, notes };
    } else {
      notes.push(`slug-collision: /reports/${proposed}/ is taken by a different bundle, so the listing takes one from its identity.`);
    }
  }
  for (let length = 12; length <= 64; length += 1) {
    const slug = `sha256-${bundleIdentity.slice(0, length)}`;
    if (!listed.has(slug)) return { slug, notes };
  }
  refuse("slug-collision", "No slug derived from this bundle's identity is free.");
}

// ---------------------------------------------------------------------------
// Append-only

/**
 * Checks that a change to the repository only adds one listing: new files
 * under data/reports/<slug>.json (and its supplied reading record) and under
 * public/reports/<slug>/, nothing modified, deleted or renamed, and nothing
 * else touched. `changes` is `git diff --name-status` output.
 */
export function checkAppendOnly(changes, slug) {
  const allowed = (path) => (
    path === `data/reports/${slug}.json`
    || path.startsWith(`public/reports/${slug}/`)
  );
  const problems = [];
  const lines = String(changes).split("\n").filter((line) => line.trim() !== "");
  for (const line of lines) {
    const [status, ...paths] = line.split("\t");
    if (status !== "A") {
      problems.push(`${status} ${paths.join(" -> ")}: listing only adds files`);
    } else if (!allowed(paths[0])) {
      problems.push(`A ${paths[0]}: outside this listing's own paths`);
    }
  }
  if (lines.length === 0) problems.push("the change adds nothing");
  if (!lines.some((line) => line === `A\tdata/reports/${slug}.json`)) {
    problems.push(`the change does not add data/reports/${slug}.json`);
  }
  return problems;
}
