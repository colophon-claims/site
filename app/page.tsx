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

export const metadata: Metadata = {
  title: "A benchmark number people can check",
  description: "Turn a benchmark number into a public claim that anyone can check.",
};

export default function Home() {
  const report = getReport(REPORT_SLUG);

  if (!isQualifiedReport(report)) {
    throw new Error(`the homepage example must be a qualified report: ${REPORT_SLUG}`);
  }

  const reportHref = `/reports/${report.slug}/`;

  return (
    <>
      <SiteHeader />
      <main className="home-main">
        <section className="home-hero" aria-labelledby="home-title">
          <div className="container home-hero__grid">
            <div className="home-hero__copy">
              <h1 id="home-title">You have a number. Now someone will ask you to prove it.</h1>
              <p>
                Set the method before the run. Keep every result, including failures. Publish the
                report and the files behind it, so anyone can check the number without taking your
                word for it.
              </p>
              <div className="button-row home-hero__actions">
                <LinkButton href={reportHref} variant="primary" size="lg">
                  See a sealed claim
                </LinkButton>
                <LinkButton href="#contact" variant="secondary" size="lg">
                  Bring your benchmark
                </LinkButton>
              </div>
            </div>

            <article className="home-seal" aria-labelledby="example-report-title">
              <header className="home-seal__head">
                <div className="home-seal__meta">
                  <span className="home-seal__label">
                    <Mark size={13} /> Published example
                  </span>
                  <span className="home-seal__origin">Run by its publisher</span>
                </div>
                <h2 id="example-report-title">{report.title}</h2>
                <p>
                  Six grading setups judged the same 240 answers on the same model snapshot.
                </p>
              </header>
              <div className="home-seal__finding">
                <span>Sealed finding</span>
                <p>
                  Changing only the grader moved agreement with the same labels from 60.8% to
                  87.9%.
                </p>
              </div>
              <dl className="home-seal__facts">
                <div>
                  <dt>Planned calls</dt>
                  <dd>4,320 of 4,320 accounted for</dd>
                </div>
                <div>
                  <dt>Run type</dt>
                  <dd>Run by its publisher</dd>
                </div>
                <div>
                  <dt>Reader check</dt>
                  <dd>Passed all 7 checks</dd>
                </div>
              </dl>
              <footer className="home-seal__foot">
                <Link href={reportHref}>Open the report and its evidence</Link>
                <span>Permanent public record</span>
              </footer>
            </article>
          </div>
        </section>

        <section className="home-section home-paths" aria-labelledby="paths-title">
          <div className="container">
            <div className="home-section__intro">
              <h2 id="paths-title">Choose who runs it.</h2>
              <p>
                Both paths produce a claim a stranger can check. The label stays with it, so
                nobody has to guess who did the work.
              </p>
            </div>

            <div className="home-paths__list">
              <article className="home-path">
                <div className="home-path__heading">
                  <span className="home-path__origin home-path__origin--publisher">
                    Run by publisher
                  </span>
                  <h3>Run the benchmark yourself.</h3>
                </div>
                <div className="home-path__body">
                  <p>
                    Lock the method before you begin. Run the benchmark under that method. Keep
                    every planned result, including failures. Publish what a reader needs to
                    recompute the number.
                  </p>
                  <p className="home-path__limit">
                    The sealed claim says that the run was done by its publisher.
                  </p>
                </div>
              </article>

              <article className="home-path">
                <div className="home-path__heading">
                  <span className="home-path__origin home-path__origin--independent">
                    Run independently
                  </span>
                  <h3>Have Colophon run it.</h3>
                </div>
                <div className="home-path__body">
                  <p>
                    Agree the method first. Colophon runs it and publishes the result. The claim
                    then answers both what was run and who ran it: someone independent of you.
                  </p>
                  <p className="home-path__limit">
                    The sealed claim says that the run was done independently.
                  </p>
                </div>
              </article>
            </div>

            <p className="home-paths__note">
              There is no self-serve runner today. Start either path with a conversation.
            </p>
          </div>
        </section>

        <section className="home-section home-verification" aria-labelledby="verification-title">
          <div className="container home-verification__grid">
            <div className="home-verification__copy">
              <h2 id="verification-title">Checking is free. It stays free.</h2>
              <p>
                One command checks the published files and recomputes the report. Nothing is
                uploaded.
              </p>
              <Link href={`${reportHref}#bundle`}>Get the files from the example report</Link>
            </div>
            <div className="home-verification__command">
              <CopyCommand value={VERIFY_COMMAND} />
              <p>Requires Node 22 or newer.</p>
            </div>
          </div>
        </section>

        <section className="home-section home-limits" aria-labelledby="limits-title">
          <div className="container home-limits__grid">
            <div className="home-section__intro home-limits__intro">
              <h2 id="limits-title">The label tells you what the seal does not.</h2>
              <p>
                A checkable result is not the same thing as an independent result. The page says
                which one you are looking at.
              </p>
            </div>
            <div className="home-limits__list">
              <article>
                <span className="home-path__origin home-path__origin--publisher">
                  Run by publisher
                </span>
                <p>
                  The files show what was planned, what ran, and how the number was calculated.
                  They do not prove that the runner was independent or honest.
                </p>
              </article>
              <article>
                <span className="home-path__origin home-path__origin--independent">
                  Run independently
                </span>
                <p>
                  Colophon ran the agreed method. That answers who ran it. It does not make a weak
                  benchmark strong or a conclusion broader than the evidence.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="home-contact" id="contact" aria-labelledby="contact-title">
          <div className="container home-contact__grid">
            <div>
              <h2 id="contact-title">What number do you need to stand behind?</h2>
              <p>
                Tell us what the number needs to support, the benchmark you have, and who will
                question it. We will work out which path fits.
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
