import Link from "next/link";
import { listReports } from "@/lib/reports";

/** Footer per the surface copy §7. Adapted from the vendored site ui_kit's
 * SiteFooter (vendor/design-system/reference/ui_kits/site/Site.jsx).
 * "Built on Jinn." appears exactly twice on a page: the infrastructure note
 * and the legal line, both here. Links are real or absent — no pending
 * placeholders on a public page. */
export function SiteFooter() {
  const reports = listReports();
  return (
    <footer className="site-footer">
      <div className="site-footer-grid">
        <div className="site-footer-brand">
          <span className="site-footer-name">Colophon</span>
          <p>
            Benchmark publishing for agent configurations. Colophon records how a result was
            produced. It does not certify that a result is correct.
          </p>
        </div>
        <div className="site-footer-col">
          <span className="site-footer-head">Product</span>
          <Link href="/reports/">Reports</Link>
          <Link href="/docs/">Docs</Link>
          <a href="/#contact">Bring a claim</a>
        </div>
        <div className="site-footer-col">
          <span className="site-footer-head">Reports</span>
          {reports.map((r) => (
            <Link key={r.slug} href={`/reports/${r.slug}/`}>
              {r.title}
            </Link>
          ))}
        </div>
        <div className="site-footer-col">
          <span className="site-footer-head">Developers</span>
          <a href="https://github.com/Jinn-Network/mono">Source</a>
          <Link href="/docs/#quickstart">Quickstart</Link>
          <Link href="/docs/#limits">What this does not do</Link>
        </div>
      </div>
      <div className="site-footer-legal">
        <p className="site-footer-infra">
          Colophon&apos;s execution, evidence, and verification layers are Jinn packages. Colophon
          defines the benchmark method, the evaluation policy, the accounting, and the published
          report. <strong>Built on Jinn, by Jinn contributors.</strong>
        </p>
        <div className="site-footer-line">
          <span>© 2026 Colophon</span>
          <span>Built on Jinn.</span>
        </div>
      </div>
    </footer>
  );
}
