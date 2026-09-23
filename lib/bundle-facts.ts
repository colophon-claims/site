import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { QualifiedReportData } from "@/lib/reports";

/**
 * Facts a claim page prints that the read model does not carry, read at build
 * time from the published bundle itself (public/reports/<slug>/bundle/),
 * which is served byte for byte and never modified.
 *
 * Only three members are read: run.json and benchmark.json, for who owns the
 * run and wrote the method, and bundle.json, the bundle's file list, for its
 * size and file count. Each is hashed first and must match the digest the page
 * prints for it, so every fact taken from these bytes is tied to an ID a reader
 * can check. A mismatch throws and fails the build rather than printing a name,
 * a key or a size that the page's own IDs do not cover.
 *
 * Nothing here infers a claimant from where the claim is hosted. The records
 * name a signing key or they name nothing.
 */

interface RunRecord {
  owner?: unknown;
  closeAt?: unknown;
  venue?: { kind?: unknown };
}

interface MethodRecord {
  author?: unknown;
  name?: unknown;
  version?: unknown;
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

/**
 * What a board for this claim is keyed on. An official suite is keyed on its
 * suite identity; a method that is no official suite, like every method a
 * published claim carries today, is keyed on the digest of its locked method.
 */
export type BoardKey =
  | { kind: "locked-method"; digest: string };

export function boardKey(report: QualifiedReportData): BoardKey {
  return { kind: "locked-method", digest: report.digests.benchmarkSha256 };
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
