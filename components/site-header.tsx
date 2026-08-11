import Link from "next/link";
import { Mark } from "./mark";

/** Adapted from the vendored site ui_kit's SiteHeader
 * (vendor/design-system/reference/ui_kits/site/Site.jsx): same rules and
 * spacing, real links instead of the kit's demo nav. */
export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="site-wordmark">
          <Mark size={22} />
          <span>Colophon</span>
        </Link>
        <nav className="site-nav">
          <Link href="/reports/">Reports</Link>
          <a href="/#what-it-does">What it does</a>
          <a href="/#run-it-yourself">Run it yourself</a>
          <a href="/#limits">What this does not do</a>
        </nav>
      </div>
    </header>
  );
}
