import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import {
  Callout,
  CompletenessBar,
  Footnote,
  Imprint,
  MethodLock,
  SectionHead,
  VerdictChip,
} from "@/components/ds";
import { CiteBlock } from "@/components/ds-client";
import { formatPercent, formatUtc, getReport, listReports, shortDigest, type ReportData } from "@/lib/reports";

export const dynamicParams = false;

export function generateStaticParams() {
  return listReports().map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const report = getReport(slug);
  return {
    title: report.title,
    description: report.summary ?? undefined,
    openGraph: { images: [`/reports/${slug}/bundle/social-card.svg`] },
  };
}

const ATTRITION_LABELS: Record<string, string> = {
  "task-failure": "Task failure",
  "infrastructure-failure": "Infrastructure failure",
  unscorable: "Unscorable",
  expired: "Expired (hit time ceiling)",
  missing: "Missing",
  conflicted: "Conflicted",
  "cancellation-drained": "Cancellation-drained",
};

function armPass(report: ReportData, armId: string): number {
  const arm = report.headline[armId];
  return arm.pass ?? Math.round(Number(arm.passRate) * arm.n);
}

function formatBytes(bytes: number): string {
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
}

export default async function ReportPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const report = getReport(slug);
  const bundleBase = `/reports/${slug}/bundle`;

  const armIds = report.arms.map((a) => a.armId);
  const totalPass = armIds.reduce((sum, id) => sum + armPass(report, id), 0);
  const totalFail = report.completeness.judged - totalPass;
  const attritionEntries = Object.entries(report.attrition);
  const attritionTotal = attritionEntries.reduce((sum, [, count]) => sum + count, 0);
  const silentlyDropped = report.completeness.expected - report.completeness.judged - attritionTotal;
  const maxRate = Math.max(...armIds.map((id) => Number(report.headline[id].passRate)), 0.0001);

  const segments: { verdict: "met" | "unmet" | "conflicted" | "incomplete"; label: string; count: number }[] = [
    { verdict: "met", label: "judged pass", count: totalPass },
    { verdict: "unmet", label: "judged fail", count: totalFail },
    ...attritionEntries
      .filter(([, count]) => count > 0)
      .map(([reason, count]) => ({
        verdict: (reason === "conflicted" ? "conflicted" : "incomplete") as "conflicted" | "incomplete",
        label: (ATTRITION_LABELS[reason] ?? reason).toLowerCase(),
        count,
      })),
  ];

  const verifyTab = [
    "# fetch every file listed under Bundle files, preserving paths, then:",
    report.verification.command.replace("<bundle-dir>", "<dir>"),
    "# returns six checks: " + report.verification.checks.join(", "),
  ].join("\n");
  const digestsTab = [
    `bundle identity  sha256:${report.digests.bundleIdentity}`,
    `report           sha256:${report.digests.reportSha256}`,
    `matrix           sha256:${report.digests.matrixSha256}`,
    `run              sha256:${report.digests.runSha256}`,
    `benchmark        sha256:${report.digests.benchmarkSha256}`,
  ].join("\n");
  const citeTab = [
    `${report.title}.`,
    `benchmark-product-public-bundle/1, identity sha256:${report.digests.bundleIdentity}.`,
    `Report sha256:${report.digests.reportSha256}.`,
    `${report.taskSet ?? "task set"}, ${report.taskCount} tasks, ${report.replicates} replicates per cell; arms: ${armIds.join(", ")}.`,
    `${report.venue} venue; limitations in the report. Verify: ${report.verification.command}`,
  ].join("\n");

  return (
    <>
      <SiteHeader />
      <main className="report-main">
        <div className="report-masthead">
          {report.fixture && (
            <Callout kind="caution" title="Fixture">
              Every value on this page is synthetic sample data emitted to exercise the report
              pipeline. Nothing was run. The bundle below says the same on its face.
            </Callout>
          )}
          <div className="report-meta">
            <span>Colophon report</span>
            <span>·</span>
            <span>{report.taskSet}</span>
            <span>·</span>
            <span>{formatUtc(report.reportedAt)}</span>
            <span>·</span>
            <span>{report.slug}</span>
          </div>
          <h1>{report.title}</h1>
          {report.summary !== null && <p className="report-standfirst">{report.summary}</p>}
          <MethodLock
            state="locked"
            digest={`sha256:${report.digests.runSha256}`}
            timestamp={report.lockedAt ?? undefined}
            detailHref="#method"
          />
        </div>

        <section id="result" className="report-section">
          <SectionHead
            number="01"
            title="Result"
            standfirst={`Pass rates over judged cells. ${report.completeness.judged} of ${report.completeness.expected} expected executions were judged; the partition of the rest is in Accounting.`}
          />
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Arm</th>
                  <th className="num">Judged</th>
                  <th className="num">Pass</th>
                  <th className="num">Pass rate</th>
                  <th className="num">95% interval</th>
                </tr>
              </thead>
              <tbody>
                {armIds.map((id) => {
                  const arm = report.headline[id];
                  return (
                    <tr key={id}>
                      <td className="mono">{id}</td>
                      <td className="num mono">{arm.n}</td>
                      <td className="num mono">{armPass(report, id)}</td>
                      <td className="num">
                        <span className="rate-cell">
                          <span className="rate-bar">
                            <span style={{ width: `${(100 * Number(arm.passRate)) / maxRate}%` }} />
                          </span>
                          <span className="mono">{formatPercent(arm.passRate)}</span>
                        </span>
                      </td>
                      <td className="num mono muted">
                        {formatPercent(arm.wilsonInterval.low)} to {formatPercent(arm.wilsonInterval.high)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Footnote marker="1" href="#accounting">
            Pass rate is passes divided by judged cells for that arm, not by the cells the method
            expected. No comparative winner is stated.
          </Footnote>
          {report.conflicted.count > 0 && (
            <VerdictChip verdict="conflicted" count={report.conflicted.count}>
              Conflicted cells
            </VerdictChip>
          )}
        </section>

        <section id="method" className="report-section">
          <SectionHead
            number="02"
            title="Method"
            standfirst={`Locked ${formatUtc(report.lockedAt)}, before any official result existed. The lock covers the task set, the arms, the replicate count, and the evaluation policy.`}
          />
          <div className="method-grid">
            <div style={{ border: "var(--border-hair) solid var(--rule)", background: "var(--surface-card)", padding: "var(--space-7)" }}>
              <span className="eyebrow">Scope</span>
              <dl className="kv" style={{ marginTop: "var(--space-5)" }}>
                <dt>Task set</dt>
                <dd>{report.taskSet}</dd>
                <dt>Tasks</dt>
                <dd>{report.taskCount}</dd>
                <dt>Arms</dt>
                <dd>{armIds.join(" · ")}</dd>
                <dt>Replicates</dt>
                <dd>{report.replicates} per cell</dd>
                <dt>Expected</dt>
                <dd>{report.completeness.expected} executions</dd>
                <dt>Venue</dt>
                <dd>{report.venue}</dd>
              </dl>
            </div>
            <div style={{ border: "var(--border-hair) solid var(--rule)", background: "var(--surface-card)", padding: "var(--space-7)" }}>
              <span className="eyebrow">Statistics and assurance</span>
              <dl className="kv" style={{ marginTop: "var(--space-5)" }}>
                <dt>Method</dt>
                <dd>
                  {report.method.id}@{report.method.version}, declared at lock
                  {report.method.preregistered ? ", pre-registered" : ""}
                </dd>
                <dt>Verdict rule</dt>
                <dd>{report.assurance.resolved.verdictRule}</dd>
                <dt>Independence</dt>
                <dd>{report.assurance.resolved.independence}</dd>
                <dt>Min verdicts</dt>
                <dd>{report.assurance.resolved.minVerdicts}</dd>
                <dt>Preset</dt>
                <dd>{report.assurance.preset}</dd>
              </dl>
            </div>
          </div>
          <Callout kind="method" title="Pinning">
            Harness, model, and loadout are enforced at dispatch. Unverifiable counts by axis:
            harness {report.disclosures.pinningUnverifiableCounts.harness}, model{" "}
            {report.disclosures.pinningUnverifiableCounts.model}, loadout{" "}
            {report.disclosures.pinningUnverifiableCounts.loadout}, isolation{" "}
            {report.disclosures.pinningUnverifiableCounts.isolation} of{" "}
            {report.completeness.expected}. This venue admits exactly one isolation policy, so a
            match on that axis proves nothing about containment strength.
          </Callout>
          {report.rehearsal !== null && (
            <Footnote marker="2">
              {report.rehearsal.previewCount} disclosed preview runs preceded the lock (
              {report.rehearsal.timestamps.map((t) => formatUtc(t)).join("; ")}). None entered
              official results.
            </Footnote>
          )}
        </section>

        <section id="accounting" className="report-section">
          <SectionHead
            number="03"
            title="Accounting"
            standfirst="Every execution the locked method expected, and what became of it. Only judged cells enter a denominator."
          />
          <CompletenessBar
            size="lg"
            total={report.completeness.expected}
            label={`${report.completeness.expected} expected executions`}
            segments={segments}
          />
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Outcome</th>
                  <th className="num">Count</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Expected (arms × tasks × replicates)</td>
                  <td className="num mono">{report.completeness.expected}</td>
                </tr>
                <tr>
                  <td>Judged (graded pass or fail)</td>
                  <td className="num mono">{report.completeness.judged}</td>
                </tr>
                {attritionEntries.map(([reason, count]) => (
                  <tr key={reason}>
                    <td>{ATTRITION_LABELS[reason] ?? reason}</td>
                    <td className="num mono">{count}</td>
                  </tr>
                ))}
                <tr>
                  <td>Silently dropped</td>
                  <td className="num mono">{silentlyDropped}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <Footnote marker="3">
            {report.assurance.disclosure} Evaluator integrity tiers over judged cells:{" "}
            {report.disclosures.integrityTierCounts["re-derivable"]} re-derivable,{" "}
            {report.disclosures.integrityTierCounts["attested-only"]} attested-only.
          </Footnote>
        </section>

        <section id="limitations" className="report-section">
          <SectionHead
            number="04"
            title="What this does not show"
            standfirst="Carried in the claim package, at the same size as the results."
          />
          <ul className="limits-list" style={{ marginTop: 0 }}>
            {report.limitations.map((limitation) => (
              <li key={limitation}>{limitation}</li>
            ))}
          </ul>
        </section>

        <section id="bundle" className="report-section">
          <SectionHead
            number="05"
            title="Check it yourself"
            standfirst="Everything above is derived from the bundle below: the records it was sealed from, the keys its signatures check against, and the claim in machine-readable form. Download the files byte-exact; this site never transforms a published bundle."
          />
          <CiteBlock
            tabs={[
              { id: "verify", label: "Verify", value: verifyTab },
              { id: "digests", label: "Digests", value: digestsTab },
              { id: "cite", label: "Cite", value: citeTab },
            ]}
          />
          <p className="prose" style={{ fontSize: "var(--text-base)", margin: 0 }}>
            {report.verification.trustRoot}
          </p>
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
                {report.files.map((file) => (
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
        </section>

        <Imprint
          builtOnJinn={false}
          rows={[
            { label: "Report", value: `sha256:${report.digests.reportSha256}` },
            { label: "Bundle", value: `sha256:${report.digests.bundleIdentity}` },
            { label: "Method", value: `${report.method.id}@${report.method.version}, locked ${formatUtc(report.lockedAt)}` },
            { label: "Venue", value: report.venue },
            { label: "Published", value: formatUtc(report.reportedAt) },
          ]}
        />
      </main>
      <SiteFooter />
    </>
  );
}
