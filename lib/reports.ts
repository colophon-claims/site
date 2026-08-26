import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export const LEGACY_BUNDLE_FORMAT = "benchmark-product-public-bundle/1" as const;
export const EVIDENCE_BUNDLE_FORMAT = "benchmark-product-public-bundle/5" as const;
export const GROUPED_REPORT_FORMAT = "colophon-grouped-report/1" as const;

export interface BundleFile {
  path: string;
  bytes: number;
  sha256: string;
}

interface ReportDataBase {
  slug: string;
  fixture: boolean;
  title: string;
  summary: string | null;
  reportedAt: string | null;
  socialCardPath: string | null;
  files: BundleFile[];
}

export interface HeadlineArm {
  n: number;
  pass?: number;
  passRate: string;
  wilsonInterval: { low: string; high: string };
}

export interface LegacyReportData extends ReportDataBase {
  format: typeof LEGACY_BUNDLE_FORMAT;
  taskSet: string | null;
  taskCount: number;
  replicates: number;
  venue: string;
  arms: { armId: string; pinning: Record<string, unknown> }[];
  method: { id: string; version: string; parameters: Record<string, unknown>; preregistered: boolean };
  lockedAt: string | null;
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
}

export interface EvidenceReportData extends ReportDataBase {
  format: typeof EVIDENCE_BUNDLE_FORMAT;
  fixture: false;
  subject: {
    model: string;
    benchmark: { name: string; release: string; commit: string };
  };
  question: {
    instructionBytes: string;
    comparison: string;
    arms: { id: string; label: string; replicatesPerTask: number }[];
  };
  execution: {
    source: {
      benchmark: string;
      release: string;
      commit: string;
      upstreamRuntime: {
        name: string;
        version: string;
        usedForOfficialCells: boolean;
      };
      preservedPackageParts: string[];
    };
    armConstruction: {
      owner: string;
      transform: string;
      reason: string;
    };
    agentHarness: {
      name: string;
      location: string;
      heldConstantAcrossArms: boolean;
    };
    grading: {
      verifier: string;
      location: string;
    };
  };
  result: {
    unit: string;
    informativeTasks: number;
    estimatePpm: number;
    confidenceInterval95Ppm: { lower: number; upper: number };
    interpretation: string;
    methodStatement: string;
  };
  population: {
    flatTasks: number;
    funnel: { stage: string; tasks: number }[];
    officialFloor: { units: number; independenceClusters: number; met: boolean };
  };
  accounting: {
    expectedCells: number;
    cellsByArm: Record<string, number>;
    admittedCells: number;
    excludedCells: number;
    unavailableCells: number;
    failedHostOracles: {
      taskId: string;
      host: string;
      oracleReward: string;
      noOpReward: string;
    }[];
  };
  manipulationCheck: {
    cCells: number;
    cFullPass: number;
    cMeanPpm: number;
    abMeanPpm: number;
    upliftPpm: number;
  };
  limitations: string[];
  selfRunDisclosure: string;
  verification: {
    bundleFormat: typeof EVIDENCE_BUNDLE_FORMAT;
    checks: string[];
    command: string;
    readerAvailability: "available";
    reportEnvelopeSha256: string;
  };
  provenance: {
    internalRunId: string;
    declarationSha256: string;
    benchmarkSha256: string;
    analysisManifestSha256: string;
    cohortSha256: string;
    matrixSha256: string;
  };
  digests: {
    bundleIdentity: string;
    reportEnvelopeSha256: string;
    benchmarkSha256: string;
    analysisManifestSha256: string;
    cohortSha256: string;
    matrixSha256: string;
  };
}

export interface BinaryRate {
  numerator: number;
  denominator: number;
  estimate: string | null;
  wilsonInterval: { low: string; high: string } | null;
  withheldReason?: string;
}

export interface BinaryProjection {
  item: { expected: number; complete: number; excluded: number; unstable: number };
  call: { expected: number; evaluated: number; parseInvalid: number };
  confusion: {
    correctAccepted: number;
    correctRejected: number;
    wrongAccepted: number;
    wrongRejected: number;
  };
  agreement: BinaryRate;
  falseAccept: BinaryRate;
  falseReject: BinaryRate;
  instability: BinaryRate;
  parserInvalid: BinaryRate;
}

