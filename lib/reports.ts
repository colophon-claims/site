import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export const LEGACY_BUNDLE_FORMAT = "benchmark-product-public-bundle/1" as const;
export const EVIDENCE_BUNDLE_FORMAT = "benchmark-product-public-bundle/5" as const;
export const QUALIFIED_BUNDLE_FORMAT = "benchmark-product-public-bundle/7" as const;
export const DISCLOSED_BUNDLE_FORMAT = "benchmark-product-public-bundle/8" as const;
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

/* ---------- anchored binary-qualification bundles (/7 and /8) ---------- */

/**
 * One carried third-party time proof, verbatim from the claim package. `facts`
 * holds only what is embedded in the proof's own bytes: `pending` for a
 * calendar-only OpenTimestamps proof, `blockHeight` once it is attested, and
 * the RFC 3161 fields for an authority token. The site reads that state and
 * evaluates nothing: trust material is the reader's, never the bundle's.
 */
export interface IntegrityAnchor {
  subject: string;
  kind: string;
  provider: string;
  recordSha256: string;
  facts: {
    pending?: boolean;
    blockHeight?: number;
    genTime?: string;
    policyOid?: string;
    serialNumber?: string;
    signerCertificateSha256?: string;
  };
}

export type DisclosureVariableKey =
  | "ingestion-model"
  | "retrieval-config"
  | "answer-model"
  | "answer-prompt"
  | "judge-model"
  | "judge-prompt";

export type DisclosureVariableStatus =
  | "measured-here"
  | "disclosed-by-publisher"
  | "undisclosed";

export type DisclosureUndisclosedReason =
  | "not-stated"
  | "stated-without-identifiers"
  | "outside-this-experiment";

/**
 * The status is a statement about who did the work and where the bytes are. It
 * is not a tier and not a confidence score, and it is the only field a renderer
 * may use to decide how a variable is presented.
 */
export type DisclosureVariableEntry =
  | {
    status: "measured-here";
    statement: string;
    evidence: { role: "pinned-configuration" | "execution-observation"; digest: { sha256: string } }[];
  }
  | { status: "disclosed-by-publisher"; statement: string; sources?: { uri: string }[] }
  | { status: "undisclosed"; reason: DisclosureUndisclosedReason };

export interface DisclosureSpecification {
  recordSha256: string;
  recordPath: string;
  specification: string;
  subjectSha256: string;
  subjectKind: string;
  author: string;
  variables: Record<DisclosureVariableKey, DisclosureVariableEntry>;
}

/** A proportion as the sealed Report carries it: counts as numbers, the rate
 * and its interval bounds as fixed-precision decimal strings. */
export interface Proportion {
  numerator: number;
  denominator: number;
  estimate: string;
  wilsonInterval: { low: string; high: string };
}

export type NarrativeBlock =
  | { kind: "paragraph"; text: string; strong?: boolean }
  | { kind: "heading"; text: string }
  | { kind: "list"; items: string[]; ordered?: boolean }
  | { kind: "table"; columns: string[]; rows: string[][] };

export interface NarrativeSection {
  /** Where the page places this section among the instrument sections. */
  slot: string;
  heading: string | null;
  blocks: NarrativeBlock[];
}

export interface DerivedFigures {
  agreementLow: string;
  agreementHigh: string;
  agreementSpreadPoints: string;
  vagueWrongAcceptLow: string;
  vagueWrongAcceptHigh: string;
  rightAnswersScored: number;
  rightAnswersRejected: number;
  pairedItems: number;
  plainPromptAgreement: string;
  evidencePromptAgreement: string;
  repeatDisagreementOverall: string;
  repeatDisagreementWorst: string;
  evidenceAcceptanceDeltaPoints: string;
  evidenceAcceptanceDirection: "more" | "fewer" | "same";
}

