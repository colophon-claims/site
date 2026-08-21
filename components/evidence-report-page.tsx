import { Callout, Imprint, MethodLock, SectionHead } from "@/components/ds";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  formatRewardPpm,
  formatUtc,
  shortDigest,
  type BundleFile,
  type EvidenceReportData,
} from "@/lib/reports";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatList(items: string[]): string {
  return new Intl.ListFormat("en-US", { style: "long", type: "conjunction" }).format(items);
}

function fileFor(report: EvidenceReportData, path: string): BundleFile {
  const file = report.files.find((candidate) => candidate.path === path);
  if (file === undefined) throw new Error(`report read model omits ${path}`);
  return file;
}

const PRIMARY_FILES = [
  { path: "bundle.json", label: "Complete bundle manifest" },
  { path: "README.md", label: "Bundle reading note" },
  { path: "presentation.json", label: "Public reading record" },
  { path: "claim-package.json", label: "Machine-readable claim package" },
  { path: "report-envelope.json", label: "Signed report envelope" },
  { path: "report.json", label: "Signed report payload" },
  { path: "analysis-manifest.json", label: "Declared analysis" },
  { path: "cohort.json", label: "Evidence cohort" },
  { path: "matrix.json", label: "Re-derivable result matrix" },
  { path: "source/demo1-report.md", label: "Sealed human report" },
];

const VERIFICATION_LABELS: Record<string, string> = {
  manifest: "manifest",
  "evidence-closure": "evidence closure",
  "artifact-integrity": "artifact integrity",
  "signature-validity": "signature",
  "matrix-rederivation": "result matrix",
  "report-verification": "report",
  "claim-consistency": "claim consistency",
};

