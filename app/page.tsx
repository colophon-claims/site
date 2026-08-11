import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { LinkButton } from "@/components/link-button";
import { ReportSummaryCard } from "@/components/report-summary-card";
import { listReports } from "@/lib/reports";

// Page copy is .local/colophon-surface-copy.md v1.0 (2026-08-11), verbatim.

const WHAT_IT_DOES: { title: string; body: string }[] = [
  {
    title: "Fix the method before the run",
    body: "You choose the task set, the configurations you are comparing, how many replicates each cell gets, what counts as success, and how a delivery becomes a verdict. Colophon seals all of it as one Run record with a SHA-256 digest and a timestamp. After the lock there are no task swaps, no added replicates, and no method edits. The digest and the lock time travel with the report.",
  },
  {
    title: "Run every configuration against the same tasks",
    body: "Each arm faces the identical tasks. Harness, model, and loadout are checked at dispatch and admitted only when they match the values you locked, so a configuration that drifted does not quietly get counted. A run can be interrupted and resumed; resume re-dispatches only the cells still outstanding.",
  },
  {
    title: "Account for every expected result, including the failures",
    body: "The sealed matrix carries the whole partition: how many cells were expected, how many were judged, and every excluded cell with the reason it was excluded. Task failure, infrastructure failure, unscorable, expired, missing, conflicted, and cancellation-drained stay distinct from each other. Only judged cells enter a denominator. Where evaluator identities disagreed, the disagreement is retained in the record rather than resolved into a cleaner number.",
  },
  {
    title: "Publish the report with its evidence attached",
    body: "publish emits one immutable directory: an HTML report that uses no scripts and loads nothing remote, the benchmark, run, matrix, report, verdict, and evidence records addressed by digest, the public keys those signatures check against, a machine-readable claim, a badge, and a social card. The badge and the card state the run outcome, say that no comparative winner is stated, name the exact configuration ids, and link to the report's limitations and verification sections. colophon bundle verify --bundle <dir> --json returns six checks over a copy of that directory: manifest, evidence closure, trust, matrix re-derivation, report verification, claim consistency. The bundle is an ordinary directory of files, so a reader who does not want to run our tool can hash the members and re-derive the claim without it.",
  },
  {
    title: "Operated by a person or by their agent",
    body: "Every operation is one library call, one CLI verb, and one action in the local app: 27 of them, held to that shape by a generated parity artifact. Every verb accepts --json and answers with a single envelope and a distinct exit code. Locking, launching, cancelling, reporting, and publishing are separately granted, and a delegated agent cannot grant itself anything.",
  },
];

const LIMITS: { lead: string; body: string }[] = [
  {
    lead: "This is a self-run venue.",
    body: "The same operator controls task dispatch, execution, and evaluation. Locking the method is a discipline this tool enforces on that operator's own process, not a proof against them: nothing stops a run owner from altering a record before publishing it. What a local run establishes is reproducibility and internal discipline. If you want the claim settled rather than shown, clone the benchmark and run it yourself.",
  },
  {
    lead: "Distinct evaluator identities are not distinct parties.",
    body: "Each evaluator identity is backed by its own signing key minted in the same workspace, and Colophon checks every verdict signature against it. That establishes which key signed which verdict. It does not establish that unrelated people or organizations were involved.",
  },
  {
    lead: "Agreement among evaluators is not correctness.",
    body: "A majority or a unanimous result is a reduction rule you declared before the run, applied to judgments that can be wrong together. Reports state the independence mode, the verdict counts, and the reduction rule that actually applied, not just the label you picked.",
  },
  {
    lead: "A report is not a certification and not a ranking.",
    body: "Nothing here is accredited, official, or scored against other reports. No comparative winner is stated, and the published assets say so on their face. A report is evidence about one question, on one task set, on one date.",
  },
  {
    lead: "Pinning covers three axes, and one is vacuous.",
    body: "Harness, model, and loadout are enforced at dispatch. The isolation axis is not: this venue's launchers admit exactly one isolation policy, so a match on it proves nothing about containment strength. Reports carry the per-axis counts rather than implying that everything configured was enforced.",
  },
  {
    lead: "Cost figures are self-reported.",
    body: "They come from this venue's own resource observations. Nothing settled them.",
  },
  {
    lead: "Rehearsals happen, and they are disclosed.",
    body: "A preview is an unregistered run. It produces disposable artifacts, never enters official results, and when any preview preceded an official run, that run's report says so in its limitations.",
  },
  {
    lead: "Publishing makes the run public, and it writes to your disk.",
    body: "The bundle deliberately contains the tasks, deliveries, verdicts, report, and claim. Drafts, grants, audit state, environment data, and private keys stay behind, but the bundle is not a PII scrubber. publish uploads nothing, hosts nothing, and deploys nothing: the reports on this site are files placed here by hand.",
  },
  {
    lead: "Network execution is not available yet.",
    body: "The marketplace venue, where pre-registration and completeness become checkable against the run's own owner, has prerequisites that are not built. Until they are, the product reports that venue as unavailable rather than running everything locally under a stronger name.",
  },
];

