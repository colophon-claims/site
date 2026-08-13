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
    body: "Choose what counts as success before you can see which answer it favours. The task set, the configurations, the replicate counts, and the success criteria are sealed with a digest and a timestamp, so the method your reader checks is provably the one you committed to.",
  },
  {
    title: "Run every configuration against the same tasks",
    body: "A comparison is only worth reading if the things being compared faced the same work. Every arm gets identical tasks, and a configuration that has drifted from what you locked is refused at dispatch rather than quietly counted.",
  },
  {
    title: "Account for every expected result, including the failures",
    body: "The quickest way to inflate a benchmark is to lose the runs that went badly. The sealed matrix carries every execution that was expected and what became of it, each exclusion with its reason, and only judged cells ever reach a denominator.",
  },
  {
    title: "Publish the report with its evidence attached",
    body: "Nobody has to take your word for it. One immutable directory holds the report, the records it came from, and the keys its signatures check against, so a skeptical reader can hash the files and re-derive your claim without running our tool.",
  },
  {
    title: "Operated by a person or by their agent",
    body: "An agent can run the whole thing end to end. Every operation is one library call, one CLI verb, and one action in the local app; locking, launching, and publishing are granted separately, and a delegated agent cannot grant itself anything.",
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
            <h1>Publish benchmark claims people can check.</h1>
            <p className="hero-what">
              Run two or more agent configurations against the same tasks, and publish the report
              with its evidence attached.
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
              If you have a comparative claim you need to stand up, we will run it with you.
              Useful to include: the claim itself, the tasks that represent the real work, the
              level of assurance your skeptics require, and when you need it by.
            </p>
            <div className="button-row">
              <LinkButton href={`mailto:${CONTACT_EMAIL}`} variant="primary" size="lg">
                Email us
              </LinkButton>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
