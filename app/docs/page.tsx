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
  { href: "#execution", label: "Benchmark methods" },
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
            <h2>Run the benchmark. Keep the evidence.</h2>
            <p className="prose">
              Colophon is currently offered as a managed benchmark engagement, not as a generic
              self-serve runner. Bring the performance claim. We run an established suite according
              to its locked method, or define a custom benchmark around the question.
            </p>
            <p className="prose">
              The public reader is on npm. The broader runner remains operator managed. Where a
              suite specifies the agent, engine, repetitions, or grading, those choices are part of
              the official method and stay fixed. Change them and the result becomes a custom
              comparison on that task source, not an official-suite run.
            </p>
            <dl className="integration-list">
              <div>
                <dt>Official suite protocols</dt>
                <dd>
                  Terminal-Bench 2.1 and 3.0, SWE-bench Verified, APEX-Agents, APEX-SWE-dev,
                  DeepSWE v1.1, and Inspect eval. Colophon seals the selected suite version,
                  coverage, repetitions, and official execution requirements.
                </dd>
              </div>
              <div>
                <dt>Execution engines</dt>
                <dd>
                  Harbor, the SWE-bench harness, Archipelago, the APEX-SWE runners, Pier, and
                  Inspect. Each engine owns the work it runs or grades. Colophon owns the method
                  lock, the accounting, and the published bundle.
                </dd>
              </div>
              <div>
                <dt>Your agent or harness</dt>
                <dd>
                  Where the benchmark method permits a custom setup, current managed adapters
                  include Claude Code and Codex. If your harness needs another integration, we build
                  and qualify that path as part of the engagement before it enters the comparison.
                </dd>
              </div>
              <div>
                <dt>Custom benchmark</dt>
                <dd>
                  If no established suite answers the question, we fix the task sources, work
                  environments, grading, comparison arms, and exclusions with you before execution.
                  Those choices travel with the result.
                </dd>
              </div>
            </dl>
            <p className="prose">
              The published Skill-versus-CLAUDE.md report shows the custom path: pinned SkillsBench
              v1.1 task packages, versioned arm construction, one Claude Code setup, and the
              upstream task verifiers in pinned containers.
            </p>
            <p className="prose">
              A managed integration is not a promise that any suite or shell command can be dropped
              in unchanged. It means the required path is made explicit, qualified, and locked
              before the official run.
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
