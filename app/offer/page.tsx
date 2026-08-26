import type { Metadata } from "next";
import Link from "next/link";
import { LinkButton } from "@/components/link-button";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "The standing offer",
  description:
    "The rules Colophon commits to in public: the same terms for every party, official runs that publish regardless of the result, and no ranking.",
};

const CONTACT_EMAIL = "ritsu@colophon.claims";

const NAV = [
  { href: "#terms", label: "Same terms" },
  { href: "#publish", label: "Publish regardless" },
  { href: "#no-ranking", label: "No ranking" },
  { href: "#disputes", label: "Disputes" },
  { href: "#lock", label: "What the lock claims" },
  { href: "#offers", label: "Offers on record" },
  { href: "#bring", label: "Bring a claim" },
];

export default function Offer() {
  return (
    <>
      <SiteHeader />
      <main className="docs-layout docs-guide">
        <aside className="docs-rail">
          <span className="docs-rail-label">Standing offer</span>
          <nav className="docs-nav">
            {NAV.map((item) => (
              <a href={item.href} key={item.href}>{item.label}</a>
            ))}
          </nav>
        </aside>

        <article className="docs-content">
          <section className="docs-hero" id="overview">
            <h1>The standing offer.</h1>
            <p className="docs-lede">
              These are the rules Colophon runs on. They are published so you can hold us to
              them, and they are the same for everyone.
            </p>
            <p className="docs-body">
              Anyone with a comparative performance claim can engage on the terms below. When
              vendors compete on the same question, each of them is offered the same engagement,
              and this page is the record of that commitment.
            </p>
          </section>

          <section className="docs-section" id="terms">
            <div className="docs-section-heading">
              <h2>Same terms for everyone</h2>
              <p>No private variants, no preferred party.</p>
            </div>
            <div className="docs-method-copy">
              <p>
                Every party competing on the same question gets the same fee, the same process,
                and the same publication rights. The fee is stated in the proposal, and it is
                identical for every party in that dispute. If the terms improve for one party,
                they improve for all of them.
              </p>
            </div>
          </section>

          <section className="docs-section" id="publish">
            <div className="docs-section-heading">
              <h2>Official runs publish, whatever they find</h2>
              <p>Entering is the signal. The result is not negotiable afterward.</p>
            </div>
            <div className="docs-method-copy">
              <p>
                Once a method is locked, the report publishes. A favorable result publishes. An
                unfavorable result publishes.
              </p>
              <p>
                You can rehearse privately before anything locks, and nothing from a rehearsal is
                published. But the official report states that a rehearsal preceded it.
              </p>
              <p>
                After the lock, an engagement ends one of two ways: a published report, or a
                published abort record stating the stage reached and a reason from a fixed list.
                There is no third way out, for you or for us.
              </p>
            </div>
          </section>

          <section className="docs-section" id="no-ranking">
            <div className="docs-section-heading">
              <h2>Colophon hosts sealed runs. It does not rank.</h2>
              <p>Each report answers one declared question.</p>
            </div>
            <div className="docs-method-copy">
              <p>
                Reports sit side by side, each with its method, accounting, evidence, and limits
                attached. The venue never combines them into a leaderboard, an award, or an
                endorsement. If an ordering matters to you, read the reports and their limits;
                we will not compress them into one number for you.
              </p>
            </div>
          </section>

          <section className="docs-section" id="disputes">
            <div className="docs-section-heading">
              <h2>Disputes resolve by addition</h2>
              <p>The answer to a contested comparison is another sealed run, not a takedown.</p>
            </div>
            <div className="docs-method-copy">
              <p>
                If a published comparison touches your product and you dispute it, the remedy is
                open to you on this page: run your variant, on these same terms, with the method
                locked before execution. Both reports publish. Because both methods are fixed and
                fully accounted for, the difference between them can be traced to what actually
                differed.
              </p>
              <p>
                Before we publish a comparison in a live dispute, we offer these terms to every
                party named in it. That offer does not expire when the report publishes.
              </p>
            </div>
          </section>

          <section className="docs-section" id="lock">
            <div className="docs-section-heading">
              <h2>What the lock claims, and what it does not</h2>
              <p>The seal is a narrow, checkable commitment. Read it as one.</p>
            </div>
            <ul className="docs-limits">
              <li>
                <h3>The method is fixed before the run.</h3>
                <p>
                  Tasks, setups, repetitions, grading, and exclusions are locked before the
                  official run begins, enforced by the tooling rather than promised by the
                  operator, and every planned result is accounted for in the published record.
                  That closes off editing the method after seeing the results.
                </p>
              </li>
              <li>
                <h3>The lock does not launder scope.</h3>
                <p>
                  Whose tasks, who curated the grading, which judge: those choices are printed on
                  the report&apos;s face, and a reader should weigh them. A flattering scope can
                  pass through a lock. It cannot hide.
                </p>
              </li>
              <li>
                <h3>Who ran it is part of the record.</h3>
                <p>
                  Each report states whether the run was executed by the claim owner or by the
                  venue. Runs judged by evaluators independent of both are not offered yet.
                </p>
              </li>
              <li>
                <h3>A report is not a certification, an approval, or a ranking.</h3>
                <p>
                  When a sealed result is challenged, we defend the process and hand over the
                  evidence. We do not defend the number.{" "}
                  <Link href="/docs/#limits">What a report does not prove</Link>
                </p>
              </li>
            </ul>
          </section>

          <section className="docs-section" id="offers">
            <div className="docs-section-heading">
              <h2>Offers on record</h2>
              <p>
                When we extend these terms to the parties named in a dispute before publishing,
                the offer is recorded here with its date and stays open.
              </p>
            </div>
            <div className="docs-method-copy">
              <p>No offer is on record yet.</p>
            </div>
          </section>

          <section className="docs-contact" id="bring">
            <div>
              <h2>This page is the terms. To use them, bring the claim.</h2>
              <p>
                Send us the claim, the decision it supports, and the benchmark you have in mind.
                A reply comes from a person, usually within two working days.
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