export default function Home() {
  const reports = listReports();
  const featured = reports[0];
  const featuredHref = featured === undefined ? "/reports/" : `/reports/${featured.slug}/`;

  return (
    <>
      <SiteHeader />
      <main>
        {/* 1. Hero */}
        <section className="section">
          <div className="container hero">
            <span className="eyebrow">Benchmark publishing for agent configurations</span>
            <h1>Compare agents on the same work.</h1>
            <p className="hero-promise">Publish benchmark claims people can check.</p>
            <p className="hero-what">
              Colophon is a command-line tool and a local workspace for running two or more agent
              configurations against one task set and publishing the result as a self-contained
              bundle: the report, the records it was derived from, and the accounting for every
              execution that was expected.
            </p>
            <div className="button-row">
              <LinkButton href={featuredHref} variant="primary" size="lg">
                Read a published report
              </LinkButton>
              <LinkButton href="#run-it-yourself" variant="secondary" size="lg">
                Run it yourself
              </LinkButton>
            </div>
          </div>
        </section>

        {/* 2. What it does */}
        <section className="section" id="what-it-does">
          <div className="container">
            <h2 style={{ font: "var(--type-title)", fontSize: "var(--text-2xl)" }}>
              What Colophon does
            </h2>
            <div className="pillars">
              {WHAT_IT_DOES.map((item, i) => (
                <div className="pillar" key={item.title}>
                  <span className="pillar-number">{String(i + 1).padStart(2, "0")}</span>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 3. Example report */}
        <section className="section" id="read-one">
          <div className="container">
            <h2 style={{ font: "var(--type-title)", fontSize: "var(--text-2xl)" }}>Read one</h2>
            <div className="read-one">
              <div className="read-one-copy">
                <p className="prose">
                  Demo report #1 takes a question the agent community is currently arguing about in
                  public, with people reporting opposite results, and runs it as a pre-registered
                  comparison: does packaging identical guidance as a skill perform differently from
                  putting the same content in a flat AGENTS.md file?
                </p>
                <p className="prose">
                  Open it for the method rather than the number: the lock digest and the time it was
                  sealed, every expected execution and what became of it, the statistics declared
                  before the run, and the limitations we could not design away.
                </p>
                <div className="button-row">
                  <LinkButton href={featuredHref} variant="primary">
                    Read the report
                  </LinkButton>
                  <LinkButton href={`${featuredHref}#bundle`} variant="secondary">
                    Download the bundle
                  </LinkButton>
                </div>
                <p className="prose" style={{ fontSize: "var(--text-base)" }}>
                  The bundle is the report&apos;s source. Check it with{" "}
                  <code>colophon bundle verify --bundle &lt;dir&gt; --json</code>, or open the
                  records yourself.
                </p>
              </div>
              <div className="report-card-stack">
                {featured !== undefined ? (
                  <Link href={featuredHref} style={{ textDecoration: "none", color: "inherit" }}>
                    <ReportSummaryCard report={featured} />
                  </Link>
                ) : (
                  <p className="prose">No report is published yet.</p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 4. Quickstart */}
        <section className="section" id="run-it-yourself">
          <div className="container" style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
            <h2 style={{ font: "var(--type-title)", fontSize: "var(--text-2xl)" }}>
              Run it yourself
            </h2>
            <p className="prose">
              Colophon runs from a source checkout today. There is no published package, no hosted
              service, and no account. A first benchmark needs no API key, no network venue, and no
              funds: the sample benchmark and both sample arms are bundled.
            </p>
            <p className="prose">
              Node.js 22 (22.23.1 is the verified runtime), Yarn 4.13.0, and a checkout with the
              workspace dependency distributions already built in the order used by{" "}
              <code>.github/workflows/benchmark-product-ci.yml</code>.
            </p>
            <pre className="codeblock">
              <code>{`git clone https://github.com/Jinn-Network/mono.git
cd mono/packages/benchmark-product/core
yarn install --immutable && yarn public-quickstart`}</code>
            </pre>
            <p className="code-note">
              That builds the CLI, creates a temporary workspace, attaches the bundled three-task
              benchmark and two real subprocess arms, and drives the full lifecycle to a published
              bundle. It then copies the bundle out, deletes the workspace that made it, and
              requires the standalone verifier to return all six checks from the copy. It prints a
              JSON evidence envelope and removes its own temporary directory.
            </p>
            <p className="code-note" style={{ fontWeight: "var(--weight-semibold)" as never, color: "var(--text-primary)" }}>
              The same run, verb by verb
            </p>
            <pre className="codeblock">
              <code>{`colophon init         --workspace ./bench --principal you
colophon draft create --workspace ./bench --principal you --id first --name "First benchmark"
colophon sample init  --workspace ./bench --principal you --draft first

colophon arm add --workspace ./bench --principal you --draft first \\
  --arm baseline --pinning '{"harness":{"id":"prediction-v1-baseline","version":"1.0.0"}}'
colophon arm add --workspace ./bench --principal you --draft first \\
  --arm sample-uniform --pinning '{"harness":{"id":"sample-uniform","version":"0.1.0"}}'

colophon quote   --workspace ./bench --principal you --draft first
colophon lock    --workspace ./bench --principal you --draft first
colophon launch  --workspace ./bench --principal you --draft first
colophon collect --workspace ./bench --principal you --draft first
colophon report  --workspace ./bench --principal you --draft first
colophon publish --workspace ./bench --principal you --draft first

colophon bundle verify --bundle ./bench/artifacts/first/public-bundles/<identity> --json`}</code>
            </pre>
            <p className="code-note">
              From a source checkout the binary is <code>node dist/cli/bin.js</code>;{" "}
              <code>colophon</code> is the command name once the package is on your path, and{" "}
              <code>benchmark-product</code> remains as an alias.
            </p>
            <p className="code-note">
              <code>colophon help</code> lists every verb and its flags. Add <code>--json</code> to
              any of them for one machine-readable envelope on stdout. Exit codes: 0 success, 2
              invalid invocation, 3 authority denied, 1 every other typed error.
            </p>
            <p className="code-note">
              To bring your own tasks instead of the sample,{" "}
              <code>colophon import swebench</code> takes SWE-bench-shaped rows.
            </p>
          </div>
        </section>

        {/* 5. What this does not do */}
        <section className="section" id="limits">
          <div className="container">
            <h2 style={{ font: "var(--type-title)", fontSize: "var(--text-2xl)" }}>
              What this does not do
            </h2>
            <p className="prose" style={{ marginTop: "var(--space-6)" }}>
              These limits are printed in the product and in every report it produces. They are the
              reason the bundle exists.
            </p>
            <ul className="limits-list">
              {LIMITS.map((item) => (
                <li key={item.lead}>
                  <strong>{item.lead}</strong> {item.body}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 6. Contact */}
        <section className="section" id="contact">
          <div className="container" style={{ display: "flex", flexDirection: "column", gap: "var(--space-7)" }}>
            <h2 style={{ font: "var(--type-title)", fontSize: "var(--text-2xl)" }}>Bring a claim</h2>
            <p className="prose">
              If you are about to put a comparative number somewhere it will be picked apart, a
              release post, a README, a research note, a customer or investor answer, write to
              &lt;contact email&gt;.
            </p>
            <p className="prose">
              Useful to include: the claim you need to stand up, who is skeptical of it, the tasks
              that represent the real work, and the date it has to be ready. A reply comes from a
              person, usually within two working days.
            </p>
            <p className="prose">Email is the channel. There is no booking link.</p>
            <div className="button-row">
              <LinkButton variant="primary">&lt;contact email&gt;</LinkButton>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
