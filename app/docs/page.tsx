import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

// Detail moved off the landing page in v2 (2026-08-13). The quickstart and the
// limitations are reproduced verbatim from surface copy v1.0; the limits are
// also printed in the product and in every report it produces.

export const metadata: Metadata = {
  title: "Docs",
  description:
    "Running Colophon from a source checkout, every verb, and the limits of what a report establishes.",
};

const LIMITS: { lead: string; body: string }[] = [
  {
    lead: "This is a self-run venue.",
    body: "The same operator controls task dispatch, execution, and evaluation. Locking the method is a discipline this tool enforces on that operator's own process, not a proof against them: nothing stops a run owner from altering a record before publishing it. What a local run establishes is reproducibility and internal discipline. If you want the claim settled rather than shown, clone the benchmark and run it yourself.",
  },
  {
    lead: "Distinct evaluator identities are not distinct parties.",
    body: "Each evaluator identity is backed by its own signing key minted in the same workspace, and Colophon checks every verdict signature against it. That establishes which key signed which verdict. It does not establish that unrelated people or organizations were involved.",
  },
  {
    lead: "Agreement among evaluators is not correctness.",
    body: "A majority or a unanimous result is a reduction rule you declared before the run, applied to judgments that can be wrong together. Reports state the independence mode, the verdict counts, and the reduction rule that actually applied, not just the label you picked.",
  },
  {
    lead: "A report is not a certification and not a ranking.",
    body: "Nothing here is accredited, official, or scored against other reports. No comparative winner is stated, and the published assets say so on their face. A report is evidence about one question, on one task set, on one date.",
  },
  {
    lead: "Pinning covers three axes, and one is vacuous.",
    body: "Harness, model, and loadout are enforced at dispatch. The isolation axis is not: this venue's launchers admit exactly one isolation policy, so a match on it proves nothing about containment strength. Reports carry the per-axis counts rather than implying that everything configured was enforced.",
  },
  {
    lead: "Cost figures are self-reported.",
    body: "They come from this venue's own resource observations. Nothing settled them.",
  },
  {
    lead: "Rehearsals happen, and they are disclosed.",
    body: "A preview is an unregistered run. It produces disposable artifacts, never enters official results, and when any preview preceded an official run, that run's report says so in its limitations.",
  },
  {
    lead: "Publishing makes the run public, and it writes to your disk.",
    body: "The bundle deliberately contains the tasks, deliveries, verdicts, report, and claim. Drafts, grants, audit state, environment data, and private keys stay behind, but the bundle is not a PII scrubber. publish uploads nothing, hosts nothing, and deploys nothing: the reports on this site are files placed here by hand.",
  },
  {
    lead: "Network execution is not available yet.",
    body: "The marketplace venue, where pre-registration and completeness become checkable against the run's own owner, has prerequisites that are not built. Until they are, the product reports that venue as unavailable rather than running everything locally under a stronger name.",
  },
];

export default function Docs() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="section">
          <div className="container hero">
            <span className="eyebrow">Docs</span>
            <h1>Running it, and what it does not establish.</h1>
          </div>
        </section>

        <section className="section" id="quickstart">
          <div
            className="container"
            style={{ display: "flex", flexDirection: "column", gap: "var(--space-7)" }}
          >
            <h2 style={{ font: "var(--type-title)", fontSize: "var(--text-2xl)" }}>Quickstart</h2>
            <p className="prose">
              Colophon runs from a source checkout today. There is no published package, no hosted
              service, and no account. A first benchmark needs no API key, no network venue, and no
              funds: the sample benchmark and both sample arms are bundled.
            </p>
            <p className="prose">
              Node.js 22 (22.23.1 is the verified runtime), Yarn 4.13.0, and a checkout with the
              workspace dependency distributions already built in the order used by{" "}
              <code>.github/workflows/benchmark-product-ci.yml</code>.
            </p>
            <pre className="codeblock">
              <code>{`git clone https://github.com/Jinn-Network/mono.git
cd mono/packages/benchmark-product/core
yarn install --immutable && yarn public-quickstart`}</code>
            </pre>
            <p className="code-note">
              That builds the CLI, creates a temporary workspace, attaches the bundled three-task
              benchmark and two real subprocess arms, and drives the full lifecycle to a published
              bundle. It then copies the bundle out, deletes the workspace that made it, and
              requires the standalone verifier to return all six checks from the copy. It prints a
              JSON evidence envelope and removes its own temporary directory.
            </p>
          </div>
        </section>

        <section className="section" id="verbs">
          <div
            className="container"
            style={{ display: "flex", flexDirection: "column", gap: "var(--space-7)" }}
          >
            <h2 style={{ font: "var(--type-title)", fontSize: "var(--text-2xl)" }}>
              The same run, verb by verb
            </h2>
            <pre className="codeblock">
              <code>{`colophon init         --workspace ./bench --principal you
colophon draft create --workspace ./bench --principal you --id first --name "First benchmark"
colophon sample init  --workspace ./bench --principal you --draft first

colophon arm add --workspace ./bench --principal you --draft first \\
  --arm baseline --pinning '{"harness":{"id":"prediction-v1-baseline","version":"1.0.0"}}'
colophon arm add --workspace ./bench --principal you --draft first \\
  --arm sample-uniform --pinning '{"harness":{"id":"sample-uniform","version":"0.1.0"}}'

colophon quote   --workspace ./bench --principal you --draft first
colophon lock    --workspace ./bench --principal you --draft first
colophon launch  --workspace ./bench --principal you --draft first
colophon collect --workspace ./bench --principal you --draft first
colophon report  --workspace ./bench --principal you --draft first
colophon publish --workspace ./bench --principal you --draft first

colophon bundle verify --bundle ./bench/artifacts/first/public-bundles/<identity> --json`}</code>
            </pre>
            <p className="code-note">
              From a source checkout the binary is <code>node dist/cli/bin.js</code>;{" "}
              <code>colophon</code> is the command name once the package is on your path, and{" "}
              <code>benchmark-product</code> remains as an alias.
            </p>
            <p className="code-note">
              <code>colophon help</code> lists every verb and its flags. Add <code>--json</code> to
              any of them for one machine-readable envelope on stdout. Exit codes: 0 success, 2
              invalid invocation, 3 authority denied, 1 every other typed error.
            </p>
            <p className="code-note">
              To bring your own tasks instead of the sample,{" "}
              <code>colophon import swebench</code> takes SWE-bench-shaped rows.
            </p>
          </div>
        </section>

        <section className="section" id="limits">
          <div className="container">
            <h2 style={{ font: "var(--type-title)", fontSize: "var(--text-2xl)" }}>
              What this does not do
            </h2>
            <p className="prose" style={{ marginTop: "var(--space-6)" }}>
              These limits are printed in the product and in every report it produces. They are the
              reason the bundle exists.
            </p>
            <ul className="limits-list">
              {LIMITS.map((item) => (
                <li key={item.lead}>
                  <strong>{item.lead}</strong> {item.body}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
