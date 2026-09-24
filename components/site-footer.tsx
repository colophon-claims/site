import Link from "next/link";
import { listReports } from "@/lib/reports";

/** Footer per the surface copy §7. Adapted from the vendored site ui_kit's
 * SiteFooter (vendor/design-system/reference/ui_kits/site/Site.jsx).
 * The note above the legal line says what a reader can rely on: the format is
 * open and documented, and checking a claim needs nothing from Colophon.
 * Links are real or absent. There are no pending placeholders on a public page. */
export function SiteFooter({ quiet = false }: { quiet?: boolean }) {
  const reports = listReports();
  const report = reports[0];
  const reportHref = report === undefined ? "/reports/" : `/reports/${report.slug}/`;
  if (quiet) {
    return (
      <footer className="site-footer site-footer-report">
        <div className="site-footer-report-inner">
          <p><strong>Colophon</strong> publishes the evidence and limitations with the result.</p>
          <nav aria-label="Report footer">
            <Link href="/boards/">Boards</Link>
            <Link href="/reports/">Reports</Link>
            <Link href="/docs/#verification">Verification guide</Link>
          </nav>
          <span>© 2026 Colophon</span>
        </div>
      </footer>
    );
  }
  return (
    <footer className="site-footer">
      <div className="site-footer-grid">
        <div className="site-footer-brand">
          <span className="site-footer-name">Colophon</span>
          <p>
            Benchmark publishing for performance claims. Colophon records how a result was
            produced. It does not certify that a result is correct.
          </p>
        </div>
        <div className="site-footer-col">
          <span className="site-footer-head">Product</span>
          <Link href="/boards/">Boards</Link>
          <Link href="/reports/">Reports</Link>
          <Link href="/docs/">Docs</Link>
          <a href="/#contact">Bring a claim</a>
        </div>
        <div className="site-footer-col">
          <span className="site-footer-head">Reports</span>
          <Link href="/reports/">All reports</Link>
          {reports.map((r) => (
            <Link key={r.slug} href={`/reports/${r.slug}/`}>
              {r.title}
            </Link>
          ))}
        </div>
        <div className="site-footer-col">
          <span className="site-footer-head">Verification</span>
          {report !== undefined && <Link href={`${reportHref}#bundle`}>Check the bytes</Link>}
          <Link href="/docs/#verification">Check a report</Link>
          <Link href="/docs/#limits">What a report does not prove</Link>
        </div>
      </div>
      <div className="site-footer-legal">
        <p className="site-footer-infra">
          Sealed claims are published in an open, documented format. Checking one needs nothing
          from Colophon.
        </p>
        <div className="site-footer-line">
          <span>© 2026 Colophon</span>
        </div>
      </div>
    </footer>
  );
}