export interface BinaryQualification {
  configuration: {
    candidateClasses: string[];
    strata: string[];
    k: number;
    measurementProfile: string;
    parserInvalidPolicy: string;
    truthAdmission: string;
    [key: string]: unknown;
  };
  arms: Record<string, BinaryProjection & {
    instrumentSha256: string;
    byCandidateClass: Record<string, BinaryProjection>;
    byStratum: Record<string, BinaryProjection>;
  }>;
  excluded: { count: number; items: unknown[] };
  conflicted: { count: number; cellKeys: string[] };
}

export interface PairwiseDisagreement {
  pairs: Array<{
    armA: string;
    armB: string;
    n: number;
    disagreements: number;
    rate: string | null;
    interval: { lower: string; upper: string; alpha: string } | null;
    byCandidateClass: Array<{ candidateClass: string; n: number; disagreements: number; rate: string | null }>;
    byStratum: Array<{ stratum: string; n: number; disagreements: number; rate: string | null }>;
    exclusions: unknown[];
  }>;
  conflicted: { count: number; cellKeys: string[] };
}

export interface PairedMajorityDelta {
  baseline: string;
  candidate: string;
  n: number;
  delta: string | null;
  interval: { lower: string; upper: string; alpha: string } | null;
  reasons: string[];
  clusters: { count: number; manifest?: unknown };
  byCandidateClass: Array<{
    candidateClass: string;
    n: number;
    delta: string | null;
    interval: { lower: string; upper: string; alpha: string } | null;
    reasons: string[];
  }>;
  byStratum: Array<{
    stratum: string;
    n: number;
    delta: string | null;
    interval: { lower: string; upper: string; alpha: string } | null;
    reasons: string[];
  }>;
  exclusions: unknown[];
  conflicted: { count: number; cellKeys: string[] };
}

interface GroupedBundleBase {
  key: string;
  label: string;
  bundleFormat: string;
  bundleIdentity: string;
  method: { id: string; version: string; parameters: Record<string, unknown>; preregistered: boolean };
  reportSha256: string;
  verification: { command: string; compatibleCommand?: string; checks: string[]; trustRoot: string };
  limitations: string[];
  files: BundleFile[];
}

export interface GroupedReportData {
  format: typeof GROUPED_REPORT_FORMAT;
  slug: string;
  fixture: boolean;
  title: string;
  summary: string | null;
  reportedAt: string | null;
  lockedAt: string | null;
  socialCardPath: null;
  scope: {
    benchmarkSha256: string;
    taskCount: number;
    arms: Array<{ armId: string; pinning: Record<string, unknown> }>;
    replicates: number;
    venue: string;
  };
  digests: { runSha256: string; matrixSha256: string };
  bundles: Array<GroupedBundleBase & { result: BinaryQualification | PairwiseDisagreement | PairedMajorityDelta }>;
  licenseRegisterUrl: string;
}

export type ReportData = LegacyReportData | EvidenceReportData | GroupedReportData;

export function isGroupedReport(report: ReportData): report is GroupedReportData {
  return report.format === GROUPED_REPORT_FORMAT;
}

export function isEvidenceReport(report: ReportData): report is EvidenceReportData {
  return report.format === EVIDENCE_BUNDLE_FORMAT;
}

const dataDir = join(process.cwd(), "data", "reports");

export function listReports(): ReportData[] {
  if (!existsSync(dataDir)) return [];
  return readdirSync(dataDir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => JSON.parse(readFileSync(join(dataDir, name), "utf8")) as ReportData)
    .sort((left, right) => (right.reportedAt ?? "").localeCompare(left.reportedAt ?? ""));
}

export function getReport(slug: string): ReportData {
  const report = listReports().find((candidate) => candidate.slug === slug);
  if (report === undefined) throw new Error(`no ingested report for slug ${slug}`);
  return report;
}

export function shortDigest(digest: string): string {
  return `sha256:${digest.slice(0, 8)}…${digest.slice(-4)}`;
}

export function formatPercent(rate: string): string {
  return `${(Number(rate) * 100).toFixed(1)}%`;
}

export function formatRewardPpm(ppm: number): string {
  const value = (ppm / 1_000_000).toFixed(3);
  return value.startsWith("-") ? `−${value.slice(1)}` : value;
}

export function formatUtc(timestamp: string | null): string {
  return timestamp === null ? "" : timestamp.replace(/\.\d+/, "").replace("T", " ").replace("Z", " UTC");
}
