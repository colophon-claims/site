import type { Metadata } from "next";
import Link from "next/link";
import { CopyCommand } from "@/components/copy-command";
import { HomeFooter } from "@/components/home-footer";
import { LinkButton } from "@/components/link-button";
import { Mark } from "@/components/mark";
import { SiteHeader } from "@/components/site-header";
import { getReport, isQualifiedReport } from "@/lib/reports";

const CONTACT_EMAIL = "ritsu@colophon.claims";
const REPORT_SLUG = "locomo-judge-report";
const VERIFY_COMMAND = "npx @colophon-claims/verify@0.2 ./bundle";

const AUDIENCES = [
  {
    title: "You are publishing a benchmark",
    body: "Give the result a permanent place people can cite, inspect, and return to.",
  },
  {
    title: "You are making a performance claim",
    body: "Give customers, reviewers, and competitors something stronger than your word.",
  },
  {
    title: "You are relying on a result",
    body: "Put a clear public record behind a product, research, or procurement decision.",
  },
] as const;

export const metadata: Metadata = {
  title: "Benchmark claims that hold up",
  description: "Give benchmark claims a public basis people can inspect for themselves.",
};

export default function Home() {
  const report = getReport(REPORT_SLUG);

  if (!isQualifiedReport(report)) {
    throw new Error(`the homepage example must be a qualified report: ${REPORT_SLUG}`);
  }

  const reportHref = `/reports/${report.slug}/`;

  return (
    <>
      <SiteHeader ctaLabel="Talk to us" />
      <main className="home-main">
        <section className="home-hero" aria-labelledby="home-title">
          <div className="container home-hero__grid">
            <div className="home-hero__copy">
              <h1 id="home-title">Turn benchmark results into claims that hold up.</h1>
              <p>
                Your team knows what went into the result. Everyone else has to take your word for
                it. Colophon closes that gap with a public claim people can inspect for themselves.
              </p>
              <div className="button-row home-hero__actions">
                <LinkButton href={reportHref} variant="primary" size="lg">
                  See the LoCoMo report
                </LinkButton>
                <LinkButton href="#contact" variant="secondary" size="lg">
                  Talk to Colophon
                </LinkButton>
              </div>
            </div>

            <article className="home-example" aria-labelledby="example-report-title">
              <header className="home-example__head">
                <div className="home-example__meta">
                  <span className="home-example__label">
                    <Mark size={13} /> A real published claim
                  </span>
                  <span className="claim-origin claim-origin--self">Self-run</span>
                </div>
                <h2 id="example-report-title">{report.title}</h2>
                <p>{report.summary}</p>
              </header>
              <div className="home-example__finding">
                <span>What it found</span>
                <p>
                  Changing only the grader moved agreement with the same labels from 60.8% to
                  87.9%.
                </p>
              </div>
              <div className="home-example__accounting">
                <strong>
                  {report.accounting.cells.judged.toLocaleString("en-US")} of{" "}
                  {report.accounting.cells.expected.toLocaleString("en-US")}
                </strong>
                <span>planned calls accounted for</span>
              </div>
              <footer className="home-example__foot">
                <Link href={reportHref}>Read the report</Link>
                <Link href={`${reportHref}#bundle`}>Download its files</Link>
              </footer>
            </article>
          </div>
        </section>

        <section className="home-section home-audiences" aria-labelledby="audiences-title">
          <div className="container home-audiences__grid">
            <div className="home-section__intro">
              <h2 id="audiences-title">For results that need to leave the room.</h2>
              <p>A benchmark becomes valuable when people beyond its authors can rely on it.</p>
            </div>
            <div className="home-audiences__list">
              {AUDIENCES.map((audience) => (
                <article key={audience.title}>
                  <h3>{audience.title}</h3>
                  <p>{audience.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="home-section home-paths" aria-labelledby="paths-title">
          <div className="container">
            <div className="home-section__intro home-paths__intro">
              <h2 id="paths-title">Independence that fits the claim.</h2>
              <p>
                Choose the level of separation that gives your audience the confidence they need.
              </p>
            </div>

            <div className="home-paths__list">
              <article className="home-path">
                <div className="home-path__heading">
                  <span className="claim-origin claim-origin--self">Self-run</span>
                  <h3>Strong for most claims</h3>
                </div>
                <p>
                  Keep the run with your team while giving readers a result they can inspect for
                  themselves.
                </p>
              </article>
              <article className="home-path">
                <div className="home-path__heading">
                  <span className="claim-origin claim-origin--independent">Independently run</span>
                  <h3>When added distance matters</h3>
                </div>
                <p>
                  Give readers confidence that the benchmark was run by someone separate from the
                  claimant.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="home-section home-verification" aria-labelledby="verification-title">
          <div className="container home-verification__grid">
            <div className="home-verification__copy">
              <h2 id="verification-title">Anyone can check the claim.</h2>
              <p>Checking is free. It stays free.</p>
              <Link href={`${reportHref}#bundle`}>Get the files from the LoCoMo report</Link>
            </div>
            <div className="home-verification__command">
              <CopyCommand value={VERIFY_COMMAND} />
              <p>The checker is available on npm.</p>
            </div>
          </div>
        </section>

        <section className="home-contact" id="contact" aria-labelledby="contact-title">
          <div className="container home-contact__grid">
            <div>
              <h2 id="contact-title">Where does your claim need to go?</h2>
              <p>
                Tell us what you are trying to establish and who needs to rely on it. We can talk
                through which path fits.
              </p>
            </div>
            <LinkButton href={`mailto:${CONTACT_EMAIL}`} variant="primary" size="lg">
              Start a conversation
            </LinkButton>
          </div>
        </section>
      </main>
      <HomeFooter />
    </>
  );
}
