import type { CSSProperties, ReactNode } from "react";
import { CompletenessBar, Footnote, Tag } from "@/components/ds";
import { CopyCommand } from "@/components/copy-command";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  boardKey,
  bundleSize,
  claimant,
  methodAuthor,
  methodItemCount,
  methodName,
  methodVersion,
  runCloseAt,
  shortKey,
  type Claimant,
} from "@/lib/bundle-facts";
import {
  DISCLOSURE_VARIABLE_KEYS,
  disclosureVariableLabel,
  formatPercent,
  type DisclosureVariableEntry,
  type IntegrityAnchor,
  type NarrativeBlock,
  type NarrativeSection,
  type Proportion,
  type QualifiedReportData,
} from "@/lib/reports";

const SITE_ORIGIN = "https://colophon.claims";

/**
 * Where a published bundle can be downloaded as one archive, and that
 * archive's size in bytes as its release lists it (checked 2026-09-24). Each
 * archive unpacks to one folder named by the bundle's evidence ID.
 */
const BUNDLE_RELEASES: Record<string, { base: string; archiveBytes: number }> = {
  "locomo-judge-report": {
    base: "https://github.com/colophon-claims/locomo-judge-report/releases/download/locomo-judge-report-run-completion-2026-09-01",
    archiveBytes: 98_146_614,
  },
};

/**
 * The day this page's wording was last revised. A revision changes Colophon's
 * words only: the sealed bundle and every number stay byte-identical.
 */
const WORDING_REVISED = "2026-09-24";

/**
 * "Who chose the tasks": one of three values. No sealed field states it yet,
 * so each published claim is read here from its own record, and the line the
 * page prints under the value is taken from that record. A claim not listed
 * reads "Not stated".
 */
type TaskChooser = "claimant" | "fixed-public-set" | "lottery";

const TASK_CHOOSER_VALUE: Record<TaskChooser, string> = {
  claimant: "The claimant chose them.",
  "fixed-public-set": "A fixed public set.",
  lottery: "Drawn by lottery.",
};

const TASK_CHOOSER_OTHERS: Record<TaskChooser, string> = {
  claimant: "Not a fixed public set, not drawn by lottery.",
  "fixed-public-set": "Not chosen by the claimant, not drawn by lottery.",
  lottery: "Not chosen by the claimant, not a fixed public set.",
};

const TASK_CHOICE: Record<string, { chooser: TaskChooser; basis: (report: QualifiedReportData) => string }> = {
  // The posted design (question.designUrl) samples the questions with the
  // claimant's own seeded script. population.labels: a pinned model screened a
  // 664-item candidate pool, the operator hand-reviewed 255, and 137 were
  // excluded and replaced to keep the 80/80/80 class balance. No outside draw
  // fixed the 240, so the claimant chose them.
  "locomo-judge-report": {
    chooser: "claimant",
    basis: (report) => {
      const labels = report.population.labels;
      const pool = /candidate pool contained ([\d,]+) items/u.exec(labels)?.[1];
      const reviewed = /hand-reviewed ([\d,]+) items/u.exec(labels)?.[1];
      const replaced = /excluded ([\d,]+) candidates/u.exec(labels)?.[1];
      const balance = /final ([\d/]+) class balance/u.exec(labels)?.[1];
      if (pool === undefined || reviewed === undefined || replaced === undefined || balance === undefined) {
        throw new Error(`${report.slug}: population.labels no longer states the pool, the review and the exclusions`);
      }
      return `Questions sampled by the claimant's seeded script; a model screened a ${pool}-item pool,`
        + ` the operator hand-reviewed ${reviewed}, and ${replaced} were excluded and replaced to keep the`
        + ` ${balance} balance.`;
    },
  },
};

/** The venue as the sealed run record names it, in the two words the site uses. */
const VENUE_LABEL: Record<string, string> = {
  "self-run": "Self-run",
};

function venueLabel(venue: string): string {
  const label = VENUE_LABEL[venue];
  if (label === undefined) {
    throw new Error(`no reader label for venue ${venue}; add one before publishing this claim`);
  }
  return label;
}

const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

