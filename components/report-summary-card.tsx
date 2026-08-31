import { Mark } from "./mark";
import {
  DISCLOSURE_VARIABLE_KEYS,
  formatPercent,
  formatRewardPpm,
  formatUtc,
  isEvidenceReport,
  isGroupedReport,
  isQualifiedReport,
  shortDigest,
  type ReportData,
} from "@/lib/reports";

export function ReportSummaryCard({
  report,
  label = "Colophon report",
}: {
  report: ReportData;
  label?: string;
}) {
  if (isGroupedReport(report)) {
    return (
      <article className="featured-report-card">
        <div className="featured-report-head">
          <div className="featured-report-eyebrow"><Mark size={12} /> {label}</div>
          <h3>{report.title}</h3>
          <p>{report.scope.taskCount} items · {report.scope.arms.length} arms · three analyses</p>
        </div>
        <div className="featured-result featured-result-legacy">
          <span>One run and matrix, three distinct report digests</span>
          <span>{report.fixture ? "Synthetic rehearsal" : "Independently verifiable bundles"}</span>
        </div>
        <div className="featured-report-foot">
          <span>Self-run venue</span><span>{shortDigest(report.digests.runSha256)}</span>
        </div>
      </article>
    );
  }
  if (isQualifiedReport(report)) {
    const arms = report.result.perArm;
    const lowest = arms.find((arm) => arm.armId === report.result.spread.lowestArmId) ?? arms[0];
    const highest = arms.find((arm) => arm.armId === report.result.spread.highestArmId) ?? arms[0];
    const measured = report.disclosure === null
      ? null
      : DISCLOSURE_VARIABLE_KEYS.filter(
        (key) => report.disclosure?.variables[key].status === "measured-here",
      ).length;
    return (
      <article className="featured-report-card">
        <div className="featured-report-head">
          <div className="featured-report-eyebrow">
            <Mark size={12} /> {label}
          </div>
          <h3>{report.title}</h3>
          <p>
            {report.subject.benchmark.name} · {report.population.items} items ·{" "}
            {report.subject.arms.length} judge prompts
          </p>
        </div>
        <div className="featured-result">
          <div>
            <span>Agreement spread</span>
            <strong>{report.result.spread.pointsBetween} pts</strong>
          </div>
          <dl>
            <div>
              <dt>Lowest</dt>
              <dd>
                {lowest.armId} {formatPercent(lowest.agreement.estimate)}
              </dd>
            </div>
            <div>
              <dt>Highest</dt>
              <dd>
                {highest.armId} {formatPercent(highest.agreement.estimate)}
              </dd>
            </div>
            <div>
              <dt>Accounting</dt>
              <dd>
                {report.accounting.cells.judged}/{report.accounting.cells.expected} calls
              </dd>
            </div>
          </dl>
        </div>
        <div className="featured-report-foot">
          <span>
            {measured === null
              ? "No sealed disclosure record"
              : `${measured} of ${DISCLOSURE_VARIABLE_KEYS.length} variables measured here`}
          </span>
          <span>{shortDigest(report.digests.reportSha256)}</span>
        </div>
      </article>
    );
  }
  if (isEvidenceReport(report)) {
    return (
      <article className="featured-report-card">
        <div className="featured-report-head">
          <div className="featured-report-eyebrow">
              <Mark size={12} /> {label}
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
          <Mark size={12} /> {label}
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
