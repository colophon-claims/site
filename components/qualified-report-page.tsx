import type { ReactNode } from "react";
import { Callout, CompletenessBar, Footnote, Imprint, MethodLock, SectionHead, Tag } from "@/components/ds";
import { CiteBlock } from "@/components/ds-client";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  DISCLOSED_BUNDLE_FORMAT,
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

const STATUS_TONE = {
  "measured-here": "ink",
  "disclosed-by-publisher": "indigo",
  undisclosed: "outline",
} as const;

const STATUS_LABEL = {
  "measured-here": "Measured here",
  "disclosed-by-publisher": "Disclosed by publisher",
  undisclosed: "Undisclosed",
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
 * Renders the report's own inline notation: `code` spans and [text](url) links.
 * The prose is carried verbatim, so the markdown it was written in is resolved
 * here rather than stripped out of the record.
 */
function Inline({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  const pattern = /`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)/gu;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    if (match[1] !== undefined) {
      parts.push(<code key={parts.length}>{match[1]}</code>);
    } else {
      parts.push(<a key={parts.length} href={match[3]}>{match[2]}</a>);
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
          return (
            <ul key={index} className="limits-list narrative-list">
              {block.items.map((item) => <li key={item}><Inline text={item} /></li>)}
            </ul>
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

export function QualifiedReportPage({ report }: { report: QualifiedReportData }) {
  const bundleBase = `/reports/${report.slug}/bundle`;
  const disclosure = report.disclosure;
  // Reading order, stated once. Section numbers follow this list, so inserting
  // a narrative section cannot leave the page numbered out of sequence.
  const ORDER = [
    "result", "why-this-matters", "disclosure-standard", "recommendations",
    "method", "accounting", "anchors", "does-not-establish", "bundle", "materials",
  ];
  const num = (id: string) => String(ORDER.indexOf(id) + 1).padStart(2, "0");
  const narrative = new Map((report.narrative ?? []).map((s: NarrativeSection) => [s.slot, s]));
  const prose = (slot: string) => {
    const section = narrative.get(slot);
    return section === undefined ? null : <NarrativeBlocks blocks={section.blocks} />;
  };
  const heading = (slot: string, fallback: string) => narrative.get(slot)?.heading ?? fallback;
  const cells = report.accounting.cells;
  const instability = report.manipulationCheck.replicateInstability;

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
    `${report.execution.venue} venue; limitations in the report. Verify: ${report.verification.command}`,
  ].join("\n");

  return (
    <>
      <SiteHeader />
      <main className="report-main">
        <div className="report-masthead">
          <div className="report-meta">
            <span>Colophon report</span>
            <span>·</span>
            <span>{report.subject.benchmark.name}</span>
            <span>·</span>
            <span>{formatUtc(report.reportedAt)}</span>
            <span>·</span>
            <span>{report.slug}</span>
          </div>
          <h1>{report.title}</h1>
          <p className="report-standfirst">{report.summary}</p>
          <MethodLock
            state="locked"
            digest={`sha256:${report.digests.runSha256}`}
            detailHref="#method"
          />
        </div>

        {narrative.has("opening") && (
          <section id="opening" className="report-section report-opening">
            {prose("opening")}
          </section>
        )}

        <section id="result" className="report-section">
          <SectionHead
            number={num("result")}
            title="Result"
            standfirst={report.result.methodStatement}
          />
          <p className="report-reading">{report.result.primary}</p>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Arm</th>
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
          <Footnote marker="2" href="#accounting">
            Spread runs from <code>{report.result.spread.lowestArmId}</code> to{" "}
            <code>{report.result.spread.highestArmId}</code>, {report.result.spread.pointsBetween}{" "}
            points apart on the same items.
          </Footnote>
          <p className="report-reading">{report.result.interpretation}</p>
        </section>

        <section id="why-this-matters" className="report-section">
          <SectionHead
            number={num("why-this-matters")}
            title={heading("why-this-matters", "Why this matters")}
          />
          {prose("why-this-matters")}
        </section>

        <section id="disclosure" className="report-section">
          <SectionHead
            number={num("disclosure-standard")}
            title={heading("disclosure-standard", "The six variables behind this score")}
            standfirst="A score is the product of an answer pipeline and a grading pipeline. A comparable result must disclose the six choices that define them."
          />
          {prose("disclosure-standard")}
          <h3 className="narrative-heading">The declaration carried in the evidence package</h3>
          {disclosure === null ? (
            <Callout kind="note" title="No sealed declaration">
              This bundle predates the sealed disclosure record, so the six variables are not carried
              as data. A {DISCLOSED_BUNDLE_FORMAT} bundle carries them.
            </Callout>
          ) : (
            <>
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
              <Callout kind="method" title="What each status commits to">
                <strong>Measured here</strong> means this bundle carries the sealed bytes that fix
                the variable, and the reader authenticates every citation against the evidence the
                bundle actually carries. <strong>Disclosed by publisher</strong> is an assertion:
                the reader confirms it is well formed and checks nothing else, performing no lookup
                and no cross-check. <strong>Undisclosed</strong> carries a reason and nothing else.
                No score is computed over the six. One of those reasons marks a variable that is
                structurally inapplicable, so six is not a target every experiment can reach, and a
                count would rank experiment shape rather than disclosure.
              </Callout>
              <Footnote marker="1" href={`${bundleBase}/${disclosure.recordPath}`}>
                The declaration is a sealed record in the bundle, {shortDigest(disclosure.recordSha256)},
                written by <code>{disclosure.author}</code> over this run&apos;s result matrix{" "}
                {shortDigest(disclosure.subjectSha256)}, against the standard at{" "}
                <code>{disclosure.specification}</code>.
              </Footnote>
            </>
          )}
        </section>

        <section id="recommendations" className="report-section">
          <SectionHead
            number={num("recommendations")}
            title={heading("recommendations", "Recommendations")}
          />
          {prose("recommendations")}
        </section>

        <section id="method" className="report-section">
          <SectionHead
            number={num("method")}
            title="Method"
            standfirst="The judge prompts under test, the questions fixed before the run, and the settings held constant across every arm."
          />
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Arm</th>
                  <th>Judge prompt</th>
                  <th>Instrument</th>
                </tr>
              </thead>
              <tbody>
                {report.subject.arms.map((arm) => (
                  <tr key={arm.id}>
                    <td className="mono">{arm.id}</td>
                    <td>{arm.label}</td>
                    <td className="digest">{arm.instrumentSha256}</td>
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
                <dt>Snapshot</dt>
                <dd>
                  {report.execution.modelSnapshot.id}, temperature{" "}
                  {report.execution.modelSnapshot.temperature}
                </dd>
                <dt>Harness</dt>
                <dd>
                  {report.subject.harness.id}@{report.subject.harness.version}
                </dd>
                <dt>Judge calls</dt>
                <dd>{report.execution.replicates} per item-arm cell</dd>
                <dt>Reduction</dt>
                <dd>{report.execution.reduction}</dd>
                <dt>Intervals</dt>
                <dd>{report.execution.intervals}</dd>
              </dl>
            </div>
            <div className="record-card">
              <span className="eyebrow">Items and truth</span>
              <dl className="kv">
                <dt>Items</dt>
                <dd>{report.population.items}</dd>
                <dt>Truth admission</dt>
                <dd>{report.execution.truthAdmission}</dd>
                <dt>Labels</dt>
                <dd>{report.population.labels}</dd>
                <dt>Judge prompts</dt>
                <dd>
                  {report.execution.judgePrompts.count}, {report.execution.judgePrompts.provenance}
                </dd>
                <dt>Venue</dt>
                <dd>{report.execution.venue}</dd>
              </dl>
            </div>
          </div>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fixed before the run</th>
                  <th>Answer</th>
                  <th>Proven by</th>
                </tr>
              </thead>
              <tbody>
                {report.question.preRegistered.map((item) => (
                  <tr key={item.id}>
                    <td>{item.question}</td>
                    <td>{item.answer}</td>
                    <td className="mono">{item.provenBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Footnote marker="3" href={report.question.designUrl}>
            The design was posted publicly on {report.question.postedOn}, before any official result
            existed.
          </Footnote>
        </section>

        <section id="accounting" className="report-section">
          <SectionHead
            number={num("accounting")}
            title="Accounting"
            standfirst="Every judge call the locked method expected, and what became of it. Only judged cells enter a denominator."
          />
          <CompletenessBar
            size="lg"
            total={cells.expected}
            label={`${cells.expected} expected judge calls`}
            segments={[
              { verdict: "met", label: "judged", count: cells.judged },
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
                    <td>Judged</td>
                    <td className="num mono">{cells.judged}</td>
                  </tr>
                  <tr>
                    <td>Lost</td>
                    <td className="num mono">{cells.lost}</td>
                  </tr>
                  <tr>
                    <td>Parser-neutral ({report.accounting.parserNeutral.policy})</td>
                    <td className="num mono">{report.accounting.parserNeutral.calls}</td>
                  </tr>
                  <tr>
                    <td>Conflicted cells</td>
                    <td className="num mono">{report.manipulationCheck.conflictedCells}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Items excluded, by arm</th>
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
            <strong>Replicate instability.</strong> {instability.unstableItems} of{" "}
            {instability.gradedItems} graded items changed their item-level majority across
            replicates. Run outcome: {report.accounting.runOutcome}, against a completeness floor of{" "}
            {formatPercent(report.accounting.completenessFloor)}.
          </p>
          <Footnote marker="4">{report.accounting.parserNeutral.note}</Footnote>
          {report.manipulationCheck.companionChecks.length > 0 && (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Companion check</th>
                    <th>Finding</th>
                    <th>Proven by</th>
                  </tr>
                </thead>
                <tbody>
                  {report.manipulationCheck.companionChecks.map((check) => (
                    <tr key={check.name}>
                      <td>{check.name}</td>
                      <td>{check.finding}</td>
                      <td className="mono">{check.provenBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section id="anchors" className="report-section">
          <SectionHead
            number={num("anchors")}
            title="Integrity anchors"
            standfirst="Third-party time evidence over this run's own sealed records, carried in the bundle as the proof's exact bytes."
          />
          {report.anchors.length === 0 ? (
            <Callout kind="note" title="Anchoring declared, none carried">
              The sealed run declared anchoring intent and this bundle carries no proof.
            </Callout>
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
          <Footnote marker="5">
            An anchor dates the bytes it covers and says nothing else about the run: not that results
            were produced after it, and not that the anchoring authority is independent of this
            bundle&apos;s owner. Trust material is the reader&apos;s to supply, so a proof reads here as
            carried, never as evaluated.
          </Footnote>
        </section>

        <section id="limitations" className="report-section">
          <SectionHead
            number={num("does-not-establish")}
            title={heading("does-not-establish", "What this does not show")}
          />
          {prose("does-not-establish")}
          <h3 className="narrative-heading">Venue limitations carried in the claim package</h3>
          <ul className="limits-list" style={{ marginTop: 0 }}>
            {report.limitations.map((limitation) => (
              <li key={limitation}>{limitation}</li>
            ))}
          </ul>
          <Callout kind="limitation" title="Self-run venue">
            {report.selfRunDisclosure}
          </Callout>
        </section>

        <section id="bundle" className="report-section">
          <SectionHead
            number={num("bundle")}
            title="Check it yourself"
            standfirst={`Everything above is derived from the bundle below: ${[
              plural(report.memberCounts.records, "evidence record"),
              plural(report.memberCounts.anchors, "integrity anchor"),
              ...(report.memberCounts.native === 0
                ? []
                : [plural(report.memberCounts.native, "native log")]),
            ].join(", ")}, bound by one manifest. Download the files byte-exact; this site never transforms a published bundle.`}
          />
          <CiteBlock
            tabs={[
              { id: "verify", label: "Verify", value: verifyTab },
              { id: "digests", label: "Digests", value: digestsTab },
              { id: "cite", label: "Cite", value: citeTab },
            ]}
          />
          <p className="code-note">
            Older readers refuse this format by design. The compatible line is{" "}
            <code>{report.verification.compatibleCommand}</code>. Protocol identifiers under{" "}
            <code>https://spec.jinn.network/</code> are names; that origin is not hosted yet.
          </p>
          <Footnote marker="6" href={`/reports/${report.slug}/`}>
            {report.presentationSource.carriage === "sealed-bundle-member"
              ? <>The public reading record this page is written from is sealed into the bundle as{" "}
                <code>presentation.json</code>, covered by the bundle identity below.</>
              : <>The public reading record this page is written from was supplied at publication
                rather than sealed into the bundle, and is published beside this page as{" "}
                {shortDigest(report.presentationSource.sha256)}. The bundle below is the artifact
                the run produced, byte for byte, with nothing added to it.</>}
          </Footnote>
          <div className="bundle-identity">
            <span>Bundle identity</span>
            <code>sha256:{report.digests.bundleIdentity}</code>
            <span>Canonical report envelope</span>
            <code>sha256:{report.digests.reportEnvelopeSha256}</code>
            <span>Manifest members</span>
            <code>{report.memberCounts.total.toLocaleString("en-US")}</code>
          </div>
          <div className="table-scroll">
            <table className="data-table file-list">
              <thead>
                <tr>
                  <th>Bundle file</th>
                  <th className="num">Bytes</th>
                  <th>SHA-256</th>
                </tr>
              </thead>
              <tbody>
                {report.canonicalFiles.map((file) => (
                  <tr key={file.path}>
                    <td className="mono">
                      <a href={`${bundleBase}/${file.path}`} download>
                        {file.path}
                      </a>
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
                    <th>Sibling analysis of the same run</th>
                    <th>Report</th>
                  </tr>
                </thead>
                <tbody>
                  {report.provenance.siblingAnalyses.map((sibling) => (
                    <tr key={sibling.reportSha256}>
                      <td className="mono">
                        {sibling.method}@{sibling.version}
                      </td>
                      <td className="digest">{sibling.reportSha256}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {narrative.has("reproducibility") && (
          <section id="reproducibility" className="report-section">
            <SectionHead
              level={3}
              rule="hair"
              title={heading("reproducibility", "Reproducibility identifiers")}
            />
            {prose("reproducibility")}
          </section>
        )}

        {narrative.has("materials") && (
          <section id="materials" className="report-section">
            <SectionHead
              number={num("materials")}
              title={heading("materials", "Materials, credit, and license")}
            />
            {prose("materials")}
          </section>
        )}

        <section className="report-section report-bridge">
          <p className="prose">
            Made with <a href="/">Colophon</a>. Got a claim you need to stand up?{" "}
            <a href="mailto:ritsu@colophon.claims">Email us</a>.
          </p>
        </section>

        <Imprint
          builtOnJinn={false}
          rows={[
            { label: "Report", value: shortDigest(report.digests.reportSha256) },
            { label: "Bundle", value: shortDigest(report.digests.bundleIdentity) },
            ...(disclosure === null
              ? []
              : [{ label: "Disclosure", value: shortDigest(disclosure.recordSha256) }]),
            { label: "Venue", value: report.execution.venue },
            { label: "Sealed", value: formatUtc(report.reportedAt) },
          ]}
        />
      </main>
      <SiteFooter />
    </>
  );
}
