import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Docs",
  description: "How to read a Colophon report, check its bundle, and understand its limits.",
};

const CHECKS = [
  "manifest closure",
  "evidence closure",
  "artifact integrity",
  "signature validity",
  "matrix re-derivation",
  "report verification",
  "claim consistency",
];

const LIMITS: { lead: string; body: string }[] = [
  {
    lead: "A local run does not prove honesty against its owner.",
    body: "A locked method disciplines the operator's process. The bundle lets another reader inspect and replay that process. Neither one stops the run owner from withholding a different run before publication.",
  },
  {
    lead: "Distinct identities are not distinct real-world parties.",
    body: "A key can establish which identity signed a record. It does not establish that unrelated people or organizations controlled those identities.",
  },
  {
    lead: "A valid signature is not a correct judgment.",
    body: "The reader checks the signed bytes and the declared reduction. Evaluators can still be wrong, including together.",
  },
  {
    lead: "A report is not a certification or ranking.",
    body: "It answers one declared question over one bounded task population. It does not grant a seal, score unrelated reports, or establish a general winner.",
  },
  {
    lead: "Scope travels with the result.",
    body: "The task population, model, loading paths, analysis subset, host deviations, and failed cells stay visible. A compact claim that drops those limits is not the report.",
  },
  {
    lead: "Publishing is local bundle emission, not upload.",
    body: "The product writes an immutable bundle to disk. This site receives and serves a byte-exact copy as a separate operator step.",
  },
];

const NAV = [
  { href: "#reader", label: "Reader" },
  { href: "#bundle", label: "Bundle shape" },
  { href: "#execution", label: "Execution paths" },
  { href: "#limits", label: "Limits" },
];

export default function Docs() {
  return (
    <>
      <SiteHeader />
      <main className="docs-layout">
        <aside className="docs-rail">
          <span className="docs-rail-label">Docs</span>
          <nav className="docs-nav">
            {NAV.map((item) => (
              <a href={item.href} key={item.href}>{item.label}</a>
            ))}
          </nav>
        </aside>

        <div className="docs-content">
          <section id="top">
            <h1>Read the report. Then check its bytes.</h1>
            <p className="docs-lede">
              The page is a reading surface for a published bundle. It makes the result and its
              limits legible; it is not the source of truth for the claim.
            </p>
          </section>

          <section id="reader">
            <h2>Reader</h2>
            <p className="prose">
              Download a report bundle, then run the public reader from npm.
            </p>
            <pre className="codeblock">
              <code>npx @colophon-claims/verify@0.1 ./bundle</code>
            </pre>
            <p className="code-note">
              The reader checks {CHECKS.join(", ")}. You can also inspect the JSON, recompute the
              listed SHA-256 digests, or verify the signatures with other tools; Colophon is not
              required to check a Colophon bundle.
            </p>
            <p className="code-note">
              Protocol identifiers under <code>https://spec.jinn.network/</code> are names; that
              origin is not hosted yet. The reader uses the exact platform bytes installed from
              npm.
            </p>
          </section>

          <section id="bundle">
            <h2>Bundle shape</h2>
            <p className="prose">
              <code>bundle.json</code> is the complete byte and digest inventory. An evidence-native
              bundle also carries the public reading record, signed report envelope, machine claim
              package, declared analysis, evidence cohort, result matrix, evidence records,
              artifacts, public keys, and source disclosures.
            </p>
            <p className="prose">
              The report page links the canonical files first and gives the bundle identity and
              report-envelope digest in full. Every manifest-bound path remains available under
              the report&apos;s <code>/bundle/</code> directory. The site does not rewrite those files.
            </p>
          </section>

          <section id="execution">
            <h2>Bring the stack that runs your trials</h2>
            <p className="prose">
              Colophon does not replace the framework, agent harness, or suite that executes the
              work. It locks the comparison around that engine, accounts for every result, and
              carries the evidence into one published bundle.
            </p>
            <p className="prose">
              The paths below are implemented in the source product. They are not yet available to
              a stranger through npm; publishing the public packages is still a release gate.
            </p>
            <dl className="integration-list">
              <div>
                <dt>Agent harnesses</dt>
                <dd>
                  Claude Code and Codex. Colophon records the selected executable, model, effort,
                  and loadout instead of accepting an unbounded shell command.
                </dd>
              </div>
              <div>
                <dt>Evaluation runtime</dt>
                <dd>
                  Inspect. A selected Inspect evaluation runs each cell beneath the locked Colophon
                  method; its evaluation log remains runtime evidence, not the published claim by
                  itself.
                </dd>
              </div>
              <div>
                <dt>Official suite paths</dt>
                <dd>
                  Terminal-Bench 2.1 through Harbor, and SWE-bench Verified through its official
                  harness. The suite engine runs or grades the work; Colophon owns the lock,
                  accounting, and bundle.
                </dd>
              </div>
              <div>
                <dt>Execution venue</dt>
                <dd>
                  The current product profile runs locally, with pinned Docker or OCI grading when
                  the benchmark requires a task environment. Network venues are not part of this
                  release.
                </dd>
              </div>
            </dl>
            <p className="prose">
              This report is a worked example of another path: pinned SkillsBench v1.1 task
              packages, Colophon-owned arm construction, one Claude Code harness, and the upstream
              task verifiers in pinned containers.
            </p>
          </section>

          <section id="limits">
            <h2>What this does not establish</h2>
            <ul className="limits-list">
              {LIMITS.map((item) => (
                <li key={item.lead}>
                  <strong>{item.lead}</strong> {item.body}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
