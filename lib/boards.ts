import {
  boardKey,
  claimant,
  listedDigest,
  methodAuthor,
  methodDescription,
  methodItemCount,
  methodName,
  methodTaskDigests,
  methodVersion,
  runArms,
  sealedMember,
  venueLabel,
  type BoardKey,
  type Claimant,
  type VenueLabel,
} from "@/lib/bundle-facts";
import { formatPercent, isQualifiedReport, listReports, type QualifiedReportData } from "@/lib/reports";

/**
 * Boards, grouped from the listed claims in data/reports/ at build time.
 *
 * A board is a view over the claims sealed on one official suite (keyed on the
 * suite identity, whatever coverage each claim declared) or on one locked
 * method that is no official suite (keyed on the digest of that method). The
 * claimant's agent is never part of the key. A board exists because at least
 * one listed claim brought its suite or method; nothing here authors one.
 *
 * Every figure a board prints is read from the claim's read model and checked
 * against the sealed bundle it was ingested from (lib/bundle-facts). A figure
 * the two disagree on fails the build.
 */

/** A board's address: /boards/<slug>/. */
export function boardHref(slug: string): string {
  return `/boards/${slug}/`;
}

/**
 * The slug a board is served under. An official suite's comes from its suite
 * identity; a locked method's from the method's own sealed name
 * (benchmark.json `name`), or from its digest when the method names itself
 * nothing. Lower case, ASCII letters and digits, runs of anything else become
 * one hyphen. listBoards() refuses two boards that map to one slug.
 */
