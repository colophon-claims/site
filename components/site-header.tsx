import Link from "next/link";
import { Mark } from "./mark";
import { LinkButton } from "./link-button";

/** Adapted from the vendored site ui_kit's SiteHeader
 * (vendor/design-system/reference/ui_kits/site/Site.jsx): same rules and
 * spacing, real links instead of the kit's demo nav. */
export function SiteHeader({
  quiet = false,
  ctaLabel = "Bring a claim",
}: {
  quiet?: boolean;
  ctaLabel?: string;
}) {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="site-wordmark">
          <Mark size={22} />
          <span>Colophon</span>
        </Link>
        <nav className="site-nav">
          <Link href="/reports/">Reports</Link>
          <Link href="/docs/">Docs</Link>
          {!quiet && (
            <span className="site-nav-cta">
              <LinkButton href="/#contact" variant="primary">{ctaLabel}</LinkButton>
            </span>
          )}
        </nav>
      </div>
    </header>
  );
}
