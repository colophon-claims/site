import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

/** The read model emitted by scripts/ingest-report.mjs. Every field is
 * extracted from the published bundle's own records at ingest time. */
export interface HeadlineArm {
  n: number;
  pass?: number;
  passRate: string;
  wilsonInterval: { low: string; high: string };
}

export interface ReportData {
  slug: string;
  fixture: boolean;
  title: string;
  summary: string | null;
  taskSet: string | null;
  taskCount: number;
  replicates: number;
  venue: string;
  arms: { armId: string; pinning: Record<string, unknown> }[];
  method: { id: string; version: string; parameters: Record<string, unknown>; preregistered: boolean };
  lockedAt: string | null;
  reportedAt: string | null;
  headline: Record<string, HeadlineArm>;
  completeness: { expected: number; judged: number };
  attrition: Record<string, number>;
  conflicted: { count: number; cellKeys: string[] };
  assurance: {
    preset: string;
    resolved: { independence: string; minVerdicts: number; distinctEvaluator: boolean; verdictRule: string };
    disclosure: string;
  };
  disclosures: {
    integrityTierCounts: Record<string, number>;
    pinningUnverifiableCounts: Record<string, number>;
  };
  limitations: string[];
  rehearsal: { previewCount: number; timestamps: string[] } | null;
  verification: { command: string; checks: string[]; trustRoot: string };
  digests: {
    bundleIdentity: string;
    benchmarkSha256: string;
    runSha256: string;
    matrixSha256: string;
    reportSha256: string;
    reportEnvelopeSha256: string;
  };
  files: { path: string; bytes: number; sha256: string }[];
}

const dataDir = join(process.cwd(), "data", "reports");

export function listReports(): ReportData[] {
  if (!existsSync(dataDir)) return [];
  return readdirSync(dataDir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => JSON.parse(readFileSync(join(dataDir, name), "utf8")) as ReportData)
    .sort((a, b) => (b.reportedAt ?? "").localeCompare(a.reportedAt ?? ""));
}

export function getReport(slug: string): ReportData {
  const report = listReports().find((r) => r.slug === slug);
  if (report === undefined) throw new Error(`no ingested report for slug ${slug}`);
  return report;
}

export function shortDigest(sha256: string): string {
  return `sha256:${sha256.slice(0, 8)}…${sha256.slice(-4)}`;
}

export function formatPercent(rate: string): string {
  return `${(Number(rate) * 100).toFixed(1)}%`;
}

export function formatUtc(timestamp: string | null): string {
  return timestamp === null ? "" : timestamp.replace(/\.\d+/, "").replace("T", " ").replace("Z", " UTC");
}
