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
    title: "Tell us what you're claiming",
    body: "What you need to prove, which tasks reflect the real work, and who's going to argue with it.",
  },
  {
    title: "You approve the method before anything runs",
    body: "The tasks, the setups being compared, what counts as a pass. Once you sign off it's sealed with a timestamp, so nobody can adjust it later to suit the result. Including us.",
  },
  {
    title: "Everything runs the same way",
    body: "Same tasks for every setup. If one drifts from what you approved, that run gets thrown out rather than quietly counted.",
  },
  {
    title: "You get a report people can check",
    body: "A permanent URL with the result, what happened to every run including the failures, and the files to check it.",
  },
];

const WHO_ITS_FOR: { title: string; body: string }[] = [
  {
    title: "You're shipping a skill, harness, or loadout",
    body: "You have a performance claim people will test, quote, or argue with.",
  },
  {
    title: "You're making a review-agent claim",
    body: "Show which review work you tested, what each setup saw, and what happened to every run.",
  },
  {
    title: "You're choosing between setups",
    body: "Make the choice on a method you approved first, then keep the evidence for when someone asks.",
  },
];

export default function Home() {
  const reports = listReports();
  const featured = reports[0];
  const featuredHref = featured === undefined ? "#contact" : `/reports/${featured.slug}/`;

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
              Lock the method, account for every cell, and publish the evidence so the claim can
              survive outside the person who made it.
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
            <h2 style={{ font: "var(--type-title)", fontSize: "var(--text-2xl)" }}>Read one</h2>
            <div className="read-one">
              <div className="read-one-copy">
                <p className="prose">
                  One narrow question, fully accounted: the same instruction bytes as a native
                  Skill or root <code>CLAUDE.md</code>, plus a no-instructions arm. The report keeps
                  the scale limit, host deviation, and two failed oracles on its face.
                </p>
                <div className="button-row">
                  <LinkButton href={featuredHref} variant="primary">
                    Read the report
                  </LinkButton>
                  <LinkButton href={`${featuredHref}#bundle`} variant="secondary">
                    Check the bundle
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
              Keep the tools that already run the work. Colophon sits around the comparison: it
              locks the method, records what ran, and publishes the evidence. <Link href="/docs/#execution">See the current execution paths</Link>.
            </p>
            <p className="prose" style={{ marginTop: "var(--space-5)" }}>
              The report page exposes the manifest, signed envelope, claim package, and source
              disclosures directly. <Link href="/docs/">The docs</Link> explain the reader path and
              its limits.
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

        {/* 5. Reader path */}
        <section className="section" id="check-it-yourself">
          <div
            className="container"
            style={{ display: "flex", flexDirection: "column", gap: "var(--space-7)" }}
          >
            <h2 style={{ font: "var(--type-title)", fontSize: "var(--text-2xl)" }}>
              Check it yourself
            </h2>
            <p className="prose">
              Every report links its manifest, signed envelope, claim package, and source
              disclosures. The public reader checks the complete bundle in one command.
            </p>
            <pre className="codeblock">
              <code>npx @colophon-claims/verify@0.1 ./bundle</code>
            </pre>
            <p className="code-note">
              It checks the manifest, evidence closure, artifacts, signatures, matrix, signed
              report, and claim consistency. <Link href="/docs/#reader">What that means</Link>.
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
