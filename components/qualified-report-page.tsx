import type { CSSProperties, ReactNode } from "react";
import { CompletenessBar, Footnote, Tag } from "@/components/ds";
import { CiteBlock } from "@/components/ds-client";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  DISCLOSURE_VARIABLE_KEYS,
  disclosureVariableLabel,
  formatPercent,
  formatUtc,
  shortDigest,
  type DisclosureVariableEntry,
  type IntegrityAnchor,
  type NarrativeBlock,
  type NarrativeSection,
  type Proportion,
  type QualifiedReportData,
} from "@/lib/reports";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

/**
 * A carried proof reports the state embedded in its own bytes. This site
 * supplies no trust material and evaluates none, so a well-formed proof reads
 * as present, never as verified.
 */
function anchorState(anchor: IntegrityAnchor): { label: string; detail: string } {
  if (anchor.facts.pending === true) {
    return { label: "Pending", detail: "Calendar submission accepted; no block attestation yet." };
  }
  if (typeof anchor.facts.blockHeight === "number") {
    return { label: "Attested", detail: `Bitcoin block ${anchor.facts.blockHeight}.` };
  }
  if (typeof anchor.facts.genTime === "string") {
    return { label: "Timestamped", detail: `Authority time ${anchor.facts.genTime}.` };
  }
  return { label: "Present", detail: "The proof carries no time fact this page reads." };
}

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
                <code>{shortDigest(citation.digest.sha256)}</code>
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
};