function countWord(count: number): string {
  return NUMBER_WORDS[count] ?? count.toLocaleString("en-US");
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatCount(count: number): string {
  return count.toLocaleString("en-US");
}

function formatMegabytes(bytes: number): string {
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

function formatDate(timestamp: string): string {
  return timestamp.slice(0, 10);
}

function formatUtc(timestamp: string): string {
  return `${timestamp.slice(0, 10)} ${timestamp.slice(11, 19)} UTC`;
}

function formatUtcMinute(timestamp: string): string {
  return `${timestamp.slice(0, 10)} ${timestamp.slice(11, 16)} UTC`;
}

/** A short handle for an ID, for link text. The full value is always printed beside it. */
function shortId(hex: string): string {
  return `${hex.slice(0, 8)}…${hex.slice(-4)}`;
}

function plural(count: number, singular: string): string {
  return `${count.toLocaleString("en-US")} ${singular}${count === 1 ? "" : "s"}`;
}

function rate(value: Proportion): string {
  return `${formatPercent(value.estimate)} (${value.numerator}/${value.denominator})`;
}

function interval(value: Proportion): string {
  return `${formatPercent(value.wilsonInterval.low)} to ${formatPercent(value.wilsonInterval.high)}`;
}

function judgeLabel(id: string): string {
  const labels: Record<string, string> = {
    audited: "Audited",
    backboard: "Backboard",
    mem0: "Mem0",
    "mem0-evidence": "Mem0 + evidence",
    revised: "Revised",
    "strict-dial": "Strict-dial",
  };
  return labels[id] ?? id;
}

/**
 * The lead number of a claim with several arms: the range the claim itself
 * reports, each end with its own denominator. The ends are read from the
 * per-arm results, and the claim's own finding must state that same range, so
 * the page never leads with a range the claim does not report.
 */
function reportedRange(report: QualifiedReportData) {
  const arms = [...report.result.perArm].sort((left, right) =>
    Number(left.agreement.estimate) - Number(right.agreement.estimate));
  const low = arms[0];
  const high = arms[arms.length - 1];
  if (low === undefined || high === undefined) throw new Error(`${report.slug}: no per-arm results`);
  const lowText = formatPercent(low.agreement.estimate);
  const highText = formatPercent(high.agreement.estimate);
  if (!report.result.primary.includes(`${lowText} to ${highText}`)) {
    throw new Error(`${report.slug}: the claim's own finding does not state the range ${lowText} to ${highText}`);
  }
  return { low: low.agreement, high: high.agreement, lowText, highText, arms: arms.length };
}

/** The claim's own words for what moved the number: its finding, up to "moved". */
function whatMovedIt(primary: string): string {
  const first = primary.split(/(?<=\.)\s+/u)[0] ?? primary;
  const cut = first.indexOf(" moved ");
  return cut > 0 ? `${first.slice(0, cut)}.` : first;
}

/** The measure, in the claim's own words: the first sentence of its method statement. */
function measureWords(methodStatement: string): string {
  const first = (methodStatement.split(/(?<=\.)\s+/u)[0] ?? methodStatement).replace(/\.$/u, "");
  return first.charAt(0).toLowerCase() + first.slice(1);
}

/**
 * A carried proof reports the state embedded in its own bytes. This site
 * supplies no trust material and evaluates none, so a proof is described as it
 * states itself, never as verified, and never upgraded.
 */
function anchorState(anchor: IntegrityAnchor): { seal: string; state: string; detail: string } {
  if (anchor.facts.pending === true) {
    return {
      seal: "Timestamp proof pending, as the proof states",
      state: "Pending",
      detail: "The proof records a submission and no confirmation yet, so it dates nothing yet.",
    };
  }
  if (typeof anchor.facts.blockHeight === "number") {
    return {
      seal: `Timestamp proof in Bitcoin block ${anchor.facts.blockHeight}, as the proof states`,
      state: "Confirmed",
      detail: `The proof records Bitcoin block ${anchor.facts.blockHeight}.`,
    };
  }
  if (typeof anchor.facts.genTime === "string") {
    return {
      seal: `Timestamped ${anchor.facts.genTime}, as the proof states`,
      state: "Timestamped",
      detail: `The proof records an authority time of ${anchor.facts.genTime}.`,
    };
  }
  return {
    seal: "Timestamp proof carried; it states no time",
    state: "Carried",
    detail: "The proof carries no time this page reads.",
  };
}

/** The proof's kind, in words, as far as its own identifiers say. */
function anchorKind(anchor: IntegrityAnchor): string {
  if (/\/opentimestamps\//u.test(anchor.provider)) return "An OpenTimestamps proof";
  if (typeof anchor.facts.genTime === "string") return "A timestamp authority token";
  return "A timestamp proof";
}

/** What the proof covers, in words, as far as its own identifiers say. */
function anchorCovers(anchor: IntegrityAnchor): string {
  const record = /\/records\/benchmark-run\//u.test(anchor.kind) ? "the run record" : "a sealed record";
  return anchor.subject === "lock" ? `${record}, which the claim names as its lock` : record;
}

function sealAnchor(anchors: IntegrityAnchor[]): IntegrityAnchor | undefined {
  return anchors.find((anchor) => anchor.subject === "lock") ?? anchors[0];
}

type ArmResult = QualifiedReportData["result"]["perArm"][number];

function chartStyle(values: Record<string, string>): CSSProperties {
  return values as CSSProperties;
}

/**
 * Chart map: agreement with correctness labels; horizontal dot-and-interval;
 * arm, agreement estimate, Wilson low/high; one vermilion root plus neutrals.
 */
function AgreementChart({ arms }: { arms: ArmResult[] }) {
  const ordered = [...arms].sort((left, right) =>
    Number(right.agreement.estimate) - Number(left.agreement.estimate));
  return (
    <figure className="report-figure" aria-labelledby="agreement-chart-title">
      <div className="figure-head">
        <div>
          <h3 id="agreement-chart-title">Agreement with correctness labels</h3>
          <p>Same 240-item bank and model snapshot. The evidence-fed configuration has 233 scored items after seven exclusions. 95% Wilson intervals.</p>
        </div>
      </div>
      <div className="chart-axis" aria-hidden="true">
        <span>0</span><span>25</span><span>50</span><span>75</span><span>100%</span>
      </div>
      <div className="interval-chart" role="list" aria-label="Agreement by judge, with 95 percent confidence intervals">
        {ordered.map((arm) => {
          const estimate = Number(arm.agreement.estimate) * 100;
          const low = Number(arm.agreement.wilsonInterval.low) * 100;
          const high = Number(arm.agreement.wilsonInterval.high) * 100;
          return (
            <div
              className="interval-row"
              key={arm.armId}
              role="listitem"
              aria-label={`${judgeLabel(arm.armId)}: ${estimate.toFixed(1)} percent, interval ${low.toFixed(1)} to ${high.toFixed(1)} percent`}
            >
              <span className="chart-category">{judgeLabel(arm.armId)}</span>
              <span className="interval-plot">
                <span
                  className="interval-line"
                  style={chartStyle({ "--chart-left": `${low}%`, "--chart-width": `${high - low}%` })}
                />
                <span className="interval-point" style={chartStyle({ "--chart-left": `${estimate}%` })} />
              </span>
              <strong className="chart-value">{estimate.toFixed(1)}%</strong>
            </div>
          );
        })}
      </div>
      <figcaption>
        Changing only the grading configuration produced a 27.1-point spread on identical inputs.
      </figcaption>
    </figure>
  );
}

/**
 * Chart map: known-wrong answer acceptance; paired horizontal bars;
 * arm, specific-wrong acceptance, vague-wrong acceptance; ink and vermilion.
 */
function FalseAcceptanceChart({ arms }: { arms: ArmResult[] }) {
  const ordered = [...arms].sort((left, right) =>
    Number(right.agreement.estimate) - Number(left.agreement.estimate));
  return (
    <figure className="report-figure" aria-labelledby="false-accept-chart-title">
      <div className="figure-head">
        <div>
          <h3 id="false-accept-chart-title">Known-wrong answers accepted</h3>
          <p>Majority verdicts. Each class has 80 items; the evidence-fed arm scored 76 specific and 78 vague after declared exclusions.</p>
        </div>
        <div className="chart-legend" aria-label="Legend">
          <span><i className="legend-specific" />Specific wrong</span>
          <span><i className="legend-vague" />Vague wrong</span>
        </div>
      </div>
      <div className="paired-bar-chart" role="list" aria-label="Acceptance of specific and vague wrong answers by judge">
        {ordered.map((arm) => {
          const specific = Number(arm.acceptsSpecificWrong.estimate) * 100;
          const vague = Number(arm.acceptsVagueTopicalWrong.estimate) * 100;
          return (
            <div
              className="paired-bar-row"
              key={arm.armId}
              role="listitem"
              aria-label={`${judgeLabel(arm.armId)}: ${specific.toFixed(1)} percent specific wrong, ${vague.toFixed(1)} percent vague wrong`}
            >
              <span className="chart-category">{judgeLabel(arm.armId)}</span>
              <span className="paired-measures">
                <span className="bar-measure">
                  <span className="bar-track"><span className="bar-fill specific" style={{ width: `${specific}%` }} /></span>
                  <strong>{specific.toFixed(1)}%</strong>
                </span>
                <span className="bar-measure">
                  <span className="bar-track"><span className="bar-fill vague" style={{ width: `${vague}%` }} /></span>
                  <strong>{vague.toFixed(1)}%</strong>
                </span>
              </span>
            </div>
          );
        })}
      </div>
      <figcaption>
        Every judge was substantially more forgiving of answers that stayed on topic while avoiding the requested fact.
      </figcaption>
    </figure>
  );
}

const STATUS_TONE = {
  "measured-here": "ink",
  "disclosed-by-publisher": "indigo",
  undisclosed: "outline",
} as const;

const STATUS_LABEL = {
  "measured-here": "Measured in benchmark",
  "disclosed-by-publisher": "Reported by publisher",
  undisclosed: "Not reported",
} as const;

const REASON_LABEL = {
  "not-stated": "Nobody stated it.",
  "stated-without-identifiers": "Stated, but too vague to pin.",
  "outside-this-experiment": "Structurally inapplicable to this experiment.",
} as const;


function DisclosureDetail({
  entry,
  bundleBase,
}: {
  entry: DisclosureVariableEntry;
  bundleBase: string;
}) {
  if (entry.status === "undisclosed") {
    return <span className="muted">{REASON_LABEL[entry.reason]}</span>;
  }
  return (
    <>
      <p className="disclosure-statement">{entry.statement}</p>
      {entry.status === "measured-here" && (
        <ul className="disclosure-evidence">
          {entry.evidence.map((citation) => (
            <li key={`${citation.role}/${citation.digest.sha256}`}>
              <span>{citation.role.replaceAll("-", " ")}</span>
              <a href={`${bundleBase}/records/${citation.digest.sha256}.bin`} download>
                <code>{shortId(citation.digest.sha256)}</code>
              </a>
            </li>
          ))}
        </ul>
      )}
      {entry.status === "disclosed-by-publisher" && entry.sources !== undefined && (
        <ul className="disclosure-evidence">
          {entry.sources.map((source) => (
            <li key={source.uri}>
              <a href={source.uri}>{source.uri}</a>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/**
 * Renders the report's own inline notation: **strong text**, `code` spans, and
 * [text](url) links.
 * The prose is carried verbatim, so the markdown it was written in is resolved
 * here rather than stripped out of the record.
 */
function Inline({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  const pattern = /\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)/gu;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    if (match[1] !== undefined) {
      parts.push(<strong key={parts.length}>{match[1]}</strong>);
    } else if (match[2] !== undefined) {
      parts.push(<code key={parts.length}>{match[2]}</code>);
    } else {
      parts.push(<a key={parts.length} href={match[4]}>{match[3]}</a>);
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

function NarrativeBlocks({ blocks }: { blocks: NarrativeBlock[] }) {
  return (
    <>
      {blocks.map((block, index) => {
        if (block.kind === "heading") {
          return <h3 key={index} className="narrative-heading">{block.text}</h3>;
        }
        if (block.kind === "list") {
          const List = block.ordered === true ? "ol" : "ul";
          return (
            <List
              key={index}
              className={`limits-list narrative-list${block.ordered === true ? " synthesis-list" : ""}`}
            >
              {block.items.map((item) => <li key={item}><span><Inline text={item} /></span></li>)}
            </List>
          );
        }
        if (block.kind === "table") {
          return (
            <div key={index} className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>{block.columns.map((column) => <th key={column}>{column}</th>)}</tr>
                </thead>
                <tbody>
                  {block.rows.map((row) => (
                    <tr key={row.join("|")}>
                      {row.map((cell, cellIndex) => <td key={cellIndex}><Inline text={cell} /></td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        return (
          <p key={index} className={block.strong === true ? "narrative-lead" : "report-reading"}>
            <Inline text={block.text} />
          </p>
        );
      })}
    </>
  );
}

function ReportSectionHead({ title, standfirst }: { title: ReactNode; standfirst?: string }) {
  return (
    <header className="report-section-head">
      <h2>{title}</h2>
      {standfirst !== undefined && <p>{standfirst}</p>}
    </header>
  );
}

const ORDER = [
  "opening",
  "five-questions",
  "result",
  "recommendations",
  "disclosure-standard",
  "method",
  "does-not-establish",
  "data-verification",
  "materials",
  "accounting",
] as const;

const NAV_LABELS: Record<(typeof ORDER)[number], string | null> = {
  opening: null,
  "five-questions": "Questions",
  result: "Results",
  recommendations: "Recommendations",
  "disclosure-standard": "Disclosure",
  method: "Method",
  "does-not-establish": "Limitations",
  "data-verification": "Data & verification",
  materials: null,
  accounting: "Accounting",
};

/** The byline's claimant slot: a name if a record ever carries one, else the
 * signing key the records name, shortened, with the full key behind it. */
function ClaimantByline({ who, authorIsOwner }: { who: Claimant; authorIsOwner: boolean }) {
  if (who.kind === "named") return <span>{who.value}</span>;
  if (who.kind === "not-stated") return <span>Claimant not stated</span>;
  return (
    <details className="claim-key">
      <summary>
        Signing key <code>{shortKey(who.value)}</code>
      </summary>
      <div className="claim-key-body">
        <p>
          No claimant name is recorded. This is the key the sealed run record names as the run&apos;s
          owner{authorIsOwner ? ", and the locked method names as its author" : ""}.
        </p>
        <div role="group" aria-label="Full signing key">
          <CopyCommand value={who.value} />
        </div>
      </div>
    </details>
  );
}

function IdRow({ label, file, value, note }: { label: string; file?: ReactNode; value: string; note?: ReactNode }) {
  return (
    <div className="claim-id">
      <dt>
        {label}
        {file !== undefined && <span className="claim-id-file">{file}</span>}
      </dt>
      <dd>
        <div role="group" aria-label={label}>
          <CopyCommand value={value} />
        </div>
        {note !== undefined && <p className="claim-id-note">{note}</p>}
      </dd>
    </div>
  );
}

export function QualifiedReportPage({ report }: { report: QualifiedReportData }) {
  const bundleBase = `/reports/${report.slug}/bundle`;
  const release = BUNDLE_RELEASES[report.slug];
  const bundleArchiveName = `${report.digests.bundleIdentity}.tar.gz`;
  const archive = release === undefined
    ? null
    : { url: `${release.base}/${bundleArchiveName}`, size: formatMegabytes(release.archiveBytes) };
  if (!report.verification.command.includes("<bundle-dir>")) {
    throw new Error(`${report.slug}: the recorded check command names no bundle folder`);
  }
  // One folder name everywhere: the archive unpacks to a folder named by the
  // evidence ID, and every instruction renames it to `bundle` first.
  const checkCommand = report.verification.command.replace("<bundle-dir>", "./bundle");
  const disclosure = report.disclosure;
  const narrative = new Map((report.narrative ?? []).map((s: NarrativeSection) => [s.slot, s]));
  const prose = (slot: string) => {
    const section = narrative.get(slot);
    if (section === undefined) return null;
    return <NarrativeBlocks blocks={section.blocks} />;
  };
  const heading = (slot: string, fallback: string) => narrative.get(slot)?.heading ?? fallback;
  const cells = report.accounting.cells;

  // The lead: facts from the read model, and from the sealed run and method
  // records, each tied to the ID the page prints for it (lib/bundle-facts).
  const range = reportedRange(report);
  const who = claimant(report);
  const author = methodAuthor(report);
  const authorIsOwner = who.kind === "signing-key" && author === who.value;
  const venue = venueLabel(report.execution.venue);
  const size = bundleSize(report);
  if (size.files !== report.memberCounts.total) {
    throw new Error(`${report.slug}: bundle.json lists ${size.listedFiles} files, the read model counts ${report.memberCounts.total} with it`);
  }
  const key = boardKey(report);
  const method = methodName(report);
  const version = methodVersion(report);
  const methodItems = methodItemCount(report);
  if (methodItems !== report.population.items) {
    throw new Error(`${report.slug}: the locked method fixes ${String(methodItems)} items, the read model ${report.population.items}`);
  }
  const armCount = report.subject.arms.length;
  if (report.population.items * armCount * report.execution.replicates !== cells.expected) {
    throw new Error(`${report.slug}: ${cells.expected} planned calls is not items × arms × calls`);
  }
  const accountedFor = cells.judged + cells.lost;
  if (accountedFor > cells.expected) {
    throw new Error(`${report.slug}: more calls accounted for than planned`);
  }
  const readableCalls = cells.judged - report.accounting.parserNeutral.calls;
  const excludedByArm = new Map(report.accounting.excludedItems.byArm.map((row) => [row.armId, row.items]));
  const excludedTotal = [...excludedByArm.values()].reduce((sum, items) => sum + items, 0);
  if (excludedTotal !== report.accounting.excludedItems.count) {
    throw new Error(`${report.slug}: excluded items by arm do not add up to the total`);
  }
  const taskChoice = TASK_CHOICE[report.slug];
  const disclosureFirstLine = report.limitations[0];
  const lockAnchor = sealAnchor(report.anchors);
  const sealedDate = formatDate(report.reportedAt);
  const reproducibility = narrative.get("reproducibility");
  const reproducibilitySplit = reproducibility === undefined
    ? -1
    : reproducibility.blocks.findIndex((block) => block.kind === "heading");

  const exactSteps = [
    ...(archive === null
      ? ["# download every file under the bundle address, keeping paths, into one folder"]
      : [
          `curl -fLO '${archive.url}'`,
          `tar -xzf '${bundleArchiveName}'`,
          `mv '${report.digests.bundleIdentity}' bundle`,
        ]),
    checkCommand,
  ].join("\n");
  const citation = [
    `${report.title}.`,
    who.kind === "signing-key"
      ? `Claim by signing key ${who.value}, sealed ${sealedDate}, ${venue.toLowerCase()}.`
      : `Claim sealed ${sealedDate}, ${venue.toLowerCase()}.`,
    `${report.format}, evidence ID ${report.digests.bundleIdentity}.`,
    `Report ${report.digests.reportSha256}.`,
    `${method ?? report.subject.benchmark.name}: ${report.population.items} items, ${armCount} grading prompts,`
      + ` ${report.execution.replicates} judge calls per item and prompt.`,
    `${SITE_ORIGIN}/reports/${report.slug}/`,
    `Check: ${checkCommand}`,
  ].join(" ");

  return (
    <>
      <SiteHeader quiet />
      <main className="report-main benchmark-report claim-page">
        <div className="claim-lead">
          <header className="claim-head">
            <nav className="claim-crumb" aria-label="Breadcrumb">
              <a href="/reports/">Reports</a>
            </nav>
            <p className="claim-eyebrow">Claim</p>
            <h1>{report.title}</h1>
            <div className="claim-byline">
              <ClaimantByline who={who} authorIsOwner={authorIsOwner} />
              <span className="claim-dot" aria-hidden="true">·</span>
              <span>
                Sealed <time dateTime={report.reportedAt}>{sealedDate}</time>
              </span>
              <span className="claim-dot" aria-hidden="true">·</span>
              <span className={`claim-venue claim-venue--${report.execution.venue}`}>{venue}</span>
            </div>
          </header>

          <section className="claim-result" aria-labelledby="claim-result-label">
            <h2 id="claim-result-label" className="claim-label">
              Lowest to highest of the {countWord(range.arms)} grading prompts
            </h2>
            <p className="claim-number">
              <span>{range.lowText}</span> <span className="claim-number-to">to</span>{" "}
              <span>{range.highText}</span>
            </p>
            <div className="claim-result-lines">
              <p className="claim-denominators">
                {range.low.numerator} of {range.low.denominator} to {range.high.numerator} of{" "}
                {range.high.denominator} answers, {measureWords(report.result.methodStatement)}.
              </p>
              <p className="claim-moved">{whatMovedIt(report.result.primary)}</p>
            </div>
          </section>

          <div className="claim-seal" role="group" aria-label="Seal">
            <svg className="claim-seal-mark" width="14" height="16" viewBox="0 0 14 16" aria-hidden="true">
              <path d="M3.5 7V4.5a3.5 3.5 0 0 1 7 0V7" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <rect x="1" y="7" width="12" height="8" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            <ul>
              <li>
                Design posted <a href={report.question.designUrl}><time dateTime={report.question.postedOn}>{report.question.postedOn}</time></a>
              </li>
              <li>
                Sealed <time dateTime={report.reportedAt}>{formatUtcMinute(report.reportedAt)}</time>
              </li>
              <li>{lockAnchor === undefined ? "No timestamp proof" : anchorState(lockAnchor).seal}</li>
              <li>{venue}</li>
              <li>
                {formatCount(accountedFor)} of {formatCount(cells.expected)} planned calls accounted for
              </li>
            </ul>
          </div>

          <div className="claim-blocks">
            <section className="claim-block" aria-labelledby="claim-ran-title">
              <h2 id="claim-ran-title" className="claim-label">What exactly ran</h2>
              <dl className="claim-facts">
                <div className="claim-chooser">
                  <dt>Who chose the tasks</dt>
                  <dd>
                    {taskChoice === undefined ? (
                      <strong className="claim-block-headline">Not stated.</strong>
                    ) : (
                      <>
                        <strong className="claim-block-headline">{TASK_CHOOSER_VALUE[taskChoice.chooser]}</strong>{" "}
                        <span>
                          {TASK_CHOOSER_OTHERS[taskChoice.chooser]}{" "}
                          <span className="claim-block-note">{taskChoice.basis(report)}</span>
                        </span>
                      </>
                    )}
                  </dd>
                </div>
                <div className="claim-fact">
                  <dt>Method</dt>
                  <dd>
                    {method ?? report.subject.benchmark.name}{version === null ? "" : ` ${version}`},{" "}
                    {author === null
                      ? "author not stated"
                      : authorIsOwner
                        ? "written by the claimant"
                        : <>written by signing key <code>{shortKey(author)}</code></>}
                    . All {formatCount(report.population.items)} planned items,{" "}
                    {formatCount(cells.expected)} planned calls.
                  </dd>
                </div>
                <div className="claim-fact">
                  <dt>Arms</dt>
                  <dd>
                    {capitalise(countWord(armCount))} grading prompts, supplied by the claimant. Colophon
                    does not look inside them.
                  </dd>
                </div>
                <div className="claim-fact">
                  <dt>Scorer</dt>
                  <dd>
                    The method&apos;s own, fixed in the sealed run: <code>{report.execution.modelSnapshot.id}</code> at
                    temperature {report.execution.modelSnapshot.temperature}, through{" "}
                    <code>{report.subject.harness.id} {report.subject.harness.version}</code>. The majority of{" "}
                    {report.execution.replicates} calls decides each answer.
                  </dd>
                </div>
              </dl>
            </section>

            <section className="claim-block" aria-labelledby="claim-who-title">
              <h2 id="claim-who-title" className="claim-label">Who ran it</h2>
              <p className="claim-block-headline">{venue}</p>
              <p>The claimant ran it. The sealed disclosure opens:</p>
              {disclosureFirstLine !== undefined && (
                <blockquote className="claim-quote">
                  <p>&ldquo;{disclosureFirstLine}&rdquo;</p>
                </blockquote>
              )}
              <p className="claim-block-note">Checking the files later does not change who ran it.</p>
            </section>

            <section className="claim-block" aria-labelledby="claim-why-title">
              <h2 id="claim-why-title" className="claim-label">Why believe it</h2>
              <p className="claim-block-headline">You do not have to. Recompute it.</p>
              <ol className="claim-steps">
                <li>
                  {archive === null ? (
                    <>
                      Download every file under <a href={`${bundleBase}/bundle.json`}>the bundle&apos;s
                      address</a>, keeping paths, into a folder named <code>bundle</code>.
                    </>
                  ) : (
                    <>
                      <a href={archive.url}>Download the bundle</a> ({archive.size}) and unpack it. It
                      unpacks to one folder named by its evidence ID; rename that folder to{" "}
                      <code>bundle</code>.
                    </>
                  )}
                </li>
                <li>
                  Run the checker the bundle names on that folder:
                  <div role="group" aria-label="Check command">
                    <CopyCommand value={checkCommand} />
                  </div>
                </li>
              </ol>
              <p className="claim-block-note">
                Free, for anyone, on the published files. npx fetches the checker from npm; the check
                itself opens no network connection, needs no account and uploads nothing. Checking ends
                at the math, not at honesty.
              </p>
            </section>
          </div>

          <section id="bundle" className="claim-evidence" aria-labelledby="claim-evidence-title">
            <h2 id="claim-evidence-title" className="claim-hidden-heading">Evidence</h2>
            <dl className="claim-evidence-row">
              <div className="claim-evidence-id">
                <dt>Evidence ID</dt>
                <dd>
                  <div role="group" aria-label="Evidence ID">
                    <CopyCommand value={report.digests.bundleIdentity} />
                  </div>
                </dd>
              </div>
              <div>
                <dt>Format</dt>
                <dd><code>{size.format}</code></dd>
              </div>
              <div>
                <dt>Size</dt>
                <dd>
                  <code>{formatMegabytes(size.bytes)}, {formatCount(size.files)} files</code>
                </dd>
              </div>
              <div>
                <dt>Download</dt>
                <dd>
                  {archive === null ? (
                    <a href={`${bundleBase}/bundle.json`}>File list</a>
                  ) : (
                    <a href={archive.url}>tar.gz archive, {archive.size}</a>
                  )}
                </dd>
              </div>
            </dl>
            <p className="claim-evidence-note">
              The evidence ID is the SHA-256 of <code>bundle.json</code>, the bundle&apos;s file list, which
              records the SHA-256 of every other file.
            </p>
            <details className="report-details claim-evidence-details">
              <summary>Other IDs, the timestamp proof and every file</summary>
              <div className="report-details-body">
                <h3 className="narrative-heading">Check it step by step</h3>
                <pre className="codeblock claim-steps-code">{exactSteps}</pre>
                <p className="code-note">
                  Needs Node 22 or newer. The checker reports {report.verification.checks.length} checks:{" "}
                  <code>{report.verification.checks.join(", ")}</code>. Releases before 0.2.1 refuse this
                  format, 0.2.0 included, so run the exact version above.
                </p>

                <h3 className="narrative-heading">Other IDs</h3>
                <dl className="claim-ids">
                  {key.kind === "locked-method" && (
                    <IdRow
                      label="Board key: the locked method"
                      file={<a href={`${bundleBase}/benchmark.json`} download>benchmark.json</a>}
                      value={key.digest}
                      note="The SHA-256 of the method as locked. It is no official suite, so claims sealed on this same method share this key."
                    />
                  )}
                  <IdRow
                    label="Run record"
                    file={<a href={`${bundleBase}/run.json`} download>run.json</a>}
                    value={report.digests.runSha256}
                    note={`Unique to this claim. The timestamp proof covers it. Its close time, ${formatUtc(runCloseAt(report))}, is the sealed time printed above.`}
                  />
                  <IdRow
                    label="Report"
                    file={<a href={`${bundleBase}/report.json`} download>report.json</a>}
                    value={report.digests.reportSha256}
                  />
                  <IdRow
                    label="Signed report"
                    file={<a href={`${bundleBase}/report-envelope.json`} download>report-envelope.json</a>}
                    value={report.digests.reportEnvelopeSha256}
                  />
                  <IdRow
                    label="Result matrix"
                    file={<a href={`${bundleBase}/matrix.json`} download>matrix.json</a>}
                    value={report.digests.matrixSha256}
                  />
                  <IdRow
                    label="Reading record for this page"
                    value={report.presentationSource.sha256}
                    note={report.presentationSource.carriage === "sealed-bundle-member"
                      ? "Carried inside the bundle."
                      : "Supplied at publication beside the bundle, not inside it, so the bundle stays byte for byte as its run produced it."}
                  />
                </dl>

                <h3 className="narrative-heading">Timestamp proof</h3>
                {report.anchors.length === 0 ? (
                  <p className="report-reading">No timestamp proof is included yet.</p>
                ) : (
                  <dl className="claim-ids">
                    {report.anchors.map((anchor) => {
                      const state = anchorState(anchor);
                      return (
                        <IdRow
                          key={anchor.recordSha256}
                          label="Timestamp proof"
                          file={
                            <a href={`${bundleBase}/anchors/${anchor.recordSha256}.bin`} download>
                              proof file {shortId(anchor.recordSha256)}
                            </a>
                          }
                          value={anchor.recordSha256}
                          note={`${anchorKind(anchor)}, covering ${anchorCovers(anchor)}. State, as the proof`
                            + ` records it: ${state.state.toLowerCase()}. ${state.detail}`}
                        />
                      );
                    })}
                  </dl>
                )}
                <p className="code-note">
                  A timestamp dates the bytes it covers; it does not validate the method, the run, or the
                  conclusions.
                </p>

                <h3 className="narrative-heading">Every file</h3>
                <p className="code-note">
                  The bundle holds {[
                    plural(report.memberCounts.records, "evidence record"),
                    plural(report.memberCounts.anchors, "timestamp proof"),
                    ...(report.memberCounts.native === 0
                      ? []
                      : [plural(report.memberCounts.native, "raw grading log")]),
                  ].join(", ")} and the complete result matrix. Its file list,{" "}
                  <a href={`${bundleBase}/bundle.json`} download>bundle.json</a>, names{" "}
                  {formatCount(size.listedFiles)} files, {formatCount(size.listedBytes)} bytes; with the list
                  itself, {formatCount(size.files)} files, {formatCount(size.bytes)} bytes. Every file is
                  served here byte for byte, under <code>{bundleBase}/</code>. The main files:
                </p>
                <div className="table-scroll">
                  <table className="data-table file-list">
                    <thead>
                      <tr>
                        <th>File</th>
                        <th className="num">Bytes</th>
                        <th>SHA-256</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.canonicalFiles.map((file) => (
                        <tr key={file.path}>
                          <td className="mono">
                            <a href={`${bundleBase}/${file.path}`} download>{file.path}</a>
                          </td>
                          <td className="num mono muted">{formatCount(file.bytes)}</td>
                          <td className="digest">{file.sha256}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {report.provenance.siblingAnalyses.length > 0 && (
                  <div className="table-scroll">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Additional analysis</th>
                          <th>Report</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.provenance.siblingAnalyses.map((sibling) => (
                          <tr key={sibling.reportSha256}>
                            <td className="mono">{sibling.method}@{sibling.version}</td>
                            <td className="digest">{sibling.reportSha256}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <h3 className="narrative-heading">Cite this claim</h3>
                <div role="group" aria-label="Citation" className="claim-cite">
                  <CopyCommand value={citation} />
                </div>
              </div>
            </details>
          </section>
        </div>

        <div className="claim-report-intro">
          <p className="claim-label">The claimant&apos;s report</p>
          <p className="claim-report-note">
            Below is the claimant&apos;s report. Its prose is taken from the claimant&apos;s reading
            record; the headings, charts, tables and the short notes around them are Colophon&apos;s,
            drawn from the sealed numbers. The lead above is Colophon&apos;s.
          </p>
          <p className="claim-revision">
            Wording revised <time dateTime={WORDING_REVISED}>{WORDING_REVISED}</time>. The sealed evidence
            bundle and every number are byte-identical and unchanged.
          </p>
        </div>

        <nav className="report-contents" aria-label="Report contents">
          {ORDER.map((id) => {
            const label = NAV_LABELS[id];
            return label === null ? null : <a key={id} href={`#${id}`}>{label}</a>;
          })}
        </nav>

        {narrative.has("opening") && (
          <section id="opening" className="report-section report-opening">
            <p className="section-rail-label">About this benchmark</p>
            <div className="report-opening-copy">{prose("opening")}</div>
          </section>
        )}

        <section id="five-questions" className="report-section">
          <ReportSectionHead
            title={heading("five-questions", "The five questions and their answers")}
            standfirst="These questions were published in the experiment design before the benchmark ran."
          />
          <ol className="question-answer-list">
            {report.question.preRegistered.map((item, index) => (
              <li key={item.id}>
                <span className="question-number">Q{index + 1}</span>
                <p className="question-text">{item.question}</p>
                <p className="answer-text">{item.answer}</p>
              </li>
            ))}
          </ol>
          {prose("five-questions")}
          <Footnote marker="1" href={report.question.designUrl}>
            The design was posted publicly on {report.question.postedOn}, before any official result
            existed.
          </Footnote>
        </section>

        <section id="result" className="report-section">
          <ReportSectionHead
            title="Results"
            standfirst={report.result.methodStatement}
          />
          <div className="report-figures">
            <AgreementChart arms={report.result.perArm} />
            <FalseAcceptanceChart arms={report.result.perArm} />
          </div>
          <details className="report-details exact-results">
            <summary>View exact rates, counts, and intervals</summary>
            <div className="report-details-body">
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Judge</th>
                      <th className="num">Agreement</th>
                      <th className="num">95% interval</th>
                      <th className="num">Accepts specific-wrong</th>
                      <th className="num">Accepts vague-topical-wrong</th>
                      <th className="num">Rejects correct</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.result.perArm.map((arm) => (
                      <tr key={arm.armId}>
                        <td className="mono">{arm.armId}</td>
                        <td className="num mono">{rate(arm.agreement)}</td>
                        <td className="num mono muted">{interval(arm.agreement)}</td>
                        <td className="num mono">{rate(arm.acceptsSpecificWrong)}</td>
                        <td className="num mono">{rate(arm.acceptsVagueTopicalWrong)}</td>
                        <td className="num mono">{rate(arm.rejectsCorrect)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Footnote marker="2" href="#method">
                Spread runs from <code>{report.result.spread.lowestArmId}</code> to{" "}
                <code>{report.result.spread.highestArmId}</code>, {report.result.spread.pointsBetween}{" "}
                points apart on the same items.
              </Footnote>
            </div>
          </details>
          {report.manipulationCheck.companionChecks.length > 0 && (
            <div className="additional-results">
              <h3 className="narrative-heading">Results from two additional tests</h3>
              <p className="report-reading">
                The wrong-key test directly answers Q5 and explains the exception in Q2. The
                consistency test checks a separate property: whether equivalent answers receive
                the same verdict.
              </p>
              <div className="additional-result-list">
                {report.manipulationCheck.companionChecks
                  .map((check) => {
                    const isWrongKey = check.name === "Behavior with a wrong answer key";
                    return {
                      ...check,
                      relation: isWrongKey ? "Answers Q5 and qualifies Q2" : "Separate consistency diagnostic",
                      title: isWrongKey
                        ? "When the answer key is wrong"
                        : "Equivalent answers should receive the same verdict",
                      note: isWrongKey
                        ? "This is where stricter grading creates a real cost."
                        : "The two graders that stayed consistent accepted every probe, so consistency alone is not correctness.",
                      order: isWrongKey ? 0 : 1,
                    };
                  })
                  .sort((left, right) => left.order - right.order)
                  .map((check) => (
                    <article key={check.name}>
                      <p className="additional-result-relation">{check.relation}</p>
                      <div>
                        <h4>{check.title}</h4>
                        <p><strong>{check.finding}</strong> {check.note}</p>
                      </div>
                    </article>
                  ))}
              </div>
            </div>
          )}
          <p className="report-reading">{report.result.interpretation}</p>
        </section>

        <section id="recommendations" className="report-section">
          <ReportSectionHead
            title={heading("recommendations", "Recommendations")}
          />
          {prose("recommendations")}
        </section>

        <section id="disclosure-standard" className="report-section">
          <ReportSectionHead
            title={heading("disclosure-standard", "The six variables behind this score")}
          />
          {prose("disclosure-standard")}
          {disclosure !== null && (
            <>
              <h3 className="narrative-heading">Machine-readable declaration</h3>
              <div className="table-scroll">
                <table className="data-table disclosure-table">
                  <thead>
                    <tr>
                      <th>Variable</th>
                      <th>Status</th>
                      <th>What the record says</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DISCLOSURE_VARIABLE_KEYS.map((variable) => {
                      const entry = disclosure.variables[variable];
                      return (
                        <tr key={variable}>
                          <td className="disclosure-variable">
                            <span>{disclosureVariableLabel(variable)}</span>
                            <code>{variable}</code>
                          </td>
                          <td>
                            <Tag tone={STATUS_TONE[entry.status]}>{STATUS_LABEL[entry.status]}</Tag>
                          </td>
                          <td>
                            <DisclosureDetail entry={entry} bundleBase={bundleBase} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Footnote marker="3" href={`${bundleBase}/${disclosure.recordPath}`}>
                The downloadable evidence package includes this declaration as verified data,
                identified by {shortId(disclosure.recordSha256)}.
              </Footnote>
            </>
          )}
        </section>

        <section id="method" className="report-section">
          <ReportSectionHead
            title="How the benchmark was run"
            standfirst="Six grading configurations judged the same 240 answers using the same model version and settings."
          />
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Grading configuration</th>
                  <th>Prompt tested</th>
                </tr>
              </thead>
              <tbody>
                {report.subject.arms.map((arm) => (
                  <tr key={arm.id}>
                    <td className="mono">{arm.id}</td>
                    <td>{arm.label}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="method-grid">
            <div className="record-card">
              <span className="eyebrow">Held constant</span>
              <dl className="kv">
                <dt>Judge model</dt>
                <dd>{report.subject.judgeModel}</dd>
                <dt>Model settings</dt>
                <dd>
                  {report.execution.modelSnapshot.id}, temperature{" "}
                  {report.execution.modelSnapshot.temperature}
                </dd>
                <dt>Evaluation software</dt>
                <dd>
                  {report.subject.harness.id}@{report.subject.harness.version}
                </dd>
                <dt>Repeated grading</dt>
                <dd>Each answer was graded {report.execution.replicates} times per configuration</dd>
                <dt>Final verdict</dt>
                <dd>Majority of the {report.execution.replicates} calls</dd>
                <dt>Confidence intervals</dt>
                <dd>95% Wilson intervals</dd>
              </dl>
            </div>
            <div className="record-card">
              <span className="eyebrow">Answers and labels</span>
              <dl className="kv">
                <dt>Answer bank</dt>
                <dd>{report.population.items} candidate answers, balanced across three correctness classes</dd>
                <dt>Correctness labels</dt>
                <dd>A model screened every label; the claimant reviewed flagged cases and a random sample</dd>
                <dt>Grading prompts</dt>
                <dd>
                  {report.execution.judgePrompts.count}, {report.execution.judgePrompts.provenance}
                </dd>
                <dt>Run operator</dt>
                <dd>
                  {who.kind === "signing-key"
                    ? <>The claimant, signing key {shortKey(who.value)}</>
                    : "The claimant"}
                </dd>
              </dl>
            </div>
          </div>
          {report.manipulationCheck.companionChecks.length > 0 && (
            <>
              <h3 className="narrative-heading">How the additional tests were run</h3>
              <p className="report-reading">
                The consistency test used 12 constructed list-answer probes, five applicable
                grading configurations, and three calls per probe, for 180 calls. The wrong-key
                test used 20 questions under both the official and corrected answer keys, six
                configurations, and three calls per case, for 720 calls. All planned calls
                completed.
              </p>
            </>
          )}
        </section>

        <section id="does-not-establish" className="report-section">
          <ReportSectionHead
            title={heading("does-not-establish", "What this does not show")}
          />
          {prose("does-not-establish")}
        </section>

        <section id="data-verification" className="report-section">
          <ReportSectionHead title={heading("reproducibility", "Data and verification")} />
          {reproducibility !== undefined && (
            <>
              <NarrativeBlocks
                blocks={reproducibilitySplit === -1
                  ? reproducibility.blocks
                  : reproducibility.blocks.slice(0, reproducibilitySplit)}
              />
              {reproducibilitySplit !== -1 && (
                <details className="report-details">
                  <summary>{(reproducibility.blocks[reproducibilitySplit] as { text: string }).text}</summary>
                  <div className="report-details-body">
                    <NarrativeBlocks blocks={reproducibility.blocks.slice(reproducibilitySplit + 1)} />
                  </div>
                </details>
              )}
            </>
          )}
          <p className="report-reading">
            The bundle, its IDs and the check command are in the <a href="#bundle">evidence row</a> at
            the top of this page.
          </p>
        </section>

        {narrative.has("materials") && (
          <section id="materials" className="report-section">
            <ReportSectionHead title={heading("materials", "Materials, credit, and license")} />
            {prose("materials")}
          </section>
        )}

        <section id="accounting" className="report-section">
          <ReportSectionHead
            title="Every planned call, accounted for"
            standfirst="Every judge call the run planned is counted here, including the ones that failed. No flag drops a row."
          />
          <p className="report-reading">
            All {cells.expected.toLocaleString("en-US")} planned judge calls completed. Twenty-two
            responses could not be parsed, which excluded seven evidence-fed items from that comparison.
          </p>
          <CompletenessBar
            size="lg"
            total={cells.expected}
            label={`${cells.expected} expected judge calls`}
            segments={[
              { verdict: "met", label: "completed", count: cells.judged },
              { verdict: "incomplete", label: "lost", count: cells.lost },
            ]}
          />
          <div className="accounting-grid">
            <div className="table-scroll">
              <table className="data-table">
                <caption className="claim-caption">Planned judge calls, by outcome</caption>
                <thead>
                  <tr>
                    <th scope="col">Outcome</th>
                    <th scope="col" className="num">Calls</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Judged, with a verdict the parser could read</td>
                    <td className="num mono">{formatCount(readableCalls)}</td>
                  </tr>
                  <tr>
                    <td>Judged, but the response could not be parsed</td>
                    <td className="num mono">{formatCount(report.accounting.parserNeutral.calls)}</td>
                  </tr>
                  <tr>
                    <td>Not judged: lost or not run</td>
                    <td className="num mono">{formatCount(cells.lost)}</td>
                  </tr>
                  <tr className="claim-total">
                    <td>All planned calls</td>
                    <td className="num mono">{formatCount(cells.expected)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="table-scroll">
              <table className="data-table">
                <caption className="claim-caption">Items excluded, by grading configuration</caption>
                <thead>
                  <tr>
                    <th scope="col">Configuration</th>
                    <th scope="col" className="num">Items</th>
                  </tr>
                </thead>
                <tbody>
                  {report.subject.arms.map((arm) => (
                    <tr key={arm.id}>
                      <td className="mono">{arm.id}</td>
                      <td className="num mono">{excludedByArm.get(arm.id) ?? 0}</td>
                    </tr>
                  ))}
                  <tr className="claim-total">
                    <td>Total</td>
                    <td className="num mono">{report.accounting.excludedItems.count}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <p className="report-reading">
            The record&apos;s reason for the exclusions: &ldquo;{report.accounting.parserNeutral.note}&rdquo;
          </p>
          <p className="report-reading">
            The method&apos;s pre-set minimum for a complete run:{" "}
            {formatPercent(report.accounting.completenessFloor)} of planned calls judged. This run judged{" "}
            {formatCount(cells.judged)} of {formatCount(cells.expected)}; its recorded outcome is{" "}
            {report.accounting.runOutcome}.
          </p>
          <p className="report-reading">
            <strong>Repeat stability.</strong> Repeat disagreement was 1.6% overall and 2.9% in
            the least stable grading configuration.
          </p>
          <Footnote marker="3">
            Responses that could not be parsed were treated as neither correct nor incorrect. All
            22 occurred in the evidence-fed configuration.
          </Footnote>
        </section>
      </main>
      <SiteFooter quiet />
    </>
  );
}
