import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { LinkButton } from "@/components/link-button";
import { ReportSummaryCard } from "@/components/report-summary-card";
import { listReports } from "@/lib/reports";

// v4 (2026-08-13): same arc as v3, plainer register. Short sentences,
// contractions, second person, concrete nouns. Deliberately avoids the
// balanced triads, participial clauses and em-dash rhythm of v3.

const CONTACT_EMAIL = "ritsu@colophon.claims";

const HOW_IT_WORKS: { title: string; body: string }[] = [
  {
    title: "Lock the method",
    body: "You pick the tasks, the setups, and what counts as a pass. That gets sealed with a timestamp before anything runs. Change your mind after seeing results and the report shows it.",
  },
  {
    title: "Same work, every setup",
    body: "Each setup gets the same tasks. If one drifts from what you locked, that run gets refused instead of quietly counted.",
  },
  {
    title: "Publish all of it",
    body: "Failures included. The report says how many runs were meant to happen, what became of each one, and why anything got dropped. The files ship with it, so a reader can redo your arithmetic without taking your word for anything.",
  },
];

const WHO_ITS_FOR: { title: string; body: string }[] = [
  {
    title: "You're publishing a comparison",
    body: "Your launch post says you're faster, cheaper, or better than something. People will poke at it.",
  },
  {
    title: "Someone's disputing your numbers",
    body: "Stop arguing and run it again somewhere they can watch.",
  },
  {
    title: "You're choosing between setups",
    body: "Pick the harness or the model, and still be able to show why six months later.",
  },
  {
    title: "You benchmark for a living",
    body: "Publish work other people can reproduce.",
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
        {/* 1. Hero — the promise, and the moment it exists for */}
        <section className="section">
          <div className="container hero">
            <span className="eyebrow">Benchmark publishing for agent configurations</span>
            <h1>Publish benchmark claims people can check.</h1>
            <p className="hero-what">
              You&apos;ve run the comparison. Now you need people to believe it.
            </p>
            <div className="button-row">
              <LinkButton href={featuredHref} variant="primary" size="lg">
                Read a published report
              </LinkButton>
              <LinkButton href="#contact" variant="secondary" size="lg">
                Bring a claim
              </LinkButton>
            </div>
          </div>
        </section>

        {/* 2. The payoff — a real report, up front */}
        <section className="section" id="read-one">
          <div className="container">
            <h2 style={{ font: "var(--type-title)", fontSize: "var(--text-2xl)" }}>
              What you get
            </h2>
            <div className="read-one">
              <div className="read-one-copy">
                <p className="prose">
                  Every job ends with a report like this one. The result, the method you locked
                  before running, what happened to all of it, and the files to check it yourself.
                </p>
                <p className="prose">
                  Demo report #1 takes an argument people are having right now. Do skills actually
                  beat putting the same instructions in AGENTS.md? It settles it the same way
                  we&apos;d settle yours.
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

        {/* 3. How it works — three beats */}
        <section className="section" id="what-it-does">
          <div className="container">
            <h2 style={{ font: "var(--type-title)", fontSize: "var(--text-2xl)" }}>
              How it works
            </h2>
            <div className="pillars">
              {HOW_IT_WORKS.map((item, i) => (
                <div className="pillar" key={item.title}>
                  <span className="pillar-number">{String(i + 1).padStart(2, "0")}</span>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </div>
              ))}
            </div>
            <p className="prose" style={{ marginTop: "var(--space-7)" }}>
              A person can run this, or their agent can. Every step is one command.{" "}
              <Link href="/docs/">The docs</Link> have the rest.
            </p>
          </div>
        </section>

        {/* 4. Who it's for */}
        <section className="section" id="who-its-for">
          <div className="container">
            <h2 style={{ font: "var(--type-title)", fontSize: "var(--text-2xl)" }}>
              Who this is for
            </h2>
            <div className="pillars">
              {WHO_ITS_FOR.map((item) => (
                <div className="pillar" key={item.title}>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 5. Quickstart pointer */}
        <section className="section" id="run-it-yourself">
          <div
            className="container"
            style={{ display: "flex", flexDirection: "column", gap: "var(--space-7)" }}
          >
            <h2 style={{ font: "var(--type-title)", fontSize: "var(--text-2xl)" }}>
              Run it yourself
            </h2>
            <p className="prose">
              It runs from a source checkout. No account, no API key, and the first run costs
              nothing. A sample benchmark and two setups come bundled.
            </p>
            <pre className="codeblock">
              <code>{`git clone https://github.com/Jinn-Network/mono.git
cd mono/packages/benchmark-product/core
yarn install --immutable && yarn public-quickstart`}</code>
            </pre>
            <p className="code-note">
              That runs the whole thing end to end, then verifies the bundle it produced.{" "}
              <Link href="/docs/#quickstart">Full quickstart and every command</Link>.
            </p>
          </div>
        </section>

        {/* 6. The engagement */}
        <section className="section" id="contact">
          <div
            className="container"
            style={{ display: "flex", flexDirection: "column", gap: "var(--space-7)" }}
          >
            <h2 style={{ font: "var(--type-title)", fontSize: "var(--text-2xl)" }}>Bring a claim</h2>
            <p className="prose">
              Tell us what you need to prove. We&apos;ll work out the tasks and setups with you,
              you sign off on the method before anything runs, and you get a report at a URL
              that&apos;s yours.
            </p>
            <p className="prose">
              Worth putting in a first email: what you&apos;re claiming, which tasks reflect the
              real work, how skeptical your audience is, and when you need it.
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
