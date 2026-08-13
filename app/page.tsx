import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { LinkButton } from "@/components/link-button";
import { ReportSummaryCard } from "@/components/report-summary-card";
import { listReports } from "@/lib/reports";

// v3 (2026-08-13): customer-shaped arc — name the moment, show the payoff,
// three beats of mechanism, who it's for, the engagement made concrete.
// The report page is the primary landing surface (report URLs travel);
// this page serves the visitor who came to answer "who is this, is it for
// me, what's the move."

const CONTACT_EMAIL = "ritsu@colophon.claims";

const HOW_IT_WORKS: { title: string; body: string }[] = [
  {
    title: "Lock the method first",
    body: "Choose what counts as success before you can see which answer it favours. Tasks, configurations, replicates, and success criteria are sealed with a digest and a timestamp — so the method your reader checks is provably the one you committed to.",
  },
  {
    title: "Run every arm on the same work",
    body: "A comparison is only worth reading if the things being compared faced the same tasks. Every arm does, and a configuration that drifted from what you locked is refused rather than quietly counted.",
  },
  {
    title: "Publish with the evidence attached",
    body: "The report ships as one immutable bundle: the records it came from, every expected execution accounted for — failures included, each with its reason — and enough for a skeptical reader to re-derive your number without trusting you.",
  },
];

const WHO_ITS_FOR: { title: string; body: string }[] = [
  {
    title: "Shipping a launch that claims you're better",
    body: "The number in your release post should survive the comments under it.",
  },
  {
    title: "Answering someone who disputes your number",
    body: "Run the comparison people can check, instead of another round of the argument.",
  },
  {
    title: "Choosing between configurations",
    body: "Make the internal call — harness, model, guidance — in a way that still holds up when someone asks why.",
  },
  {
    title: "Publishing benchmarks worth trusting",
    body: "If you measure things for a living, ship your results in a form readers can verify.",
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
              For the moment before you put a number somewhere it will be argued with — a launch
              post, a README, an answer to a skeptic.
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
              The product is the report
            </h2>
            <div className="read-one">
              <div className="read-one-copy">
                <p className="prose">
                  Every engagement ends in one of these: a permanent URL carrying the result, the
                  method it was locked to, the accounting for every execution, and the bundle a
                  reader can verify without trusting anyone.
                </p>
                <p className="prose">
                  Demo report #1 takes a question the agent community is arguing about in public —
                  does packaging guidance as a skill beat putting the same content in AGENTS.md? —
                  and runs it as a pre-registered comparison.
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
              A person can drive it, or their agent can: every operation is one CLI verb with a
              machine-readable answer. <Link href="/docs/">The docs</Link> carry the full surface.
            </p>
          </div>
        </section>

        {/* 4. Who it's for */}
        <section className="section" id="who-its-for">
          <div className="container">
            <h2 style={{ font: "var(--type-title)", fontSize: "var(--text-2xl)" }}>
              Where it earns its keep
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
              Colophon runs from a source checkout today. There is no hosted service and no
              account, and a first benchmark needs no API key and no funds: the sample benchmark
              and both sample arms are bundled.
            </p>
            <pre className="codeblock">
              <code>{`git clone https://github.com/Jinn-Network/mono.git
cd mono/packages/benchmark-product/core
yarn install --immutable && yarn public-quickstart`}</code>
            </pre>
            <p className="code-note">
              That drives the full lifecycle to a published bundle and verifies it from a copy.{" "}
              <Link href="/docs/#quickstart">Full quickstart, prerequisites, and every verb</Link>.
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
              If you have a comparative claim you need to stand up, we run it with you: we scope
              the tasks and arms together, you approve the method before it locks, and you get the
              published report and its bundle at a URL you own.
            </p>
            <p className="prose">
              Useful in a first email: the claim itself, the tasks that represent the real work,
              the level of assurance your skeptics require, and when you need it by.
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