export function boardSlug(key: BoardKey, sealedName: string | null): string {
  const source = key.kind === "official-suite"
    ? key.suite
    : sealedName ?? `locked-method-${key.digest.slice(0, 16)}`;
  const slug = source
    .normalize("NFKD")
    .replace(/[̀-ͯ]/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
  if (slug === "") throw new Error(`board key ${keyId(key)} gives an empty slug`);
  return slug;
}

function keyId(key: BoardKey): string {
  return key.kind === "official-suite" ? `suite:${key.suite}` : `method:${key.digest}`;
}

/**
 * The words a board uses for its rows. They come from the kind of claim the
 * board holds, never from a claimant. Every claim published today is a
 * binary-qualification claim: grading prompts judging the same answers against
 * the same correctness labels, so "passed" is the record's own word, agreed.
 */
export interface BoardWords {
  /** The column heading for an arm, as sealed. */
  arm: string;
  /** Arms, plural, in running text. */
  arms: string;
  /** The units the method fixes, plural, in running text. */
  units: string;
  /** The unit coverage is counted in. */
  coverageUnit: string;
  passedColumn: string;
  rateColumn: string;
  passed: string;
  notPassed: string;
  excluded: string;
  /** The line under the board's comparability note, when the key leaves something out. */
  outsideKey: string | null;
}

function wordsFor(report: QualifiedReportData): BoardWords {
  return {
    arm: "Grading prompt",
    arms: "grading prompts",
    units: "answers",
    coverageUnit: "items",
    passedColumn: "Agreed with the label",
    rateColumn: "Agreement",
    passed: "agreed",
    notPassed: "did not agree",
    excluded: "excluded",
    outsideKey: `The judge model and harness are not part of this board's key. A later claim on the same`
      + ` ${report.population.items} answers may use a different judge model; each row names the one it used.`,
  };
}

/**
 * The coverage a claim's seal declared. Full coverage is every item the lock
 * fixes. A subset carries its declared name and a marker; no read model
 * declares a subset yet, so a claim short of full coverage fails the build
 * until its record names the subset it ran.
 */
export type Coverage =
  | { kind: "full"; planned: number; text: string }
  | { kind: "subset"; name: string; planned: number; of: number; text: string };

export interface BoardArm {
  /** The arm's ID in the sealed run record. */
  id: string;
  /** The arm's label from the claim's reading record. */
  label: string;
  /** The grading prompt's own digest, as the run record pins it. */
  instrumentSha256: string;
  judgeModel: string;
  harness: { id: string; version: string };
  coverage: Coverage;
  /** Units the lock planned for this arm: the axis runs 0 to this. */
  planned: number;
  passed: number;
  /** Units with a result: passed plus not passed. The percentage is out of this. */
  scored: number;
  notPassed: number;
  excluded: number;
  /** The record's reason for the exclusions, in words, or null when none were excluded. */
  excludedReason: string | null;
  /** The record's own rate, to one decimal: "82.1%". */
  percent: string;
  estimate: number;
}

export interface BoardClaim {
  slug: string;
  title: string;
  href: string;
  claimant: Claimant;
  /** The key the locked method names as its author, when the method names one. */
  methodAuthor: string | null;
  authorIsClaimant: boolean;
  venue: VenueLabel;
  /** The sealed time, which the build has checked is the run record's close time. */
  sealedAt: string;
  sealedDate: string;
  coverage: Coverage;
  arms: BoardArm[];
}

export interface Board {
  slug: string;
  href: string;
  key: BoardKey;
  /** The suite name, or the method's sealed name. */
  name: string;
  version: string | null;
  description: string | null;
  /** How many units the suite or method fixes. */
  planned: number;
  words: BoardWords;
  lede: string;
  /** Newest seal first. */
  claims: BoardClaim[];
  mostRecentSeal: string;
  coverages: string[];
}

/**
 * Board ledes written for one board, keyed on that board's key. The lede
 * falls back to the generic line for every other board. The judge report's
 * board says what its own method description says: it measures the graders.
 */
const BOARD_LEDES: Record<string, (board: { planned: number; firstClaim: string; report: QualifiedReportData }) => string> = {
  "method:9ae50617f9112b750518c04309b96648207f6d0e17ba044a077d0d5185b84c9e": ({ planned, firstClaim, report }) => {
    if (!/measures the graders, not the memory systems/u.test(report.subject.benchmark.description)) {
      throw new Error(`${report.slug}: the method description no longer says it measures the graders`);
    }
    return `How grading prompts agreed with the same correctness labels on the same ${planned} answers.`
      + ` This board measures graders, not memory systems. Its first claim is “${firstClaim}”.`;
  },
};

/* ---------- the signed report's item decisions (report.json) ---------- */

interface ItemContext {
  truthLabel?: unknown;
  candidateClass?: unknown;
}

interface ItemDecision {
  armId: string;
  taskDigest: string;
  decision: string;
  accepted: number;
  rejected: number;
  cellKeys: string[];
  context: ItemContext;
}

interface ExcludedItem {
  armId: string;
  taskDigest: string;
  cellKeys: string[];
  context: ItemContext;
  reasons: { reason?: unknown }[];
}

interface SignedResults {
  itemDecisions: ItemDecision[];
  excluded: ExcludedItem[];
}

const resultsCache = new Map<string, SignedResults>();

function signedResults(report: QualifiedReportData): SignedResults {
  const cached = resultsCache.get(report.slug);
  if (cached !== undefined) return cached;
  const signed = JSON.parse(sealedMember(report, "report.json").toString("utf8")) as {
    results?: { perSubject?: { subjectSha256?: unknown; results?: { itemDecisions?: unknown; excluded?: { items?: unknown } } }[] };
  };
  const subjects = signed.results?.perSubject;
  if (!Array.isArray(subjects) || subjects.length !== 1) {
    throw new Error(`${report.slug}: report.json carries ${Array.isArray(subjects) ? subjects.length : 0} result subjects, not one`);
  }
  const subject = subjects[0];
  if (subject?.subjectSha256 !== report.digests.matrixSha256) {
    throw new Error(`${report.slug}: report.json's results are not about this claim's result matrix`);
  }
  const itemDecisions = subject.results?.itemDecisions;
  const excluded = subject.results?.excluded?.items;
  if (!Array.isArray(itemDecisions) || !Array.isArray(excluded)) {
    throw new Error(`${report.slug}: report.json carries no item decisions`);
  }
  const results = { itemDecisions: itemDecisions as ItemDecision[], excluded: excluded as ExcludedItem[] };
  resultsCache.set(report.slug, results);
  return results;
}

/** The record's reason code, in words: "no-valid-majority" reads "no valid majority". */
function reasonWords(code: unknown): string {
  if (typeof code !== "string" || code.trim() === "") return "no reason recorded";
  return code.replaceAll("-", " ");
}

/* ---------- building the boards ---------- */

function formatDate(timestamp: string): string {
  return timestamp.slice(0, 10);
}

function coverageFor(board: { key: BoardKey }, planned: number, of: number): Coverage {
  if (planned === of) {
    return {
      kind: "full",
      planned,
      text: board.key.kind === "official-suite"
        ? `Full suite, ${planned.toLocaleString("en-US")} tasks`
        : `Full method, ${planned.toLocaleString("en-US")} items`,
    };
  }
  throw new Error(
    `a claim planned ${planned} of the ${of} units its lock fixes, and no read model yet names the subset it ran;`
    + " add the subset's declared name before listing it on a board",
  );
}

function buildArms(report: QualifiedReportData, coverage: Coverage): BoardArm[] {
  const sealed = runArms(report);
  const recordOrder = report.subject.arms.map((arm) => arm.id);
  if (sealed.map((arm) => arm.armId).join("\n") !== recordOrder.join("\n")) {
    throw new Error(`${report.slug}: the reading record's arms are not the run record's arms, in its order`);
  }
  const excludedByArm = new Map(report.accounting.excludedItems.byArm.map((row) => [row.armId, row.items]));
  const reasonsByArm = new Map<string, Set<string>>();
  for (const item of signedResults(report).excluded) {
    const reasons = reasonsByArm.get(item.armId) ?? new Set<string>();
    for (const entry of item.reasons ?? []) reasons.add(reasonWords(entry?.reason));
    if ((item.reasons ?? []).length === 0) reasons.add(reasonWords(undefined));
    reasonsByArm.set(item.armId, reasons);
  }

  return report.subject.arms.map((arm, index) => {
    const pinned = sealed[index];
    const result = report.result.perArm.find((row) => row.armId === arm.id);
    if (pinned === undefined || result === undefined) throw new Error(`${report.slug}: no result for arm ${arm.id}`);
    if (pinned.model !== report.subject.judgeModel) {
      throw new Error(`${report.slug}: arm ${arm.id} is pinned to ${String(pinned.model)}, the read model names ${report.subject.judgeModel}`);
    }
    if (pinned.harness === null
      || pinned.harness.id !== report.subject.harness.id
      || pinned.harness.version !== report.subject.harness.version) {
      throw new Error(`${report.slug}: arm ${arm.id} is pinned to another harness than the read model names`);
    }
    if (pinned.instrumentSha256 === null || `sha256:${pinned.instrumentSha256}` !== arm.instrumentSha256) {
      throw new Error(`${report.slug}: arm ${arm.id}'s grading prompt digest differs between the run record and the read model`);
    }

    const { numerator: passed, denominator: scored, estimate } = result.agreement;
    const planned = coverage.planned;
    const excluded = planned - scored;
    if (passed < 0 || passed > scored || scored > planned) {
      throw new Error(`${report.slug}: arm ${arm.id} counts ${passed} of ${scored} out of ${planned} planned`);
    }
    if (excluded !== (excludedByArm.get(arm.id) ?? 0)) {
      throw new Error(`${report.slug}: arm ${arm.id} leaves ${excluded} units unscored, the accounting excludes ${excludedByArm.get(arm.id) ?? 0}`);
    }
    const reasons = [...(reasonsByArm.get(arm.id) ?? [])];
    if (excluded > 0 && reasons.length === 0) {
      throw new Error(`${report.slug}: arm ${arm.id} excludes ${excluded} units and the signed report gives no reason`);
    }
    const percent = formatPercent(estimate);
    if (percent !== `${((passed / scored) * 100).toFixed(1)}%`) {
      throw new Error(`${report.slug}: arm ${arm.id}'s recorded rate ${estimate} is not ${passed} of ${scored}`);
    }
    return {
      id: arm.id,
      label: arm.label,
      instrumentSha256: pinned.instrumentSha256,
      judgeModel: pinned.model,
      harness: pinned.harness,
      coverage,
      planned,
      passed,
      scored,
      notPassed: scored - passed,
      excluded,
      excludedReason: excluded > 0 ? reasons.join("; ") : null,
      percent,
      estimate: Number(estimate),
    };
  });
}

let boardsCache: Board[] | null = null;

/** Every board, most recent seal first. A claim is on exactly one board. */
export function listBoards(): Board[] {
  if (boardsCache !== null) return boardsCache;

  const grouped = new Map<string, { key: BoardKey; reports: QualifiedReportData[] }>();
  for (const report of listReports()) {
    if (!isQualifiedReport(report)) {
      throw new Error(
        `${report.slug}: format ${report.format} is listed but no board reads it yet; add its board projection`
        + " before listing it, so that no listed claim is left off its board",
      );
    }
    const key = boardKey(report);
    const id = keyId(key);
    const group = grouped.get(id) ?? { key, reports: [] };
    group.reports.push(report);
    grouped.set(id, group);
  }

  const slugs = new Map<string, string>();
  const boards: Board[] = [];
  for (const [id, { key, reports }] of grouped) {
    const first = reports[0];
    if (first === undefined) continue;
    const sealedName = methodName(first);
    const slug = boardSlug(key, key.kind === "official-suite" ? key.suite : sealedName);
    const clash = slugs.get(slug);
    if (clash !== undefined) {
      throw new Error(`two boards map to /boards/${slug}/: ${clash} and ${id}. Give one a distinct sealed name.`);
    }
    slugs.set(slug, id);

    const planned = methodItemCount(first);
    if (planned === null) throw new Error(`${first.slug}: the locked method lists no items`);
    const name = key.kind === "official-suite"
      ? key.suite
      : sealedName ?? `Locked method ${key.digest.slice(0, 8)}…${key.digest.slice(-4)}`;
    const words = wordsFor(first);

    const claims: BoardClaim[] = reports.map((report) => {
      if (methodName(report) !== sealedName || methodItemCount(report) !== planned) {
        throw new Error(`${report.slug}: shares ${id} but not its sealed name and items`);
      }
      if (JSON.stringify(wordsFor(report)) !== JSON.stringify(words)) {
        throw new Error(`${report.slug}: a claim of another kind shares ${id}`);
      }
      const who = claimant(report);
      const author = methodAuthor(report);
      const coverage = coverageFor({ key }, report.population.items, planned);
      return {
        slug: report.slug,
        title: report.title,
        href: `/reports/${report.slug}/`,
        claimant: who,
        methodAuthor: author,
        authorIsClaimant: who.kind === "signing-key" && author === who.value,
        venue: venueLabel(report.execution.venue),
        sealedAt: report.reportedAt,
        sealedDate: formatDate(report.reportedAt),
        coverage,
        arms: buildArms(report, coverage),
      };
    }).sort((left, right) => right.sealedAt.localeCompare(left.sealedAt) || left.slug.localeCompare(right.slug));

    const newest = claims[0];
    const oldest = claims[claims.length - 1];
    if (newest === undefined || oldest === undefined) continue;
    const firstReport = reports.find((report) => report.slug === oldest.slug) ?? first;
    const lede = BOARD_LEDES[id]?.({ planned, firstClaim: oldest.title, report: firstReport })
      ?? `How ${words.arms} performed on ${name}.`;

    boards.push({
      slug,
      href: boardHref(slug),
      key,
      name,
      version: methodVersion(first),
      description: methodDescription(first),
      planned,
      words,
      lede,
      claims,
      mostRecentSeal: newest.sealedAt,
      coverages: [...new Set(claims.map((claim) => claim.coverage.text))],
    });
  }

  boardsCache = boards.sort((left, right) =>
    right.mostRecentSeal.localeCompare(left.mostRecentSeal) || left.name.localeCompare(right.name));
  return boardsCache;
}

export function getBoard(slug: string): Board {
  const board = listBoards().find((candidate) => candidate.slug === slug);
  if (board === undefined) throw new Error(`no board at /boards/${slug}/`);
  return board;
}

/** The board a listed claim sits on, or null if the claim is not listed. */
export function boardForClaim(claimSlug: string): Board | null {
  return listBoards().find((board) => board.claims.some((claim) => claim.slug === claimSlug)) ?? null;
}

/* ---------- task by task ---------- */

/** One judge call as the sealed records hold it. */
export interface TaskCall {
  replicate: number;
  decision: "accept" | "reject" | "unreadable" | "not judged";
  /** The call's native log under the claim's bundle, named by its SHA-256. */
  logHref: string | null;
  logSha256: string | null;
}

export type TaskOutcome = "passed" | "not-passed" | "excluded";

/** One arm's outcome on one planned unit. */
export interface TaskArmOutcome {
  armId: string;
  outcome: TaskOutcome;
  /** The majority the calls formed, when one formed. */
  majority: "accept" | "reject" | null;
  accepted: number;
  rejected: number;
  reason: string | null;
  calls: TaskCall[];
}

export interface TaskRow {
  /** Position in the locked method's own order, from 1. */
  number: number;
  taskSha256: string;
  /** The sealed task record under the claim's bundle, when the bundle carries it. */
  taskHref: string | null;
  label: string;
  arms: TaskArmOutcome[];
}

export interface ArmTally {
  armId: string;
  passed: number;
  notPassed: number;
  excluded: number;
  planned: number;
  callsPlanned: number;
  callsJudged: number;
  callsUnreadable: number;
}

export interface ClaimTasks {
  claim: BoardClaim;
  replicates: number;
  rows: TaskRow[];
  tallies: ArmTally[];
}

interface MatrixCall {
  cellKey?: unknown;
  armId?: unknown;
  taskDigest?: unknown;
  replicate?: unknown;
  outcome?: unknown;
  attempt?: unknown;
}

interface AssemblyCall {
  kind?: unknown;
  cellKey?: unknown;
  attempt?: unknown;
  solveOutputs?: { name?: unknown; sha256?: unknown }[];
  verdicts?: { measurements?: { judgeDecision?: unknown; parseValid?: unknown } }[];
}

function labelWords(context: ItemContext): string {
  if (context.truthLabel === "CORRECT" && context.candidateClass === "correct") return "Correct";
  if (context.truthLabel === "WRONG" && context.candidateClass === "specific-wrong") return "Specific wrong";
  if (context.truthLabel === "WRONG" && context.candidateClass === "vague-topical-wrong") return "Vague wrong";
  return `${String(context.truthLabel).toLowerCase()}, ${String(context.candidateClass).replaceAll("-", " ")}`;
}

function callDecision(call: AssemblyCall | undefined): TaskCall["decision"] {
  const measurements = call?.verdicts?.[0]?.measurements;
  if (call === undefined || measurements === undefined) return "not judged";
  if (measurements.parseValid === false || measurements.judgeDecision === "INVALID") return "unreadable";
  if (measurements.judgeDecision === "ACCEPT") return "accept";
  if (measurements.judgeDecision === "REJECT") return "reject";
  throw new Error(`a sealed call records the decision ${String(measurements.judgeDecision)}, which this page cannot read`);
}

const tasksCache = new Map<string, ClaimTasks>();

/**
 * Every planned unit of one claim, arm by arm, failures and exclusions
 * included, read from the bundle's fixed members:
 *
 * - benchmark.json: the units, in the locked method's order;
 * - report.json (the signed report): each arm's majority decision on each
 *   unit, the unit's label, and every exclusion with its reason;
 * - matrix.json (the result matrix): every planned call and its outcome;
 * - verification/assembly.jsonl: each call's decision and its native log;
 * - evidence.json: that each native log is a sealed record of the bundle.
 *
 * Every member is hashed against the bundle's file list first. The tallies are
 * recomputed here from the item decisions and must equal the read model's
 * counts, arm by arm, or the build fails.
 */
export function claimTasks(board: Board, claim: BoardClaim): ClaimTasks {
  const cached = tasksCache.get(claim.slug);
  if (cached !== undefined) return cached;
  const report = listReports().find((candidate) => candidate.slug === claim.slug);
  if (report === undefined || !isQualifiedReport(report)) throw new Error(`${claim.slug}: not a listed claim`);
  const bundleBase = `/reports/${report.slug}/bundle`;
  const replicates = report.execution.replicates;
  const tasks = methodTaskDigests(report);
  if (tasks.length !== board.planned || new Set(tasks).size !== tasks.length) {
    throw new Error(`${report.slug}: benchmark.json fixes ${tasks.length} units, the board ${board.planned}`);
  }
  const armIds = claim.arms.map((arm) => arm.id);
  const key = (task: string, arm: string, replicate: number) => `${task}/${arm}/${replicate}`;

  // The result matrix: every planned call.
  const matrix = JSON.parse(sealedMember(report, "matrix.json").toString("utf8")) as { cells?: MatrixCall[] };
  if (!Array.isArray(matrix.cells) || matrix.cells.length !== report.accounting.cells.expected) {
    throw new Error(`${report.slug}: matrix.json does not list the ${report.accounting.cells.expected} planned calls`);
  }
  const planned = new Map<string, MatrixCall>();
  for (const call of matrix.cells) {
    const cellKey = String(call.cellKey);
    if (cellKey !== key(String(call.taskDigest), String(call.armId), Number(call.replicate))) {
      throw new Error(`${report.slug}: matrix.json names a call ${cellKey} inconsistently`);
    }
    planned.set(cellKey, call);
  }

  // The assembly trace: each call's decision and native log.
  const nativeLogs = new Set(
    (JSON.parse(sealedMember(report, "evidence.json").toString("utf8")) as { records?: { roles?: unknown; sha256?: unknown }[] })
      .records
      ?.filter((record) => Array.isArray(record.roles) && record.roles.includes("solve-output"))
      .map((record) => String(record.sha256)) ?? [],
  );
  const traced = new Map<string, AssemblyCall>();
  for (const line of sealedMember(report, "verification/assembly.jsonl").toString("utf8").split("\n")) {
    if (line.trim() === "") continue;
    const entry = JSON.parse(line) as AssemblyCall;
    if (entry.kind !== "cell") continue;
    const cellKey = String(entry.cellKey);
    const matrixCall = planned.get(cellKey);
    if (matrixCall === undefined) throw new Error(`${report.slug}: the assembly trace names an unplanned call ${cellKey}`);
    if (entry.attempt !== matrixCall.attempt) {
      throw new Error(`${report.slug}: call ${cellKey} names another attempt in the trace than in the result matrix`);
    }
    traced.set(cellKey, entry);
  }

  const callsFor = (task: string, arm: string): TaskCall[] => {
    const calls: TaskCall[] = [];
    for (let replicate = 1; replicate <= replicates; replicate += 1) {
      const cellKey = key(task, arm, replicate);
      const matrixCall = planned.get(cellKey);
      if (matrixCall === undefined) throw new Error(`${report.slug}: planned call ${cellKey} is missing from matrix.json`);
      const trace = matrixCall.outcome === "judged" ? traced.get(cellKey) : undefined;
      if (matrixCall.outcome === "judged" && trace === undefined) {
        throw new Error(`${report.slug}: judged call ${cellKey} has no entry in the assembly trace`);
      }
      const log = trace?.solveOutputs?.find((output) => output.name === "inspect-log")?.sha256;
      let logSha256: string | null = null;
      if (typeof log === "string") {
        const path = `native/inspect/${log}.eval`;
        if (listedDigest(report, path) !== log || !nativeLogs.has(log)) {
          throw new Error(`${report.slug}: call ${cellKey}'s native log ${log} is not a sealed file of the bundle`);
        }
        logSha256 = log;
      }
      calls.push({
        replicate,
        decision: callDecision(trace),
        logHref: logSha256 === null ? null : `${bundleBase}/native/inspect/${logSha256}.eval`,
        logSha256,
      });
    }
    return calls;
  };

  // The signed report's decisions, one per arm and unit.
  const { itemDecisions, excluded } = signedResults(report);
  const outcomes = new Map<string, { outcome: TaskArmOutcome; context: ItemContext }>();
  const place = (task: string, arm: string, value: { outcome: TaskArmOutcome; context: ItemContext }) => {
    const id = `${task}/${arm}`;
    if (outcomes.has(id)) throw new Error(`${report.slug}: the signed report decides ${id} twice`);
    outcomes.set(id, value);
  };
  for (const item of itemDecisions) {
    const calls = callsFor(item.taskDigest, item.armId);
    const accepted = calls.filter((call) => call.decision === "accept").length;
    const rejected = calls.filter((call) => call.decision === "reject").length;
    if (accepted !== item.accepted || rejected !== item.rejected) {
      throw new Error(`${report.slug}: ${item.taskDigest}/${item.armId}: the calls do not add up to the recorded majority`);
    }
    const majority = item.decision === "ACCEPT" ? "accept" : item.decision === "REJECT" ? "reject" : null;
    if (majority === null) throw new Error(`${report.slug}: unknown decision ${item.decision}`);
    const truth = item.context.truthLabel;
    if (truth !== "CORRECT" && truth !== "WRONG") throw new Error(`${report.slug}: unknown label ${String(truth)}`);
    const agreed = (majority === "accept") === (truth === "CORRECT");
    place(item.taskDigest, item.armId, {
      context: item.context,
      outcome: {
        armId: item.armId,
        outcome: agreed ? "passed" : "not-passed",
        majority,
        accepted,
        rejected,
        reason: null,
        calls,
      },
    });
  }
  for (const item of excluded) {
    const calls = callsFor(item.taskDigest, item.armId);
    const reasons = (item.reasons ?? []).map((entry) => reasonWords(entry?.reason));
    place(item.taskDigest, item.armId, {
      context: item.context,
      outcome: {
        armId: item.armId,
        outcome: "excluded",
        majority: null,
        accepted: calls.filter((call) => call.decision === "accept").length,
        rejected: calls.filter((call) => call.decision === "reject").length,
        reason: reasons.length === 0 ? reasonWords(undefined) : [...new Set(reasons)].join("; "),
        calls,
      },
    });
  }
  if (outcomes.size !== tasks.length * armIds.length) {
    throw new Error(`${report.slug}: the signed report decides ${outcomes.size} of ${tasks.length * armIds.length} planned units`);
  }

  const rows: TaskRow[] = tasks.map((task, index) => {
    const arms = armIds.map((arm) => {
      const found = outcomes.get(`${task}/${arm}`);
      if (found === undefined) throw new Error(`${report.slug}: no decision or exclusion for ${task}/${arm}`);
      return found;
    });
    const labels = new Set(arms.map((arm) => labelWords(arm.context)));
    if (labels.size !== 1) throw new Error(`${report.slug}: unit ${task} carries different labels for different arms`);
    return {
      number: index + 1,
      taskSha256: task,
      taskHref: listedDigest(report, `records/${task}.bin`) === task ? `${bundleBase}/records/${task}.bin` : null,
      label: [...labels][0] ?? "",
      arms: arms.map((arm) => arm.outcome),
    };
  });

  const tallies: ArmTally[] = claim.arms.map((arm, index) => {
    const column = rows.map((row) => row.arms[index]).filter((cell): cell is TaskArmOutcome => cell !== undefined);
    const calls = column.flatMap((cell) => cell.calls);
    const tally: ArmTally = {
      armId: arm.id,
      passed: column.filter((cell) => cell.outcome === "passed").length,
      notPassed: column.filter((cell) => cell.outcome === "not-passed").length,
      excluded: column.filter((cell) => cell.outcome === "excluded").length,
      planned: column.length,
      callsPlanned: calls.length,
      callsJudged: calls.filter((call) => call.decision !== "not judged").length,
      callsUnreadable: calls.filter((call) => call.decision === "unreadable").length,
    };
    if (tally.passed !== arm.passed || tally.notPassed !== arm.notPassed || tally.excluded !== arm.excluded
      || tally.planned !== arm.planned) {
      throw new Error(
        `${report.slug}: arm ${arm.id} recomputes to ${tally.passed}/${tally.notPassed}/${tally.excluded} from the signed`
        + ` report, the read model says ${arm.passed}/${arm.notPassed}/${arm.excluded}`,
      );
    }
    return tally;
  });
  const unreadable = tallies.reduce((sum, tally) => sum + tally.callsUnreadable, 0);
  if (unreadable !== report.accounting.parserNeutral.calls) {
    throw new Error(`${report.slug}: ${unreadable} unreadable calls in the trace, the accounting says ${report.accounting.parserNeutral.calls}`);
  }

  const result = { claim, replicates, rows, tallies };
  tasksCache.set(claim.slug, result);
  return result;
}
