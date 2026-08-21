import type { Metadata } from "next";
import Link from "next/link";
import { LinkButton } from "@/components/link-button";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "How Colophon works",
  description:
    "How Colophon turns an agent benchmark result into a published claim others can inspect.",
};

const CONTACT_EMAIL = "ritsu@colophon.claims";

const NAV = [
  { href: "#overview", label: "Overview" },
  { href: "#when", label: "When it matters" },
  { href: "#process", label: "How it works" },
  { href: "#reports", label: "Reports and evidence" },
  { href: "#methods", label: "Benchmark methods" },
  { href: "#limits", label: "Limits" },
];

const USE_CASES = [
  {
    title: "You need to support a performance claim",
    body: "Before a result appears in a release, sales conversation, research note, or README, publish the basis for it.",
  },
  {
    title: "You need to choose between agent setups",
    body: "Compare them on work that represents the decision, using a method agreed before the official run.",
  },
  {
    title: "You expect the answer to be challenged",
    body: "Give the reader the method, the full accounting, the evidence, and the limits without asking them to trust a screenshot.",
  },
];

const PROCESS = [
  {
    title: "Start with the claim",
    body: "Name the exact performance question and the decision the answer needs to support.",
  },
  {
    title: "Choose the benchmark",
    body: "Use an established suite when its official method fits, or define a benchmark around the claim.",
  },
  {
    title: "Lock the method",
    body: "Agree the tasks, setups, repetitions, grading, exclusions, and limits before the official run begins.",
  },
  {
    title: "Run and account",
    body: "Execute the plan and retain every expected outcome, including failures, timeouts, and missing results.",
  },
  {
    title: "Publish the evidence",
    body: "Release a readable report, the exact supporting bundle, and the limits on the answer.",
  },
];

const PUBLISHED_PARTS = [
  {
    title: "A readable report",
    body: "The question, result, method, accounting, and limitations in one public reading surface.",
  },
  {
    title: "The evidence bundle",
    body: "The exact records and artifacts behind the report, listed by digest and available for download.",
  },
  {
    title: "A permanent URL",
    body: "An append-only public origin. A correction becomes a new report; the old published bytes remain available.",
  },
];

const VERIFIER_CHECKS = [
  "Every file listed by the bundle is present and unchanged.",
  "The evidence records cover the result the report presents.",
  "The supplied signatures match the published records.",
  "The result table can be rebuilt from the evidence.",
  "The readable report and machine-readable claim agree.",
];

const LIMITS = [
  {
    title: "A method lock does not prove honesty against the run owner.",
    body: "It disciplines the official process and makes the published run inspectable. It cannot show that another run was never withheld.",
  },
  {
    title: "Distinct identities are not necessarily distinct parties.",
    body: "A signature identifies the key that signed a record. It does not prove that unrelated people or organizations controlled those keys.",
  },
  {
    title: "A valid record can still contain a wrong judgment.",
    body: "Verification checks the signed bytes and declared reduction. Evaluators can still be mistaken, including together.",
  },
  {
    title: "A report is not a certification or ranking.",
    body: "It answers one declared question. Colophon does not grant a seal, accredit a result, or rank unrelated reports.",
  },
  {
    title: "The scope remains part of the result.",
    body: "The model, tasks, method, failed checks, exclusions, and other limitations travel with the answer.",
  },
];

