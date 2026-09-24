import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { QualifiedReportData } from "@/lib/reports";

/**
 * Facts a claim page prints that the read model does not carry, read at build
 * time from the published bundle itself (public/reports/<slug>/bundle/),
 * which is served byte for byte and never modified.
 *
 * The claim page reads three members: run.json and benchmark.json, for who
 * owns the run and wrote the method, and bundle.json, the bundle's file list,
 * for its size and file count. Each is hashed first and must match the digest
 * the page prints for it, so every fact taken from these bytes is tied to an ID
 * a reader can check. A mismatch throws and fails the build rather than
 * printing a name, a key or a size that the page's own IDs do not cover.
 *
 * A board reads more of the same bundle through `sealedMember`: any member the
 * file list names, hashed against the SHA-256 that list records for it (and
 * against the page's own ID for it, where the read model prints one). The file
 * list is itself tied to the evidence ID, so the chain ends at an ID the claim
 * page prints.
 *
 * Nothing here infers a claimant from where the claim is hosted. The records
 * name a signing key or they name nothing.
 */

interface RunRecord {
  owner?: unknown;
  closeAt?: unknown;
  venue?: { kind?: unknown };
  arms?: unknown;
}

interface MethodRecord {
  author?: unknown;
  name?: unknown;
  version?: unknown;
  description?: unknown;
  items?: unknown;
}

interface ManifestRecord {
  format?: unknown;
  files?: unknown;
}

interface SealedFacts {
  run: RunRecord;
  method: MethodRecord;
  manifest: {
    format: string;
    files: number;
    bytes: number;
    ownBytes: number;
  };
}

const cache = new Map<string, SealedFacts>();