export interface QualifiedReportData {
  format: typeof QUALIFIED_BUNDLE_FORMAT | typeof DISCLOSED_BUNDLE_FORMAT;
  slug: string;
  fixture: false;
  title: string;
  summary: string;
  reportedAt: string;
  socialCardPath: string;
  subject: {
    judgeModel: string;
    harness: { id: string; version: string };
    benchmark: { name: string; description: string; sha256: string };
    arms: { id: string; label: string; instrumentSha256: string }[];
  };
  question: {
    designUrl: string;
    postedOn: string;
    preRegistered: { id: string; question: string; answer: string; provenBy: string }[];
  };
  execution: {
    judgePrompts: { count: number; provenance: string };
    modelSnapshot: { id: string; temperature: string; profile: string };
    replicates: number;
    reduction: string;
    abstainPolicy: { parserInvalid: string; description: string };
    intervals: string;
    truthAdmission: string;
    venue: string;
  };
  result: {
    primary: string;
    perArm: {
      armId: string;
      agreement: Proportion;
      acceptsSpecificWrong: Proportion;
      acceptsVagueTopicalWrong: Proportion;
      rejectsCorrect: Proportion;
    }[];
    spread: { lowestArmId: string; highestArmId: string; pointsBetween: string };
    interpretation: string;
    methodStatement: string;
  };
  population: {
    items: number;
    perCandidateClass: { candidateClass: string; items: number }[];
    perStratum: { stratum: string; items: number }[];
    labels: string;
  };
  accounting: {
    cells: { expected: number; judged: number; lost: number };
    parserNeutral: { calls: number; denominator: number; policy: string; note: string };
    excludedItems: { count: number; byArm: { armId: string; items: number }[] };
    completenessFloor: string;
    runOutcome: string;
  };
  manipulationCheck: {
    replicateInstability: { unstableItems: number; gradedItems: number };
    conflictedCells: number;
    companionChecks: { name: string; finding: string; provenBy: string }[];
  };
  limitations: string[];
  selfRunDisclosure: string;
  verification: {
    bundleFormat: typeof QUALIFIED_BUNDLE_FORMAT | typeof DISCLOSED_BUNDLE_FORMAT;
    checks: string[];
    command: string;
    compatibleCommand: string;
    readerAvailability: "available";
    reportEnvelopeSha256: string;
    reportSha256: string;
  };
  provenance: {
    runSha256: string;
    benchmarkSha256: string;
    matrixSha256: string;
    reportSha256: string;
    reportEnvelopeSha256: string;
    anchors: { subject: string; provider: string; recordSha256: string }[];
    siblingAnalyses: { method: string; version: string; reportSha256: string }[];
    companionBundles: { name: string; runSha256: string; matrixSha256: string; bundleIdentity: string }[];
  };
  /** The report's own prose, carried verbatim from the canonical text and
   * rendered in reading order around the instrument sections. Null when the
   * reading record carries only the instrument reading. */
  narrative: NarrativeSection[] | null;
  /** Figures the prose states that this bundle's sealed records re-derive. The
   * validator recomputes each and checks it against the carried prose. */
  derivedFigures: DerivedFigures | null;
  /** How the public reading record reached the page. `sealed-bundle-member`
   * means the bundle's own manifest binds it; `supplied-at-ingest` means it was
   * handed to the ingester and published beside this read model, leaving the
   * bundle byte-for-byte the artifact its run produced. */
  presentationSource: {
    carriage: "sealed-bundle-member" | "supplied-at-ingest";
    sha256: string;
    path: string;
  };
  anchors: IntegrityAnchor[];
  /** Present only on the disclosed closure; `/7` carries no sealed declaration. */
  disclosure: DisclosureSpecification | null;
  digests: {
    bundleIdentity: string;
    reportEnvelopeSha256: string;
    benchmarkSha256: string;
    runSha256: string;
    matrixSha256: string;
    reportSha256: string;
  };
  /** The fixed members only. These bundles carry tens of thousands of evidence
   * records; the complete manifest is `bundle.json`, served under the report. */
  canonicalFiles: BundleFile[];
  memberCounts: { total: number; records: number; anchors: number; native: number };
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

export type ReportData =
  | LegacyReportData
  | EvidenceReportData
  | QualifiedReportData
  | GroupedReportData;

export function isGroupedReport(report: ReportData): report is GroupedReportData {
  return report.format === GROUPED_REPORT_FORMAT;
}

export function isEvidenceReport(report: ReportData): report is EvidenceReportData {
  return report.format === EVIDENCE_BUNDLE_FORMAT;
}

export function isQualifiedReport(report: ReportData): report is QualifiedReportData {
  return report.format === QUALIFIED_BUNDLE_FORMAT || report.format === DISCLOSED_BUNDLE_FORMAT;
}

export function isDisclosedReport(report: ReportData): boolean {
  return report.format === DISCLOSED_BUNDLE_FORMAT;
}

const DISCLOSURE_VARIABLE_LABELS: Record<DisclosureVariableKey, string> = {
  "ingestion-model": "Ingestion model",
  "retrieval-config": "Retrieval config",
  "answer-model": "Answer model",
  "answer-prompt": "Answer prompt",
  "judge-model": "Judge model",
  "judge-prompt": "Judge prompt",
};

/** The frozen order the standard states the six variables in. */
export const DISCLOSURE_VARIABLE_KEYS: DisclosureVariableKey[] = [
  "ingestion-model",
  "retrieval-config",
  "answer-model",
  "answer-prompt",
  "judge-model",
  "judge-prompt",
];

export function disclosureVariableLabel(key: DisclosureVariableKey): string {
  return DISCLOSURE_VARIABLE_LABELS[key];
}

const dataDir = join(process.cwd(), "data", "reports");

export function listReports(): ReportData[] {
  if (!existsSync(dataDir)) return [];
  return readdirSync(dataDir)
    // `<slug>.presentation.json` is a report's reading record, published beside
    // its read model. It is not itself a report.
    .filter((name) => name.endsWith(".json") && !name.endsWith(".presentation.json"))
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