export function EvidenceReportPage({ report }: { report: EvidenceReportData }) {
  const bundleBase = `/reports/${report.slug}/bundle`;
  const selectedFiles = PRIMARY_FILES.map(({ path, label }) => ({
    ...fileFor(report, path),
    label,
  }));
  const recordCount = report.files.filter((file) => file.path.startsWith("records/")).length;
  const artifactCount = report.files.filter((file) => file.path.startsWith("artifacts/")).length;
  const floor = report.population.officialFloor;

  const populationLabels: Record<string, string> = {
    "Statically admitted; all run": "All tasks run",
    "Control arm not identically zero": "No-instructions control scored above zero",
    "Both instructed arms remained at zero": "Neither instructed setup produced a positive mean",
    "Pre-declared informative subset": "Tasks that informed the paired estimate",
  };

  const armExplanations: Record<string, string> = {
    "A-native-skill": "Loaded as a native Skill.",
    "B-flat-claude-md": "Placed in root CLAUDE.md.",
    "C-no-instructions": "No instructions; the control setup.",
  };

  return (
    <>
      <SiteHeader />
      <main className="report-main evidence-report">
        <div className="report-masthead evidence-masthead">
          <div className="report-meta">
            <span>Colophon demonstration</span>
            <span>·</span>
            <span>
              {report.subject.benchmark.name} {report.subject.benchmark.release}
            </span>
            <span>·</span>
            <span>{formatUtc(report.reportedAt)}</span>
          </div>
          <h1>{report.title}</h1>
          <p className="report-standfirst">
            We put the same instructions in a native Skill and root <code>CLAUDE.md</code>, then ran{" "}
            {report.accounting.expectedCells} executions to see whether the loading path changed
            Claude Haiku 4.5&apos;s performance.
          </p>
          <div className="report-demo-note">
            <strong>CLAUDE.md came out slightly ahead.</strong>
            <p>
              Not by enough to settle the question. Only {report.result.informativeTasks} of{" "}
              {report.population.flatTasks} tasks informed the paired estimate, and the uncertainty
              includes outcomes favoring either setup. That makes this a useful Colophon
              demonstration: the method, all {report.accounting.expectedCells} runs, failed checks,
              and limits remain attached to an inconclusive answer.
            </p>
          </div>
        </div>

        <section id="result" className="report-section">
          <SectionHead
            number="01"
            title="The answer"
            standfirst="The point estimate favored root CLAUDE.md by 0.047. The uncertainty still spans outcomes favoring either setup."
          />
          <div className="result-ledger">
            <div className="result-estimate">
              <span className="eyebrow">Mean difference</span>
              <strong>{formatRewardPpm(report.result.estimatePpm)}</strong>
              <span>Skill minus CLAUDE.md; negative values favor CLAUDE.md.</span>
            </div>
            <dl className="result-details">
              <div>
                <dt>95% confidence interval</dt>
                <dd>
                  {formatRewardPpm(report.result.confidenceInterval95Ppm.lower)} to{" "}
                  {formatRewardPpm(report.result.confidenceInterval95Ppm.upper)}
                </dd>
              </div>
              <div>
                <dt>Informative tasks</dt>
                <dd>{report.result.informativeTasks} of {report.population.flatTasks}</dd>
              </div>
              <div>
                <dt>What the method allowed</dt>
                <dd>An estimate only, with no selection, ranking, or certification.</dd>
              </div>
            </dl>
          </div>
          <p className="report-reading">
            <strong>Read this as a lead, not a verdict.</strong> The 95% interval runs from{" "}
            {formatRewardPpm(report.result.confidenceInterval95Ppm.lower)} to{" "}
            {formatRewardPpm(report.result.confidenceInterval95Ppm.upper)}, so the data remain
            compatible with either setup performing better. This run points toward root{" "}
            <code>CLAUDE.md</code>; it does not settle the choice.
          </p>
        </section>

        <section id="method" className="report-section">
          <SectionHead
            number="02"
            title="Lock the question first"
            standfirst="The Skill and CLAUDE.md setups used the same instruction bytes; a third setup received no instructions. The comparison changed where instructions loaded while holding the other task resources constant."
          />
          <p className="report-reading">
            <strong>Task source.</strong> The report used {report.execution.source.benchmark}{" "}
            {report.execution.source.release} packages built for{" "}
            {report.execution.source.upstreamRuntime.name}{" "}
            {report.execution.source.upstreamRuntime.version}, pinned at commit{" "}
            <code>{report.execution.source.commit.slice(0, 12)}</code>. The{" "}
            {formatList(report.execution.source.preservedPackageParts)} stayed unchanged.
            BenchFlow&apos;s standard modes could not hold those resources constant across all three
            setups, so the runner used <code>{report.execution.armConstruction.transform}</code> to
            change only instruction loading.
          </p>
          <div className="table-scroll">
            <table className="data-table method-table">
              <thead>
                <tr>
                  <th>Setup</th>
                  <th>What changed</th>
                  <th className="num">Runs per task</th>
                  <th className="num">Total runs</th>
                </tr>
              </thead>
              <tbody>
                {report.question.arms.map((arm) => (
                  <tr key={arm.id}>
                    <td>{arm.label}</td>
                    <td>{armExplanations[arm.id] ?? arm.id}</td>
                    <td className="num mono">{arm.replicatesPerTask}</td>
                    <td className="num mono">{report.accounting.cellsByArm[arm.id]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <MethodLock
            state="locked"
            digest={`sha256:${report.provenance.declarationSha256}`}
            detailHref={`${bundleBase}/analysis-manifest.json`}
          />
          <p className="report-reading">
            <strong>Why the lock matters.</strong> Colophon fixed the task set, three setups,
            replicate counts, and informative-subset rule before execution. That kept the method
            from shifting toward a preferred result; the declaration digest makes any later edit
            detectable.
          </p>
          <div className="method-grid">
            <div className="record-card">
              <span className="eyebrow">Tested on</span>
              <dl className="kv">
                <dt>Model</dt>
                <dd>{report.subject.model}</dd>
                <dt>Benchmark</dt>
                <dd>{report.subject.benchmark.name} {report.subject.benchmark.release}</dd>
                <dt>Tasks</dt>
                <dd>{report.population.flatTasks}, all admitted before the run</dd>
              </dl>
            </div>
            <div className="record-card">
              <span className="eyebrow">Run shape</span>
              <dl className="kv">
                <dt>Skill runs</dt>
                <dd>{report.accounting.cellsByArm["A-native-skill"]}</dd>
                <dt>CLAUDE.md runs</dt>
                <dd>{report.accounting.cellsByArm["B-flat-claude-md"]}</dd>
                <dt>No-instructions runs</dt>
                <dd>{report.accounting.cellsByArm["C-no-instructions"]}</dd>
              </dl>
            </div>
          </div>
        </section>

        <section id="estimate" className="report-section">
          <SectionHead
            number="03"
            title="Account for every run"
            standfirst={`Failed or inconvenient runs can change a result when they disappear. All ${report.accounting.expectedCells} expected executions remain visible here.`}
          />
          <p className="report-reading">
            Not all {report.population.flatTasks} tasks entered the paired estimate. The predeclared
            rule required every no-instructions run to score zero and at least one instructed setup
            to produce a positive mean. {report.result.informativeTasks} tasks qualified.
          </p>
          <div className="accounting-grid">
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>How the tasks divided</th>
                    <th className="num">Tasks</th>
                  </tr>
                </thead>
                <tbody>
                  {report.population.funnel.map((stage) => (
                    <tr key={stage.stage}>
                      <td>{populationLabels[stage.stage] ?? stage.stage}</td>
                      <td className="num mono">{stage.tasks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>What happened to every expected run</th>
                    <th className="num">Runs</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td>Expected</td><td className="num mono">{report.accounting.expectedCells}</td></tr>
                  <tr><td>Kept in the record</td><td className="num mono">{report.accounting.admittedCells}</td></tr>
                  <tr><td>Excluded</td><td className="num mono">{report.accounting.excludedCells}</td></tr>
                  <tr><td>Unavailable</td><td className="num mono">{report.accounting.unavailableCells}</td></tr>
                  <tr><td>Silently dropped</td><td className="num mono">0</td></tr>
                </tbody>
              </table>
            </div>
          </div>
          <p className="report-reading">
            <strong>What the denominator shows.</strong> All {report.accounting.expectedCells}{" "}
            expected executions have a visible outcome: none were excluded, unavailable, or
            silently dropped. The {report.result.informativeTasks} informative tasks fall below the
            registered confirmatory floor of {floor.units} units across{" "}
            {floor.independenceClusters} clusters. The estimate can shape the next test; it cannot
            close the argument.
          </p>
          <div className="oracle-record">
            <div>
              <span className="eyebrow">Two host checks failed and stayed in the record</span>
              <p>
                Both tasks failed closed in the {report.accounting.expectedCells}-run denominator.
                Nothing was removed after the result was known.
              </p>
            </div>
            <ul>
              {report.accounting.failedHostOracles.map((failure) => (
                <li key={failure.taskId}>
                  <code>{failure.taskId}</code> on host <code>{failure.host}</code>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="limitations" className="report-section">
          <SectionHead
            number="04"
            title="Keep the limits attached"
            standfirst="A headline can travel farther than its caveats. Colophon publishes the boundary with the result so the public record keeps both visible."
          />
          <div className="boundary-list">
            <section>
              <h3>What it applies to</h3>
              <ul className="limits-list">
                <li>
                  This is one run of {report.subject.model} on {report.subject.benchmark.name}{" "}
                  {report.subject.benchmark.release}, not a general result about
                  Skills, <code>CLAUDE.md</code>, SkillsBench as a whole, or other models.
                </li>
                <li>
                  The paired answer comes from {report.result.informativeTasks} of {report.population.flatTasks} tasks and falls below the confirmatory floor.
                </li>
                <li>
                  The report does not rank or certify either loading path, and it does not show that
                  Skills do not work.
                </li>
              </ul>
            </section>
            <section>
              <h3>How it ran</h3>
              <ul className="limits-list">
                <li>
                  The agent ran on the host. Grading ran in the pinned task container, so the
                  agent-side environment was not the task image.
                </li>
                <li>
                  Two host task checks failed. Their runs remained in the fail-closed{" "}
                  {report.accounting.expectedCells}-run denominator.
                </li>
              </ul>
            </section>
            <section>
              <h3>Who ran it</h3>
              <ul className="limits-list">
                <li>
                  One operator designed, ran, graded, and sealed this comparison. The published
                  evidence makes the process inspectable; it cannot prove honesty against that
                  operator.
                </li>
                <li>
                  Separate run records and cell keys are not evidence of separate real-world parties.
                </li>
              </ul>
            </section>
          </div>
        </section>

        <section id="bundle" className="report-section">
          <SectionHead
            number="05"
            title="Publish the evidence, not just the answer"
            standfirst={`The signed report, locked method, result matrix, ${recordCount} evidence records, ${artifactCount} artifacts, and limitations are published together.`}
          />
          <p className="report-reading">
            <strong>Why publication matters.</strong> The manifest binds every file to a digest, and
            the signed envelope identifies the canonical report. A reader can inspect the record
            behind the conclusion instead of taking this summary on trust.
          </p>
          <pre className="codeblock">
            <code>{report.verification.command}</code>
          </pre>
          <p className="code-note">
            It checks the{" "}
            {formatList(
              report.verification.checks.map(
                (check) => VERIFICATION_LABELS[check] ?? check.replaceAll("-", " "),
              ),
            )}. Protocol identifiers under <code>https://spec.jinn.network/</code> are names; that
            origin is not hosted yet. Verification uses the exact platform bytes installed from
            npm.
          </p>
          <div className="bundle-identity">
            <span>Canonical report envelope</span>
            <code>sha256:{report.digests.reportEnvelopeSha256}</code>
            <span>Bundle identity</span>
            <code>sha256:{report.digests.bundleIdentity}</code>
          </div>
          <div className="table-scroll">
            <table className="data-table file-list">
              <thead>
                <tr>
                  <th>Canonical file</th>
                  <th className="num">Bytes</th>
                  <th>SHA-256</th>
                </tr>
              </thead>
              <tbody>
                {selectedFiles.map((file) => (
                  <tr key={file.path}>
                    <td>
                      <a className="bundle-file-link" href={`${bundleBase}/${file.path}`} download>
                        <span>{file.label}</span>
                        <code>{file.path}</code>
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

        <section className="report-section report-bridge" aria-labelledby="why-this-report">
          <h2 id="why-this-report">Have a claim that needs to hold up?</h2>
          <p className="prose">
            If you&apos;re preparing to ship or defend a skill, harness, loadout, or review-agent
            claim, Colophon can lock the method, account for the run, and publish the evidence.{" "}
            <a href="mailto:ritsu@colophon.claims">Bring the claim</a>.
          </p>
        </section>

        <Imprint
          builtOnJinn={false}
          rows={[
            { label: "Report envelope", value: shortDigest(report.digests.reportEnvelopeSha256) },
            { label: "Bundle", value: shortDigest(report.digests.bundleIdentity) },
            { label: "Subject", value: report.subject.model },
            { label: "Method", value: "Paired A−B on the pre-declared informative subset" },
            { label: "Venue", value: "Self-run; one operator designed, ran, graded, and sealed" },
            { label: "Sealed", value: formatUtc(report.reportedAt) },
            { label: "Attribution", value: "Built on Jinn, by Jinn contributors." },
          ]}
        />
      </main>
      <SiteFooter />
    </>
  );
}