export function QualifiedReportPage({ report }: { report: QualifiedReportData }) {
  const bundleBase = `/reports/${report.slug}/bundle`;
  const disclosure = report.disclosure;
  const narrative = new Map((report.narrative ?? []).map((s: NarrativeSection) => [s.slot, s]));
  const prose = (slot: string) => {
    const section = narrative.get(slot);
    if (section === undefined) return null;
    return <NarrativeBlocks blocks={section.blocks} />;
  };
  const heading = (slot: string, fallback: string) => narrative.get(slot)?.heading ?? fallback;
  const cells = report.accounting.cells;

  const verifyTab = [
    "# download the bundle directory, preserving paths, then:",
    report.verification.command,
    `# returns ${report.verification.checks.length} checks: ${report.verification.checks.join(", ")}`,
  ].join("\n");
  const digestsTab = [
    `bundle identity  sha256:${report.digests.bundleIdentity}`,
    `report envelope  sha256:${report.digests.reportEnvelopeSha256}`,
    `report           sha256:${report.digests.reportSha256}`,
    `matrix           sha256:${report.digests.matrixSha256}`,
    `run              sha256:${report.digests.runSha256}`,
    `benchmark        sha256:${report.digests.benchmarkSha256}`,
    ...(disclosure === null ? [] : [`disclosure       sha256:${disclosure.recordSha256}`]),
  ].join("\n");
  const citeTab = [
    `${report.title}.`,
    `${report.format}, identity sha256:${report.digests.bundleIdentity}.`,
    `Report sha256:${report.digests.reportSha256}.`,
    `${report.subject.benchmark.name}, ${report.population.items} items, ${report.subject.arms.length} arms, ${report.execution.replicates} judge calls per item-arm cell.`,
    `Operated by the report authors; limitations in the report. Verify: ${report.verification.command}`,
  ].join("\n");

  return (
    <>
      <SiteHeader quiet />
      <main className="report-main benchmark-report">
        <div className="report-masthead benchmark-masthead">
          <div className="report-meta">
            <span>{report.subject.benchmark.name} judge benchmark</span>
            <span>·</span>
            <span>{formatUtc(report.reportedAt)}</span>
          </div>
          <h1>{report.title}</h1>
          <p className="report-standfirst benchmark-finding">{report.result.primary}</p>
          <p className="benchmark-scope">{report.summary} This evaluates graders, not memory systems.</p>
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
                    {DISCLOSURE_VARIABLE_KEYS.map((key) => {
                      const entry = disclosure.variables[key];
                      return (
                        <tr key={key}>
                          <td className="disclosure-variable">
                            <span>{disclosureVariableLabel(key)}</span>
                            <code>{key}</code>
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
                identified by {shortDigest(disclosure.recordSha256)}.
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
                <dd>A model screened every label; the authors reviewed flagged cases and a random sample</dd>
                <dt>Grading prompts</dt>
                <dd>
                  {report.execution.judgePrompts.count}, {report.execution.judgePrompts.provenance}
                </dd>
                <dt>Run operator</dt>
                <dd>The report authors</dd>
              </dl>
            </div>
          </div>
          <h3 className="narrative-heading">Run completeness</h3>
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
                <thead>
                  <tr>
                    <th>Outcome</th>
                    <th className="num">Calls</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Expected</td>
                    <td className="num mono">{cells.expected}</td>
                  </tr>
                  <tr>
                    <td>Completed</td>
                    <td className="num mono">{cells.judged}</td>
                  </tr>
                  <tr>
                    <td>Lost</td>
                    <td className="num mono">{cells.lost}</td>
                  </tr>
                  <tr>
                    <td>Could not be parsed</td>
                    <td className="num mono">{report.accounting.parserNeutral.calls}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Items excluded, by configuration</th>
                    <th className="num">Items</th>
                  </tr>
                </thead>
                <tbody>
                  {report.accounting.excludedItems.byArm.map((row) => (
                    <tr key={row.armId}>
                      <td className="mono">{row.armId}</td>
                      <td className="num mono">{row.items}</td>
                    </tr>
                  ))}
                  <tr>
                    <td>Total</td>
                    <td className="num mono">{report.accounting.excludedItems.count}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <p className="report-reading">
            <strong>Repeat stability.</strong> Repeat disagreement was 1.6% overall and 2.9% in
            the least stable grading configuration.
          </p>
          <Footnote marker="3">
            Responses that could not be parsed were treated as neither correct nor incorrect. All
            22 occurred in the evidence-fed configuration.
          </Footnote>
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

        <section id="data-verification" className="report-section evidence-section">
          <ReportSectionHead
            title="Data and verification"
            standfirst={`Download the full result data, grading outputs, prompts, and analysis files. The package contains ${[
              plural(report.memberCounts.records, "evidence record"),
              plural(report.memberCounts.anchors, "timestamp proof"),
              ...(report.memberCounts.native === 0
                ? []
                : [plural(report.memberCounts.native, "native log")]),
            ].join(", ")} and the complete result matrix.`}
          />
          <p className="report-reading">
            Colophon packages these materials and checks that the files used by this report have
            not changed since publication.
          </p>
          <p className="report-reading evidence-note">
            File verification confirms the integrity of the published materials. It does not prove
            that the correctness labels are right or independently verify the model provider&apos;s
            internal execution.
          </p>
          <p className="code-note">Independent timestamping is pending.</p>
          <CiteBlock
            tabs={[
              { id: "verify", label: "Verify files", value: verifyTab },
              { id: "digests", label: "File identifiers", value: digestsTab },
              { id: "cite", label: "Cite", value: citeTab },
            ]}
          />
          <details className="report-details">
            <summary>Technical verification details</summary>
            <div className="report-details-body">
              <p className="code-note">
                Older verifier versions refuse this package format. Use{" "}
                <code>{report.verification.compatibleCommand}</code>.
              </p>
              <h3 className="narrative-heading">Timestamp record</h3>
              {report.anchors.length === 0 ? (
                <p className="report-reading">No third-party timestamp proof is included yet.</p>
              ) : (
                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Subject</th>
                        <th>State</th>
                        <th>Provider</th>
                        <th>Proof</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.anchors.map((anchor) => {
                        const state = anchorState(anchor);
                        return (
                          <tr key={anchor.recordSha256}>
                            <td className="mono">{anchor.subject}</td>
                            <td>
                              <Tag tone={state.label === "Pending" ? "outline" : "ink"}>{state.label}</Tag>
                              <p className="anchor-detail">{state.detail}</p>
                            </td>
                            <td className="mono muted">{anchor.provider}</td>
                            <td className="mono">
                              <a href={`${bundleBase}/anchors/${anchor.recordSha256}.bin`} download>
                                {shortDigest(anchor.recordSha256)}
                              </a>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="code-note">
                A timestamp dates the bytes it covers; it does not validate the benchmark design,
                execution, or conclusions.
              </p>
              {narrative.get("reproducibility") !== undefined && (
                <NarrativeBlocks blocks={narrative.get("reproducibility")!.blocks.slice(3)} />
              )}
              <Footnote marker="4" href={`/reports/${report.slug}/`}>
                {report.presentationSource.carriage === "sealed-bundle-member"
                  ? <>The reading record for this page is included in the evidence package.</>
                  : <>The reading record for this page was supplied at publication as{" "}
                    {shortDigest(report.presentationSource.sha256)}. The run&apos;s evidence package
                    remains byte-for-byte unchanged.</>}
              </Footnote>
              <div className="bundle-identity">
                <span>Package identity</span>
                <code>sha256:{report.digests.bundleIdentity}</code>
                <span>Report envelope</span>
                <code>sha256:{report.digests.reportEnvelopeSha256}</code>
                <span>Files</span>
                <code>{report.memberCounts.total.toLocaleString("en-US")}</code>
              </div>
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
                        <td className="num mono muted">{formatBytes(file.bytes)}</td>
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
            </div>
          </details>
        </section>

        {narrative.has("materials") && (
        <section id="materials" className="report-section">
            <ReportSectionHead title={heading("materials", "Materials, credit, and license")} />
            {prose("materials")}
          </section>
        )}
      </main>
      <SiteFooter quiet />
    </>
  );
}
