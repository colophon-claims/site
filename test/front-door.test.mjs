import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { assertProjectable, check } from "../scripts/front-door/check.mjs";
import { renderComment } from "../scripts/front-door/comment.mjs";
import { DOOR } from "../scripts/front-door/door.mjs";
import { fetchLocator, unpack } from "../scripts/front-door/fetch.mjs";
import {
  Refusal,
  assignSlug,
  checkAppendOnly,
  checkerArgs,
  isBlockedAddress,
  isBlockedHostname,
  parseLocator,
  parseVerificationCommand,
  readCheckerPass,
  readSubmission,
} from "../scripts/front-door/policy.mjs";

const siteRoot = fileURLToPath(new URL("../", import.meta.url));
const IDENTITY = "de169c04a24bbb4d9d5b52e398b8bfe92e939ba4d8a8c9e6e3e551cf10aa3774";
const OTHER = "0".repeat(64);

function refusedWith(code) {
  return (error) => error instanceof Refusal && error.code === code;
}

function scratch(context, prefix = "colophon-front-door-") {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  context.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

const formBody = (locator, slug = "_No response_") => `### Bundle locator\n\n${locator}\n\n### Proposed slug\n\n${slug}\n`;

test("the door is shut until a bundle the sealing tool emits can be listed", async (context) => {
  assert.equal(DOOR.open, false);
  const outDir = scratch(context);
  // A shut door answers before it reads the submission, so nothing is fetched.
  const result = await check({ body: formBody("https://127.0.0.1/"), outDir });
  assert.equal(result.outcome, "refused");
  assert.equal(result.code, "door-closed");
  assert.match(renderComment(result), /not open yet/);
  assert.doesNotMatch(DOOR.closedMessage, /—/);
});

test("the issue form's fields are read, and an empty slug is no slug", () => {
  assert.deepEqual(readSubmission(formBody("https://example.org/b/")), {
    locator: "https://example.org/b/",
    proposedSlug: null,
  });
  assert.deepEqual(readSubmission(formBody("owner/repo@main:claims/one", "my-claim")), {
    locator: "owner/repo@main:claims/one",
    proposedSlug: "my-claim",
  });
  assert.throws(() => readSubmission("no form here"), refusedWith("fetch-failed"));
  assert.throws(() => readSubmission(formBody("https://a.org/ https://b.org/")), refusedWith("fetch-failed"));
});

test("one locator, three syntaxes", () => {
  assert.deepEqual(parseLocator("https://example.org/claims/one"), {
    kind: "directory",
    url: "https://example.org/claims/one/",
  });
  assert.deepEqual(parseLocator("https://example.org/one.tar.gz"), {
    kind: "archive",
    archive: "tar",
    url: "https://example.org/one.tar.gz",
  });
  assert.equal(parseLocator("https://github.com/o/r/releases/download/v1/bundle.zip").archive, "zip");
  assert.deepEqual(parseLocator("octo/claims@v1.0:bundles/one/"), {
    kind: "github-tree",
    owner: "octo",
    repo: "claims",
    ref: "v1.0",
    path: "bundles/one",
  });
  assert.throws(() => parseLocator("octo/claims@main:../up"), refusedWith("fetch-failed"));
  assert.throws(() => parseLocator("not a locator"), refusedWith("fetch-failed"));
});

test("only public https destinations are fetched", async (context) => {
  assert.throws(() => parseLocator("http://example.org/b/"), refusedWith("blocked-origin"));
  assert.throws(() => parseLocator("file:///etc/passwd"), refusedWith("blocked-origin"));
  assert.throws(() => parseLocator("https://user:pw@example.org/b/"), refusedWith("blocked-origin"));
  assert.throws(() => parseLocator("https://example.org:8443/b/"), refusedWith("blocked-origin"));

  for (const address of [
    "127.0.0.1", "10.1.2.3", "172.16.0.1", "192.168.1.1", "169.254.169.254", "100.64.0.1",
    "0.0.0.0", "224.0.0.1", "255.255.255.255", "::1", "::", "fe80::1", "fc00::1", "fd12::1",
    "ff02::1", "::ffff:127.0.0.1", "::ffff:10.0.0.1", "64:ff9b::a00:1", "2001:db8::1", "2002:a00:1::",
    "168.63.129.16", "64:ff9b:1::1", "::ffff:0:a00:1",
  ]) {
    assert.equal(isBlockedAddress(address), true, address);
  }
  for (const address of ["140.82.112.3", "8.8.8.8", "2606:4700::1111", "::ffff:8.8.8.8"]) {
    assert.equal(isBlockedAddress(address), false, address);
  }
  for (const host of ["localhost", "a.localhost", "printer.local", "metadata.google.internal", "intranet", "[::1]", "127.0.0.1"]) {
    assert.equal(isBlockedHostname(host), true, host);
  }
  assert.equal(isBlockedHostname("example.org"), false);

  const parent = scratch(context);
  await assert.rejects(fetchLocator("https://127.0.0.1/b/", parent), refusedWith("blocked-origin"));
  await assert.rejects(fetchLocator("https://localhost/b/", parent), refusedWith("blocked-origin"));
});

test("only the published checker, at an exact release, is run", () => {
  const parsed = parseVerificationCommand("npx @colophon-claims/verify@0.2.1 <bundle-dir>");
  assert.equal(parsed.spec, "@colophon-claims/verify@0.2.1");
  // The fetched directory replaces the one placeholder as one argument.
  assert.deepEqual(checkerArgs(parsed, "/tmp/with space/bundle"), ["@colophon-claims/verify@0.2.1", "/tmp/with space/bundle"]);
  assert.equal(parseVerificationCommand("npx @colophon-claims/check@1.0.0-rc.1 <bundle-dir>").version, "1.0.0-rc.1");

  for (const command of [
    undefined,
    "",
    "npx @colophon-claims/verify@0.1 ./bundle", // no placeholder: the unpublished Demo-1 line
    "npx @colophon-claims/verify@0.2 <bundle-dir>", // a range, not a release
    "npx @colophon-claims/verify <bundle-dir>",
    "npx some-other-package@1.0.0 <bundle-dir>",
    "npx @colophon-claims/verify@0.2.1 <bundle-dir> <bundle-dir>",
    "npx @colophon-claims/verify@0.2.1 --json <bundle-dir>",
    "npx -p evil@1.0.0 @colophon-claims/verify@0.2.1 <bundle-dir>",
    "node -e 'boom' <bundle-dir>",
  ]) {
    assert.throws(() => parseVerificationCommand(command), refusedWith("unknown-format"), String(command));
  }
});

test("a pass is every check passing on the bundle that was fetched", () => {
  const stdout = `Verified: 7 of 7 checks passed\nBundle: sha256:${IDENTITY}\nFormat: benchmark-product-public-bundle/7\n`;
  assert.deepEqual(readCheckerPass(stdout, IDENTITY), { passed: true, checks: 7 });
  assert.equal(readCheckerPass(stdout, OTHER).passed, false);
  assert.equal(readCheckerPass(stdout.replace("7 of 7", "6 of 7"), IDENTITY).passed, false);
  assert.equal(readCheckerPass("", IDENTITY).passed, false);
});

test("slugs: a free proposal is used, a taken one falls back to the identity, a duplicate is refused", () => {
  const listed = new Map([["locomo-judge-report", IDENTITY]]);
  assert.deepEqual(assignSlug("my-claim", OTHER, listed), { slug: "my-claim", notes: [] });
  const collided = assignSlug("locomo-judge-report", OTHER, listed);
  assert.equal(collided.slug, `sha256-${OTHER.slice(0, 12)}`);
  assert.match(collided.notes[0], /^slug-collision/);
  assert.equal(assignSlug(null, OTHER, listed).slug, `sha256-${OTHER.slice(0, 12)}`);
  assert.equal(assignSlug("Bad Slug", OTHER, listed).slug, `sha256-${OTHER.slice(0, 12)}`);
  const crowded = new Map([[`sha256-${OTHER.slice(0, 12)}`, "f".repeat(64)]]);
  assert.equal(assignSlug(null, OTHER, crowded).slug, `sha256-${OTHER.slice(0, 13)}`);
  assert.throws(
    () => assignSlug("anything", IDENTITY, listed),
    (error) => refusedWith("duplicate-identity")(error) && error.message.includes("/reports/locomo-judge-report/"),
  );
});

test("a listing only adds its own files", () => {
  const good = "A\tdata/reports/one.json\nA\tpublic/reports/one/bundle/bundle.json\n";
  assert.deepEqual(checkAppendOnly(good, "one"), []);
  assert.equal(checkAppendOnly("M\tdata/reports/locomo-judge-report.json\nA\tdata/reports/one.json\n", "one").length, 1);
  assert.equal(checkAppendOnly(`${good}A\tapp/page.tsx\n`, "one").length, 1);
  assert.equal(checkAppendOnly(`${good}D\tpublic/reports/two/bundle/x\n`, "one").length, 1);
  assert.equal(checkAppendOnly("A\tpublic/reports/one/bundle/bundle.json\n", "one").length, 1);
  assert.equal(checkAppendOnly("", "one").length, 2);
});

test("an archive carrying a link is refused before anything is unpacked", (context) => {
  const dir = scratch(context);
  const source = join(dir, "source");
  mkdirSync(join(source, "bundle"), { recursive: true });
  writeFileSync(join(source, "bundle", "bundle.json"), "{}");
  symlinkSync("/etc", join(source, "bundle", "escape"));
  const archive = join(dir, "bundle.tar");
  assert.equal(spawnSync("tar", ["-cf", archive, "-C", source, "bundle"]).status, 0);
  assert.throws(() => unpack(archive, "tar", join(dir, "out")), refusedWith("unknown-format"));

  rmSync(join(source, "bundle", "escape"));
  const clean = join(dir, "clean.tar");
  assert.equal(spawnSync("tar", ["-cf", clean, "-C", source, "bundle"]).status, 0);
  unpack(clean, "tar", join(dir, "clean-out"));
  assert.equal(readFileSync(join(dir, "clean-out", "bundle", "bundle.json"), "utf8"), "{}");
});

test("a refusal shows the checker's own output", () => {
  const comment = renderComment({
    outcome: "refused",
    code: "check-failed",
    message: "@colophon-claims/verify@0.2.1 did not pass this bundle. Nothing was listed.",
    checker: {
      command: "npx @colophon-claims/verify@0.2.1 <bundle-dir>",
      exitCode: 1,
      stdout: { text: "manifest    failed\n", truncated: false },
      stderr: { text: "bundle.json lists a file that is not there", truncated: true },
    },
  });
  assert.match(comment, /\*\*Not listed\*\* \(`check-failed`\)/);
  assert.match(comment, /manifest {4}failed/);
  assert.match(comment, /cut at 60,000 characters/);
  const pass = renderComment({ outcome: "pass", slug: "one", checks: 7, notes: [], checker: { command: "npx @colophon-claims/verify@0.2.1 <bundle-dir>", stdout: { text: "Verified: 7 of 7 checks passed", truncated: false } } }, "https://github.com/colophon-claims/site/pull/1");
  // A pass is not a listing until its pull request merges.
  assert.match(pass, /^\*\*Checked\.\*\*/);
  assert.match(pass, /listed when it merges/);
  assert.doesNotMatch(comment, /—/);
});

test("ingest records the listing: provenance, listing time, board key, venue and the row's date", (context) => {
  // The reading record names its own slug, so each ingest gets its own site.
  const slug = "locomo-judge-report";
  const bundle = join(siteRoot, "public", "reports", slug, "bundle");
  let root;
  const ingest = (listing) => {
    root = scratch(context, "colophon-listing-");
    cpSync(join(siteRoot, "scripts"), join(root, "scripts"), { recursive: true });
    const listingFile = join(root, "listing.json");
    writeFileSync(listingFile, JSON.stringify(listing));
    return spawnSync(process.execPath, [
      join(root, "scripts", "ingest-report.mjs"), bundle, "--slug", slug,
      "--presentation", join(siteRoot, "data", "reports", "locomo-judge-report.presentation.json"),
      "--listing", listingFile,
    ], { encoding: "utf8" });
  };

  const late = ingest({
    listedAt: "2026-09-30T12:00:00Z",
    locator: "octo/claims@main:locomo",
    syntax: "github-tree",
    resolvedCommit: "a".repeat(40),
    submission: "https://github.com/colophon-claims/site/issues/99",
  });
  assert.equal(late.status, 0, late.stderr);
  const data = JSON.parse(readFileSync(join(root, "data", "reports", `${slug}.json`), "utf8"));
  assert.deepEqual(data.listing, {
    listedAt: "2026-09-30T12:00:00Z",
    locator: "octo/claims@main:locomo",
    locatorSyntax: "github-tree",
    resolvedCommit: "a".repeat(40),
    submission: "https://github.com/colophon-claims/site/issues/99",
    boardKey: { kind: "locked-method", digest: data.digests.benchmarkSha256 },
    venue: "self-run",
    // The run closed before it was listed, so the row is dated by its close.
    rowDate: { field: "runCloseAt", at: "2026-08-29T16:30:51.384Z" },
  });
  assert.equal(data.digests.bundleIdentity, IDENTITY);

  // Listed before the run closed: the row takes the listing time, so no row
  // is dated later than the moment it was listed.
  const early = ingest({ listedAt: "2026-08-01T00:00:00Z", locator: "https://example.org/b/", syntax: "directory" });
  assert.equal(early.status, 0, early.stderr);
  const earlyData = JSON.parse(readFileSync(join(root, "data", "reports", `${slug}.json`), "utf8"));
  assert.deepEqual(earlyData.listing.rowDate, { field: "listedAt", at: "2026-08-01T00:00:00Z" });
  assert.equal(earlyData.listing.resolvedCommit, null);

  const noCommit = ingest({ listedAt: "2026-09-30T12:00:00Z", locator: "o/r@main:x", syntax: "github-tree" });
  assert.notEqual(noCommit.status, 0);
  assert.match(noCommit.stderr, /resolved commit/);
});

test("the check refuses a /5 bundle as an unknown format and names /7 and /8", () => {
  const manifest = { format: "benchmark-product-public-bundle/5", files: [{ path: "presentation.json" }] };
  assert.throws(
    () => assertProjectable(manifest, {}),
    (error) => refusedWith("unknown-format")(error)
      && /benchmark-product-public-bundle\/5/u.test(error.message)
      && /benchmark-product-public-bundle\/7/u.test(error.message)
      && /benchmark-product-public-bundle\/8/u.test(error.message)
      && !/—/u.test(error.message),
  );
  // /7 and /8 pass this gate.
  for (const format of ["benchmark-product-public-bundle/7", "benchmark-product-public-bundle/8"]) {
    assert.doesNotThrow(() => assertProjectable({ format, files: [{ path: "presentation.json" }] }, {}));
  }
});
