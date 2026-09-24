import type { Metadata } from "next";
import FindPage, { metadata as findMetadata } from "@/app/find/page";

export const metadata: Metadata = findMetadata;

/**
 * /reports/: the site's original listing address, kept reachable (issue 21).
 * It renders the same lookup component as /find/ (app/find/page.tsx), so the
 * two addresses show the same page; /find/ is the canonical lookup address.
 * Permanent claim addresses stay at /reports/<slug>/.
 */
export default function ReportsIndex() {
  return <FindPage />;
}