function sha256Hex(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function readTied(report: QualifiedReportData, path: string, expected: string, label: string): Buffer {
  const bytes = readFileSync(join(process.cwd(), "public", "reports", report.slug, "bundle", path));
  const actual = sha256Hex(bytes);
  if (actual !== expected) {
    throw new Error(
      `${report.slug}: bundle/${path} hashes to ${actual}, but the page prints ${expected} as the`
      + ` ${label}. Refusing to print facts from bytes the page's own IDs do not cover.`,
    );
  }
  return bytes;
}

function sealedFacts(report: QualifiedReportData): SealedFacts {
  const cached = cache.get(report.slug);
  if (cached !== undefined) return cached;

  const run = JSON.parse(
    readTied(report, "run.json", report.digests.runSha256, "run record's ID").toString("utf8"),
  ) as RunRecord;
  const method = JSON.parse(
    readTied(report, "benchmark.json", report.digests.benchmarkSha256, "locked method's ID").toString("utf8"),
  ) as MethodRecord;
  const manifestBytes = readTied(report, "bundle.json", report.digests.bundleIdentity, "evidence ID");
  const manifest = JSON.parse(manifestBytes.toString("utf8")) as ManifestRecord;

  const format = manifest.format;
  if (typeof format !== "string" || format !== report.format) {
    throw new Error(`${report.slug}: bundle.json names format ${String(format)}, not ${report.format}`);
  }
  if (!Array.isArray(manifest.files)) {
    throw new Error(`${report.slug}: bundle.json carries no file list`);
  }
  let bytes = 0;
  for (const file of manifest.files as { bytes?: unknown }[]) {
    if (typeof file?.bytes !== "number" || !Number.isInteger(file.bytes) || file.bytes < 0) {
      throw new Error(`${report.slug}: bundle.json lists a file with no byte length`);
    }
    bytes += file.bytes;
  }

  // The venue the page prints comes from the read model; the sealed run record
  // must say the same thing.
  if (run.venue?.kind !== report.execution.venue) {
    throw new Error(
      `${report.slug}: run.json names venue ${String(run.venue?.kind)}, the read model ${report.execution.venue}`,
    );
  }
  // The page prints the reading record's seal time. It must be the run
  // record's own close time, to the second, or the page would print a time no
  // sealed record states.
  if (typeof run.closeAt !== "string" || toSecond(run.closeAt) !== toSecond(report.reportedAt)) {
    throw new Error(
      `${report.slug}: the reading record's seal time ${report.reportedAt} is not run.json's close time`
      + ` ${String(run.closeAt)}`,
    );
  }

  const facts: SealedFacts = {
    run,
    method,
    manifest: {
      format,
      files: manifest.files.length,
      bytes,
      ownBytes: manifestBytes.length,
    },
  };
  cache.set(report.slug, facts);
  return facts;
}

function toSecond(timestamp: string): string {
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return `invalid:${timestamp}`;
  return parsed.toISOString().slice(0, 19);
}

function nonEmpty(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

/**
 * Who the claim is by, as far as the sealed records say. No record carries a
 * claimant name today, so `named` is never returned yet; it is the slot a
 * named field fills when one exists. Until then the page shows the key the run
 * record names as its owner, or says the records name nobody.
 */
export type Claimant =
  | { kind: "named"; value: string }
  | { kind: "signing-key"; value: string }
  | { kind: "not-stated"; value: null };

export function claimant(report: QualifiedReportData): Claimant {
  const owner = nonEmpty(sealedFacts(report).run.owner);
  return owner === null ? { kind: "not-stated", value: null } : { kind: "signing-key", value: owner };
}

/**
 * The run record's close time (run.json `closeAt`). The build has already
 * checked that it is the seal time the reading record gives, to the second.
 */
export function runCloseAt(report: QualifiedReportData): string {
  const closeAt = sealedFacts(report).run.closeAt;
  if (typeof closeAt !== "string") throw new Error(`${report.slug}: run.json carries no close time`);
  return closeAt;
}

/** The key benchmark.json names as the method's author, or null. */
export function methodAuthor(report: QualifiedReportData): string | null {
  return nonEmpty(sealedFacts(report).method.author);
}

/** The locked method's own name (benchmark.json `name`), or null. */
export function methodName(report: QualifiedReportData): string | null {
  return nonEmpty(sealedFacts(report).method.name);
}

/** The locked method's own version (benchmark.json `version`), or null. */
export function methodVersion(report: QualifiedReportData): string | null {
  return nonEmpty(sealedFacts(report).method.version);
}

/** How many items the locked method fixes (benchmark.json `items`), or null. */
export function methodItemCount(report: QualifiedReportData): number | null {
  const items = sealedFacts(report).method.items;
  return Array.isArray(items) ? items.length : null;
}

/** The locked method's own description (benchmark.json `description`), or null. */
export function methodDescription(report: QualifiedReportData): string | null {
  return nonEmpty(sealedFacts(report).method.description);
}

/**
 * The digests of the items the locked method fixes, in the method's own order
 * (benchmark.json `items[].task.digest.sha256`). Throws on an item it cannot
 * read rather than dropping it.
 */
export function methodTaskDigests(report: QualifiedReportData): string[] {
  const items = sealedFacts(report).method.items;
  if (!Array.isArray(items)) throw new Error(`${report.slug}: benchmark.json lists no items`);
  return items.map((item: { task?: { digest?: { sha256?: unknown } } }, index) => {
    const digest = item?.task?.digest?.sha256;
    if (typeof digest !== "string" || !/^[0-9a-f]{64}$/u.test(digest)) {
      throw new Error(`${report.slug}: benchmark.json item ${index + 1} names no task digest`);
    }
    return digest;
  });
}

/**
 * One arm as the sealed run record pins it (run.json `arms[]`): its ID and the
 * judge model, harness and grading prompt it was pinned to. The pinning keys
 * are protocol identifiers; only their values are returned.
 */
export interface SealedArm {
  armId: string;
  model: string | null;
  harness: { id: string; version: string } | null;
  instrumentSha256: string | null;
}

export function runArms(report: QualifiedReportData): SealedArm[] {
  const arms = sealedFacts(report).run.arms;
  if (!Array.isArray(arms)) throw new Error(`${report.slug}: run.json lists no arms`);
  return arms.map((arm: { armId?: unknown; pinning?: Record<string, unknown> }, index) => {
    const armId = nonEmpty(arm?.armId);
    if (armId === null) throw new Error(`${report.slug}: run.json arm ${index + 1} has no ID`);
    const pinning = arm.pinning ?? {};
    const model = pinning.model as { id?: unknown } | undefined;
    const harness = pinning.harness as { id?: unknown; version?: unknown } | undefined;
    const instrument = Object.entries(pinning).find(([name]) => name.endsWith(".instrument"))?.[1];
    return {
      armId,
      model: nonEmpty(model?.id),
      harness: nonEmpty(harness?.id) !== null && nonEmpty(harness?.version) !== null
        ? { id: String(harness?.id), version: String(harness?.version) }
        : null,
      instrumentSha256: typeof instrument === "string" ? instrument.replace(/^sha256:/u, "") : null,
    };
  });
}

/**
 * What a board for this claim is keyed on. An official suite is keyed on its
 * suite identity, whatever coverage a claim declared; a method that is no
 * official suite is keyed on the digest of its locked method. The claimant's
 * agent is never part of either key. No read model records a suite identity
 * yet, so every published claim today is keyed on its locked method.
 */
export type BoardKey =
  | { kind: "official-suite"; suite: string }
  | { kind: "locked-method"; digest: string };

export function boardKey(report: QualifiedReportData): BoardKey {
  return { kind: "locked-method", digest: report.digests.benchmarkSha256 };
}

/**
 * The venue as the sealed run record names it, in the two words the site uses:
 * Self-run (the claimant controlled dispatch, execution and evaluation) or
 * Colophon-run (Colophon did, on a venue the claimant did not control). Only
 * the kinds a published record has used are mapped; any other kind fails the
 * build rather than print a venue no record states. Neither word says the
 * record proved the parties independent.
 */
export type VenueLabel = "Self-run" | "Colophon-run";

const VENUE_LABELS: Record<string, VenueLabel> = {
  "self-run": "Self-run",
};

export function venueLabel(venue: string): VenueLabel {
  const label = VENUE_LABELS[venue];
  if (label === undefined) {
    throw new Error(`no reader label for venue ${venue}; add one before publishing this claim`);
  }
  return label;
}

/**
 * The bundle's own file list as a map from path to SHA-256. bundle.json is
 * read through the same hash check as above, against the evidence ID.
 */
const listedCache = new Map<string, Map<string, string>>();

function listedFiles(report: QualifiedReportData): Map<string, string> {
  const cached = listedCache.get(report.slug);
  if (cached !== undefined) return cached;
  const manifest = JSON.parse(
    readTied(report, "bundle.json", report.digests.bundleIdentity, "evidence ID").toString("utf8"),
  ) as ManifestRecord;
  const listed = new Map<string, string>();
  for (const file of (Array.isArray(manifest.files) ? manifest.files : []) as { path?: unknown; sha256?: unknown }[]) {
    if (typeof file?.path !== "string" || typeof file.sha256 !== "string") {
      throw new Error(`${report.slug}: bundle.json lists a file with no path or SHA-256`);
    }
    listed.set(file.path, file.sha256);
  }
  listedCache.set(report.slug, listed);
  return listed;
}

/** The SHA-256 the bundle's file list records for a path, or null if it lists no such file. */
export function listedDigest(report: QualifiedReportData, path: string): string | null {
  return listedFiles(report).get(path) ?? null;
}

/**
 * A member the bundle's file list names, read only after its bytes hash to the
 * SHA-256 that list records for it. Where the read model prints its own ID for
 * the member (the run record, the method, the result matrix, the report), the
 * list's entry must be that same ID.
 */
const PRINTED_IDS: Record<string, (report: QualifiedReportData) => string> = {
  "run.json": (report) => report.digests.runSha256,
  "benchmark.json": (report) => report.digests.benchmarkSha256,
  "matrix.json": (report) => report.digests.matrixSha256,
  "report.json": (report) => report.digests.reportSha256,
  "report-envelope.json": (report) => report.digests.reportEnvelopeSha256,
};

export function sealedMember(report: QualifiedReportData, path: string): Buffer {
  const listed = listedDigest(report, path);
  if (listed === null) throw new Error(`${report.slug}: bundle.json lists no ${path}`);
  const printed = PRINTED_IDS[path]?.(report);
  if (printed !== undefined && printed !== listed) {
    throw new Error(`${report.slug}: bundle.json lists ${path} as ${listed}, the page prints ${printed}`);
  }
  return readTied(report, path, listed, `file-list entry for ${path}`);
}

/**
 * The bundle as a reader downloads it: the files bundle.json lists plus
 * bundle.json itself, and their total size in bytes.
 */
export interface BundleSize {
  format: string;
  listedFiles: number;
  listedBytes: number;
  files: number;
  bytes: number;
}

export function bundleSize(report: QualifiedReportData): BundleSize {
  const { manifest } = sealedFacts(report);
  return {
    format: manifest.format,
    listedFiles: manifest.files,
    listedBytes: manifest.bytes,
    files: manifest.files + 1,
    bytes: manifest.bytes + manifest.ownBytes,
  };
}

/**
 * A signing key, shortened for a byline: the did:key prefix dropped, the start
 * and the end of the key kept. The full key is always printed beside it.
 */
export function shortKey(did: string): string {
  const key = did.startsWith("did:key:") ? did.slice("did:key:".length) : did;
  return key.length <= 18 ? key : `${key.slice(0, 10)}…${key.slice(-6)}`;
}
