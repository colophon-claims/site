import Link from "next/link";
import { Mark } from "./mark";
import { LinkButton } from "./link-button";
import { listReports } from "@/lib/reports";

/** Adapted from the vendored site ui_kit's SiteHeader
 * (vendor/design-system/reference/ui_kits/site/Site.jsx): same rules and
 * spacing, real links instead of the kit's demo nav. */
export function SiteHeader() {
  const report = listReports()[0];
  const reportsHref = report === undefined ? "/#read-one" : `/reports/${report.slug}/`;
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="site-wordmark">
          <Mark size={22} />
          <span>Colophon</span>
        </Link>
        <nav className="site-nav">
          <Link href={reportsHref}>Report</Link>
          <Link href="/docs/">Docs</Link>
          <LinkButton href="/#contact" variant="primary">Bring a claim</LinkButton>
        </nav>
      </div>
    </header>
  );
}
