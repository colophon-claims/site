import { CiteBlock } from "@/components/ds-client";
import { Callout, MethodLock, SectionHead } from "@/components/ds";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  formatUtc,
  shortDigest,
  type BinaryProjection,
  type BinaryQualification,
  type GroupedReportData,
  type PairedMajorityDelta,
  type PairwiseDisagreement,
} from "@/lib/reports";

function percent(value: string | null): string {
  return value === null ? "Withheld" : `${(Number(value) * 100).toFixed(1)}%`;
}

function signed(value: string | null): string {
  if (value === null) return "Withheld";
  const number = Number(value);
  const rendered = `${number > 0 ? "+" : ""}${(number * 100).toFixed(1)} pp`;
  return rendered.replace("-", "−");
}

function rate(projection: BinaryProjection, key: "agreement" | "falseAccept" | "falseReject" | "instability" | "parserInvalid") {
  const value = projection[key];
  return `${percent(value.estimate)} (${value.numerator}/${value.denominator})`;
}

export function GroupedReportPage({ report }: { report: GroupedReportData }) {
  const binaryBundle = report.bundles.find((bundle) => bundle.key === "binary-instrument");
  const pairwiseBundle = report.bundles.find((bundle) => bundle.key === "pairwise-disagreement");
  const deltaBundle = report.bundles.find((bundle) => bundle.key === "paired-majority-delta");
  if (binaryBundle === undefined || pairwiseBundle === undefined || deltaBundle === undefined) {
    throw new Error("grouped report is missing a required bundle");
  }
  const binary = binaryBundle.result as BinaryQualification;
  const pairwise = pairwiseBundle.result as PairwiseDisagreement;
  const delta = deltaBundle.result as PairedMajorityDelta;
  const armEntries = Object.entries(binary.arms);
  const bundleBase = `/reports/${report.slug}/bundle`;
  const verifyText = report.bundles.map((bundle) => [
    `${bundle.label}:`,
    bundle.verification.command.replace("<bundle-dir>", `${bundleBase}/${bundle.key}`),
  ].join("\n")).join("\n\n");
  const digestText = [
    `run     sha256:${report.digests.runSha256}`,
    `matrix  sha256:${report.digests.matrixSha256}`,
    ...report.bundles.map((bundle) => `${bundle.key.padEnd(24)} sha256:${bundle.reportSha256}`),
  ].join("\n");

  return (
    <>
      <SiteHeader />
      <main className="report-main">
        <div className="report-masthead">
          {report.fixture && (
            <Callout kind="caution" title="Synthetic rehearsal">
              This page exists to exercise the grouped publication path. It is not a benchmark result.
            </Callout>
          )}
          <div className="report-meta">
            <span>Colophon grouped report</span><span>·</span>
            <span>{report.scope.taskCount} items</span><span>·</span>
            <span>{report.scope.arms.length} arms</span>
            {report.reportedAt !== null && <><span>·</span><span>{formatUtc(report.reportedAt)}</span></>}
          </div>
          <h1>{report.title}</h1>
          {report.summary !== null && <p className="report-standfirst">{report.summary}</p>}
          <MethodLock
            state="locked"
            digest={`sha256:${report.digests.runSha256}`}
            timestamp={report.lockedAt ?? undefined}
            detailHref="#method"
          />
          <Callout kind="method" title="One run, three reports">
            All three bundles name the same run and matrix. Their report digests are intentionally
            distinct because each applies a different registered analysis.
          </Callout>
        </div>

        <section id="binary" className="report-section">
          <SectionHead
            number="01"
            title="Binary instrument"
            standfirst="Per-arm agreement, false acceptance, false rejection, instability, and parser-invalid calls. Rates show numerator/denominator in parentheses."
          />
          <div className="table-scroll">
            <table className="data-table">
              <thead><tr><th>Arm</th><th>Agreement</th><th>FAR</th><th>FRR</th><th>Instability</th><th>Parser invalid</th></tr></thead>
              <tbody>
                {armEntries.map(([armId, projection]) => (
                  <tr key={armId}>
                    <td className="mono">{armId}</td>
                    <td className="mono">{rate(projection, "agreement")}</td>
                    <td className="mono">{rate(projection, "falseAccept")}</td>
                    <td className="mono">{rate(projection, "falseReject")}</td>
                    <td className="mono">{rate(projection, "instability")}</td>
                    <td className="mono">{rate(projection, "parserInvalid")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3>Class and category strata</h3>
          <div className="table-scroll">
            <table className="data-table">
              <thead><tr><th>Arm</th><th>Slice</th><th>Agreement</th><th>FAR</th><th>FRR</th></tr></thead>
              <tbody>
                {armEntries.flatMap(([armId, projection]) => [
                  ...Object.entries(projection.byCandidateClass).map(([name, slice]) => ({ armId, name: `Class · ${name}`, slice })),
                  ...Object.entries(projection.byStratum).map(([name, slice]) => ({ armId, name: `Category · ${name}`, slice })),
                ]).map(({ armId, name, slice }) => (
                  <tr key={`${armId}/${name}`}>
                    <td className="mono">{armId}</td><td>{name}</td>
                    <td className="mono">{rate(slice, "agreement")}</td>
                    <td className="mono">{rate(slice, "falseAccept")}</td>
                    <td className="mono">{rate(slice, "falseReject")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="pairwise" className="report-section">
          <SectionHead
            number="02"
            title="Pairwise disagreement"
            standfirst="Symmetric item-majority disagreement for every unordered arm pair. This is not a ranking."
          />
          <div className="table-scroll">
            <table className="data-table">
              <thead><tr><th>Arm A</th><th>Arm B</th><th className="num">Items</th><th className="num">Disagreements</th><th className="num">Rate</th><th>95% interval</th></tr></thead>
              <tbody>
                {pairwise.pairs.map((pair) => (
                  <tr key={`${pair.armA}/${pair.armB}`}>
                    <td className="mono">{pair.armA}</td><td className="mono">{pair.armB}</td>
                    <td className="num mono">{pair.n}</td><td className="num mono">{pair.disagreements}</td>
                    <td className="num mono">{percent(pair.rate)}</td>
                    <td className="mono muted">{pair.interval === null ? "Withheld" : `${percent(pair.interval.lower)} to ${percent(pair.interval.upper)}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="delta" className="report-section">
          <SectionHead
            number="03"
            title="Paired-majority delta"
            standfirst={`Candidate minus baseline item-majority agreement: ${delta.candidate} − ${delta.baseline}. Positive means the evidence-declaring arm agreed more often.`}
          />
          <div className="method-grid">
            <div className="grouped-result-card">
              <span className="eyebrow">Overall</span>
              <strong>{signed(delta.delta)}</strong>
              <span>{delta.n} paired items · {delta.clusters.count} clusters</span>
              <span>{delta.interval === null ? delta.reasons.join("; ") || "Interval withheld" : `${signed(delta.interval.lower)} to ${signed(delta.interval.upper)}`}</span>
            </div>
            <div className="table-scroll">
              <table className="data-table">
                <thead><tr><th>Slice</th><th className="num">N</th><th className="num">Delta</th><th>Interval / reason</th></tr></thead>
                <tbody>
                  {[...delta.byCandidateClass.map((row) => ({ ...row, label: `Class · ${row.candidateClass}` })), ...delta.byStratum.map((row) => ({ ...row, label: `Category · ${row.stratum}` }))].map((row) => (
                    <tr key={row.label}>
                      <td>{row.label}</td><td className="num mono">{row.n}</td><td className="num mono">{signed(row.delta)}</td>
                      <td className="mono muted">{row.interval === null ? row.reasons.join("; ") || "Withheld" : `${signed(row.interval.lower)} to ${signed(row.interval.upper)}`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section id="method" className="report-section">
          <SectionHead number="04" title="Method and provenance" standfirst="The shared identities and each independently sealed analysis." />
          <dl className="kv">
            <dt>Run</dt><dd className="mono">{shortDigest(report.digests.runSha256)}</dd>
            <dt>Matrix</dt><dd className="mono">{shortDigest(report.digests.matrixSha256)}</dd>
            <dt>Replicates</dt><dd>{report.scope.replicates} per item-arm cell</dd>
            <dt>Truth admission</dt><dd>{binary.configuration.truthAdmission}</dd>
            <dt>Judge calls</dt><dd>{binary.configuration.k} per item-arm group</dd>
            <dt>Parser-invalid policy</dt><dd>{binary.configuration.parserInvalidPolicy}</dd>
          </dl>
          <div className="table-scroll" style={{ marginTop: "var(--space-7)" }}>
            <table className="data-table">
              <thead><tr><th>Analysis</th><th>Method</th><th>Report</th><th>Bundle</th><th>Download</th></tr></thead>
              <tbody>
                {report.bundles.map((bundle) => (
                  <tr key={bundle.key}>
                    <td>{bundle.label}</td><td className="mono">{bundle.method.id}@{bundle.method.version}</td>
                    <td className="mono">{shortDigest(bundle.reportSha256)}</td>
                    <td className="mono">{shortDigest(bundle.bundleIdentity)}</td>
                    <td><a href={`${bundleBase}/${bundle.key}/bundle.json`}>Bundle manifest ({bundle.files.length} files)</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="limitations" className="report-section">
          <SectionHead number="05" title="Limitations and licenses" standfirst="Each report keeps its own limitations attached; source terms are registered separately." />
          {report.bundles.map((bundle) => (
            <div key={bundle.key}>
              <h3>{bundle.label}</h3>
              <ul className="limits-list">{bundle.limitations.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          ))}
          <p className="prose"><a href={report.licenseRegisterUrl}>Read the public source, attribution, and license register.</a></p>
        </section>

        <section id="bundle" className="report-section">
          <SectionHead number="06" title="Check all three bundles" standfirst="The site copied every manifested byte without transformation. Verify each bundle independently." />
          <CiteBlock tabs={[
            { id: "verify", label: "Verify", value: verifyText },
            { id: "digests", label: "Digests", value: digestText },
          ]} />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
