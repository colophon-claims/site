import type { Metadata } from "next";
import { FindControls } from "@/components/find-controls";
import { FindList } from "@/components/find-list";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { findBoardOptions, findRows } from "@/lib/find";

export const metadata: Metadata = {
  title: "Find a claim",
  description: "Every public claim listed on Colophon, newest first. The order is by date, not merit.",
};

/**
 * /find/: a lookup, not a feed and not a ranking. Every public claim listed
 * on Colophon, newest first, with a search box and a board filter, both the
 * page's own script over data already in the page (components/find-controls.tsx).
 * With script off the full list still renders in date order
 * (components/find-list.tsx), because that list is what this page renders
 * regardless of script.
 *
 * /reports/ renders this same component (app/reports/page.tsx), so the two
 * addresses show the same page; permanent claim addresses stay at
 * /reports/<slug>/.
 */
export default function FindPage() {
  const rows = findRows();
  const boards = findBoardOptions();

  return (
    <>
      <SiteHeader />
      <main className="find-main">
        <div className="container find-container">
          <header className="find-head">
            <p className="claim-eyebrow">Find a claim</p>
            <h1>Find a claim</h1>
            <p className="find-lede">
              Every public claim listed on Colophon, newest first. The order is by date, not merit.
            </p>
          </header>

          <FindControls totalCount={rows.length} boards={boards}>
            <FindList rows={rows} />
          </FindControls>

          <p className="find-foot-note">
            Colophon does not rank claims against each other, and claims sealed on different suites or
            methods are never compared. This listing is every public claim listed on Colophon, not every
            private or external claim ever created.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
