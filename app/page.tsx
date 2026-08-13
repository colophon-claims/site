import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { LinkButton } from "@/components/link-button";
import { ReportSummaryCard } from "@/components/report-summary-card";
import { listReports } from "@/lib/reports";

// Page copy derives from .local/colophon-surface-copy.md v1.0 (2026-08-11).
// v2 (2026-08-13): the long-form pillar bodies, the full quickstart, and the
// nine limitations moved to /docs. The landing page answers "what is this",
// the report is the product surface, and /docs carries the detail.

const CONTACT_EMAIL = "ritsu@colophon.claims";

const WHAT_IT_DOES: { title: string; body: string }[] = [
  {
    title: "Fix the method before the run",
    body: "The task set, the configurations, the replicate counts, and what counts as success are sealed as one record with a SHA-256 digest and a timestamp. After the lock there are no task swaps, no added replicates, and no method edits.",
  },
  {
    title: "Run every configuration against the same tasks",
    body: "Each arm faces identical tasks. A configuration that drifted from what you locked is refused at dispatch rather than quietly counted.",
  },
  {
    title: "Account for every expected result, including the failures",
    body: "The sealed matrix carries the whole partition: what was expected, what was judged, and every excluded cell with the reason it was excluded. Only judged cells enter a denominator.",
  },
  {
    title: "Publish the report with its evidence attached",
    body: "One immutable directory holds the report, the records it was derived from, the keys its signatures check against, a machine-readable claim, and a badge. A reader who does not want to run our tool can hash the files and re-derive the claim without it.",
  },
  {
    title: "Operated by a person or by their agent",
    body: "Every operation is one library call, one CLI verb, and one action in the local app. Locking, launching, cancelling, reporting, and publishing are granted separately, and a delegated agent cannot grant itself anything.",
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
              <LinkButton href="/docs/#quickstart" variant="secondary" size="lg">
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
            <p className="prose" style={{ marginTop: "var(--space-7)" }}>
              A report is evidence about one question, on one task set, on one date. It is not a
              certification, not a ranking, and no comparative winner is stated.{" "}
              <Link href="/docs/#limits">What this does not do</Link> lists every limit, and each
              one is printed in the product and in every report it produces.
            </p>
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

        {/* 4. Quickstart pointer */}
        <section className="section" id="run-it-yourself">
          <div
            className="container"
            style={{ display: "flex", flexDirection: "column", gap: "var(--space-7)" }}
          >
            <h2 style={{ font: "var(--type-title)", fontSize: "var(--text-2xl)" }}>
              Run it yourself
            </h2>
            <p className="prose">
              Colophon runs from a source checkout today. There is no published package, no hosted
              service, and no account. A first benchmark needs no API key and no funds: the sample
              benchmark and both sample arms are bundled.
            </p>
            <pre className="codeblock">
              <code>{`git clone https://github.com/Jinn-Network/mono.git
cd mono/packages/benchmark-product/core
yarn install --immutable && yarn public-quickstart`}</code>
            </pre>
            <p className="code-note">
              That drives the full lifecycle to a published bundle, then deletes the workspace that
              made it and requires the standalone verifier to return all six checks from a copy.{" "}
              <Link href="/docs/#quickstart">Full quickstart, prerequisites, and every verb</Link>.
            </p>
          </div>
        </section>

        {/* 5. Contact */}
        <section className="section" id="contact">
          <div
            className="container"
            style={{ display: "flex", flexDirection: "column", gap: "var(--space-7)" }}
          >
            <h2 style={{ font: "var(--type-title)", fontSize: "var(--text-2xl)" }}>Bring a claim</h2>
            <p className="prose">
              If you have a comparative claim you need to stand up, write to{" "}
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
            </p>
            <p className="prose">
              Useful to include: the claim itself, the tasks that represent the real work, and when
              you need it by.
            </p>
            <div className="button-row">
              <LinkButton href={`mailto:${CONTACT_EMAIL}`} variant="primary">
                {CONTACT_EMAIL}
              </LinkButton>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
