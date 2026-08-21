import { Mark } from "./mark";
import {
  formatRewardPpm,
  formatUtc,
  isEvidenceReport,
  shortDigest,
  type ReportData,
} from "@/lib/reports";

export function ReportSummaryCard({ report }: { report: ReportData }) {
  if (isEvidenceReport(report)) {
    return (
      <article className="featured-report-card">
        <div className="featured-report-head">
          <div className="featured-report-eyebrow">
            <Mark size={12} /> Colophon report
          </div>
          <h3>{report.title}</h3>
          <p>
            {report.subject.benchmark.name} {report.subject.benchmark.release} · {report.subject.model}
          </p>
        </div>
        <div className="featured-result">
          <div>
            <span>Paired A−B</span>
            <strong>{formatRewardPpm(report.result.estimatePpm)}</strong>
          </div>
          <dl>
            <div>
              <dt>95% CI</dt>
              <dd>
                {formatRewardPpm(report.result.confidenceInterval95Ppm.lower)} to{" "}
                {formatRewardPpm(report.result.confidenceInterval95Ppm.upper)}
              </dd>
            </div>
            <div>
              <dt>Analysis</dt>
              <dd>{report.result.informativeTasks}/{report.population.flatTasks} tasks</dd>
            </div>
            <div>
              <dt>Accounting</dt>
              <dd>{report.accounting.admittedCells}/{report.accounting.expectedCells} cells</dd>
            </div>
          </dl>
        </div>
        <div className="featured-report-foot">
          <span>Interval includes zero</span>
          <span>Self-run venue</span>
        </div>
      </article>
    );
  }

  return (
    <article className="featured-report-card">
      <div className="featured-report-head">
        <div className="featured-report-eyebrow">
          <Mark size={12} /> Colophon report
        </div>
        <h3>{report.title}</h3>
        <p>
          {report.taskSet} · {report.taskCount} tasks · {report.replicates} replicates per cell
        </p>
      </div>
      <div className="featured-result featured-result-legacy">
        <span>
          Method locked {formatUtc(report.lockedAt)} · {shortDigest(report.digests.reportSha256)}
        </span>
        <span>{report.completeness.judged} of {report.completeness.expected} expected executions judged</span>
      </div>
      <div className="featured-report-foot">
        <span>Self-run venue</span>
        {report.fixture && <span>Fixture</span>}
      </div>
    </article>
  );
}