export default function Docs() {
  return (
    <>
      <SiteHeader />
      <main className="docs-layout docs-guide">
        <aside className="docs-rail">
          <span className="docs-rail-label">Docs</span>
          <nav className="docs-nav">
            {NAV.map((item) => (
              <a href={item.href} key={item.href}>{item.label}</a>
            ))}
          </nav>
        </aside>

        <article className="docs-content">
          <section className="docs-hero" id="overview">
            <h1>How Colophon turns a benchmark result into a claim others can check.</h1>
            <p className="docs-lede">
              Colophon locks the method before execution, accounts for every planned result, and
              publishes the answer with its evidence and limits attached.
            </p>
            <p className="docs-thesis">
              A benchmark score is easy to publish. The difficult part is keeping the question,
              method, missing results, and limitations attached when the number travels.
            </p>
            <p className="docs-body">
              Colophon is a managed benchmark publishing process for agent performance claims. It
              is for results that will inform a release, a customer claim, a choice between agent
              setups, or a technical argument that someone else needs to inspect.
            </p>
          </section>

          <section className="docs-section" id="when">
            <div className="docs-section-heading">
              <h2>When Colophon is useful</h2>
              <p>Use it when the answer needs to survive outside the person who produced it.</p>
            </div>
            <div className="docs-use-list">
              {USE_CASES.map((item) => (
                <article key={item.title}>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="docs-section" id="process">
            <div className="docs-section-heading">
              <h2>From claim to published evidence</h2>
              <p>The order matters. The official method is fixed before the official result exists.</p>
            </div>
            <ol className="docs-process">
              {PROCESS.map((item, index) => (
                <li key={item.title}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </li>
              ))}
            </ol>
          </section>

          <section className="docs-section" id="reports">
            <div className="docs-section-heading">
              <h2>The report is readable. The evidence stays attached.</h2>
              <p>The page explains the answer. The bundle remains the exact source behind it.</p>
            </div>
            <div className="docs-published-parts">
              {PUBLISHED_PARTS.map((item) => (
                <article key={item.title}>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </article>
              ))}
            </div>

            <div className="docs-verification" id="verification">
              <div className="docs-verification-copy">
                <h3>Check a report</h3>
                <p>
                  The public verifier answers a narrow, useful question: do the downloaded records
                  belong together, and do they support the result that was published?
                </p>
                <p>
                  It does not run a benchmark, judge whether the benchmark was well chosen, or make
                  an evaluator&apos;s decision correct.
                </p>
              </div>
              <pre className="codeblock">
                <code>npx @colophon-claims/verify@0.1 ./bundle</code>
              </pre>
              <ul className="docs-check-list">
                {VERIFIER_CHECKS.map((item) => <li key={item}>{item}</li>)}
              </ul>
              <p className="docs-note">
                The verifier is a convenience, not a requirement. A reader can inspect the JSON,
                recompute the listed SHA-256 digests, and verify the signatures with other tools.
              </p>
            </div>
          </section>

          <section className="docs-section" id="methods">
            <div className="docs-section-heading">
              <h2>Established methods or a benchmark built for the claim</h2>
              <p>
                Colophon is currently offered as a managed engagement. There is no public
                self-serve benchmark runner yet.
              </p>
            </div>
            <div className="docs-method-copy">
              <p>
                Current managed methods include Terminal-Bench 2.1 and 3.0, SWE-bench Verified,
                APEX-Agents, APEX-SWE-dev, DeepSWE v1.1, and Inspect eval. When an official method
                specifies the agent, engine, tasks, repetitions, or grading, those choices remain
                fixed. Change them and the work becomes a custom comparison using that task source.
              </p>
              <p>
                If no established method answers the question, we define the task sources, work
                environments, grading, comparison arms, and exclusions with you before execution.
                Where the method allows a custom agent or harness, we build and qualify that path
                before it enters the official comparison.
              </p>
            </div>
            <div className="docs-role-split">
              <div>
                <h3>The runner or harness</h3>
                <p>Executes and grades the benchmark work.</p>
              </div>
              <div>
                <h3>Colophon</h3>
                <p>
                  Locks the agreed method, records what happened, accounts for the complete plan,
                  and publishes the result.
                </p>
              </div>
            </div>
            <Link href="/reports/">Browse published reports</Link>
          </section>

          <section className="docs-section" id="limits">
            <div className="docs-section-heading">
              <h2>What a Colophon report does not prove</h2>
              <p>These are limits on the claim, not fine print to remove from it.</p>
            </div>
            <ul className="docs-limits">
              {LIMITS.map((item) => (
                <li key={item.title}>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="docs-contact" id="work-with-us">
            <div>
              <h2>What claim needs to hold up?</h2>
              <p>
                Send us the claim, the decision it supports, and the benchmark you have in mind.
                If no suite fits, we&apos;ll shape the task set and lock the method with you.
              </p>
            </div>
            <LinkButton href={`mailto:${CONTACT_EMAIL}`} variant="primary" size="lg">
              Bring us your claim
            </LinkButton>
          </section>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
