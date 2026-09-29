import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runCloseAt } from "@/lib/bundle-facts";
import type { QualifiedReportData } from "@/lib/reports";

/**
 * The date a board row is ordered by, and what it is called.
 *
 * A row's date is the earlier of two times: the run's pre-registered close
 * (run.json `closeAt`, a Run record the published checker validates on these
 * formats) and the time the claim was listed on this site. Taking the earlier
 * means a claimant cannot date a row later than the moment it was listed, and
 * naming the field means the page never implies the run happened at the
 * listing time. Neither is a seal time.
 *
 * The listing time comes from the read model, where the front door's ingest
 * writes it. A report listed before that field existed takes the committer
 * time of the first main commit that carried its data file, recorded once in
 * data/listed-at.json with where it came from.
 */

export type RowDateField = "runCloseAt" | "listedAt";

export interface RowDate {
  field: RowDateField;
  /** The instant, as the record states it. */
  at: string;
  /** The UTC day, as printed. */
  day: string;
  /** What the page calls it. */
  label: "Run closed" | "Listed";
}

interface GrandfatheredListing {
  listedAt: string;
  source: string;
}

let grandfathered: Record<string, GrandfatheredListing> | null = null;

function grandfatheredListing(slug: string): GrandfatheredListing | undefined {
  grandfathered ??= JSON.parse(readFileSync(join(process.cwd(), "data", "listed-at.json"), "utf8")) as Record<
    string,
    GrandfatheredListing
  >;
  return grandfathered[slug];
}

/** When the claim was listed on this site. A listed claim with no listing time fails the build. */
export function listedAt(report: QualifiedReportData): string {
  const at = report.listing?.listedAt ?? grandfatheredListing(report.slug)?.listedAt;
  // A UTC instant only: a time with no zone would be read in the build host's.
  if (at === undefined || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/u.test(at) || Number.isNaN(Date.parse(at))) {
    throw new Error(`${report.slug}: no listing time; list it through the front door or record it in data/listed-at.json`);
  }
  return at;
}

export function rowDate(report: QualifiedReportData): RowDate {
  const closeAt = runCloseAt(report);
  const listed = listedAt(report);
  const field: RowDateField = Date.parse(closeAt) < Date.parse(listed) ? "runCloseAt" : "listedAt";
  const at = field === "runCloseAt" ? closeAt : listed;
  // The front door's ingest wrote a row date too. It must be this one.
  const written = report.listing?.rowDate;
  if (written !== undefined && (written.field !== field || Date.parse(written.at) !== Date.parse(at))) {
    throw new Error(`${report.slug}: the read model dates the row ${written.field} ${written.at}, the records ${field} ${at}`);
  }
  return {
    field,
    at,
    day: new Date(Date.parse(at)).toISOString().slice(0, 10),
    label: field === "runCloseAt" ? "Run closed" : "Listed",
  };
}

/** Newest first, by the instant, not the string. */
export function byRowDateDescending(left: RowDate, right: RowDate): number {
  return Date.parse(right.at) - Date.parse(left.at);
}
