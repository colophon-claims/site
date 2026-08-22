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

const BUYER_MOMENTS: { title: string; body: string }[] = [
  {
    title: "You’re about to make a performance claim",
    body: "Publish the basis before customers, contributors, or competitors ask how you know.",
  },
  {
    title: "You’re choosing between agent setups",
    body: "Make the decision on a comparison approved before execution, not on the most convenient run.",
  },
  {
    title: "Someone else needs to inspect the result",
    body: "Give them the method, every planned outcome, the limits, and the exact evidence behind the answer.",
  },
];

const DELIVERABLES: { title: string; body: string }[] = [
  {
    title: "The comparison, fixed first",
    body: "Approve the tasks, setups, grading, and limits. Colophon seals that method before execution.",
  },
  {
    title: "Every planned result, accounted for",
    body: "Passes, failures, timeouts, and ungradable cells remain visible. Nothing disappears because it is inconvenient.",
  },
  {
    title: "A report that travels",
    body: "Get a permanent URL, a readable result, the evidence bundle, and one-command verification.",
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
        {/* 1. Proof-led first fold. Narrow screens read copy, proof, then actions. */}
        <section className="hero-section" id="read-one">
          <div className="container hero-grid">
            <div className="hero-copy">
              <span className="eyebrow">Benchmark publishing for agent performance</span>
              <h1>Publish benchmark claims people can check.</h1>
              <p className="hero-what">
                Lock the method, account for every expected result, and publish the evidence so the
                claim can survive outside the person who made it.
              </p>
            </div>
            <div className="hero-feature">
              {featured !== undefined ? (
                <Link
                  aria-label={`Read the featured report: ${featured.title}`}
                  className="hero-report-link"
                  href={featuredHref}
                >
                  <ReportSummaryCard report={featured} label="Latest report" />
                </Link>
              ) : (
                <p className="prose">No report is published yet.</p>
              )}
              <p className="hero-feature-note">
                No winner emerged. The method, failed checks, and limits still travel with the
                answer.
              </p>
            </div>
            <div className="button-row hero-actions">
              <LinkButton href="#contact" variant="primary" size="lg">
                Bring a claim
              </LinkButton>
              <LinkButton href="/reports/" variant="secondary" size="lg">
                Browse reports
              </LinkButton>
            </div>
          </div>
        </section>

        {/* 2. Buyer situations */}
        <section className="section buyer-section" id="when-it-matters">
          <div className="container buyer-grid">
            <div className="buyer-lede">
              <h2 className="section-title">When the claim has to hold up.</h2>
              <p>
                You don&apos;t need another unsupported score. You need an answer that can travel.
              </p>
            </div>
            <div className="buyer-needs">
              {BUYER_MOMENTS.map((item) => (
                <article className="buyer-need" key={item.title}>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* 3. Engagement outcomes */}
        <section className="section deliverables-section" id="what-you-get">
          <div className="container">
            <h2 className="section-title">What you get.</h2>
            <div className="deliverables-grid">
              {DELIVERABLES.map((item) => (
                <div className="deliverable" key={item.title}>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 4. Managed suite breadth */}
        <section className="suite-section" id="benchmark-methods">
          <div className="container suite-grid">
            <div className="suite-copy">
              <h2>Turn a benchmark run into a claim others can verify.</h2>
              <p>
                Run on <strong>APEX-Agents</strong>, <strong>SWE-bench Verified</strong>,{" "}
                <strong>Terminal-Bench 3.0</strong>, or another established suite. Or use a
                benchmark built for your claim.
              </p>
            </div>
            <div className="suite-action">
              <div className="button-row">
                <LinkButton href="#contact" variant="primary" size="lg">
                  Bring us your claim
                </LinkButton>
                <Link href="/docs/#methods">See the benchmark methods</Link>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Reader path */}
        <section className="section verification-section" id="check-it-yourself">
          <div className="container verification-grid">
            <div className="verification-copy">
              <h2 className="section-title">The evidence travels with the claim.</h2>
              <p className="prose">
                Every report links the exact bundle. A reader can verify its manifest, evidence,
                signatures, matrix, report, and claim consistency in one command.
              </p>
              <Link href="/docs/#verification">How checking works</Link>
            </div>
            <pre className="codeblock">
              <code>npx @colophon-claims/verify@0.1 ./bundle</code>
            </pre>
          </div>
        </section>

        {/* 6. The engagement */}
        <section className="section contact-section" id="contact">
          <div className="container contact-grid">
            <div className="contact-copy">
              <h2 className="section-title">What claim needs to hold up?</h2>
              <p className="prose">
                Send us the claim, the decision it supports, and the benchmark you have in mind. If
                no suite fits, we&apos;ll shape the task set and lock the method with you.
              </p>
            </div>
            <div className="contact-action">
              <LinkButton href={`mailto:${CONTACT_EMAIL}`} variant="primary" size="lg">
                Bring us your claim
              </LinkButton>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
