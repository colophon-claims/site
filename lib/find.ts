import { listBoards, type Board, type BoardClaim } from "@/lib/boards";
import type { Claimant, VenueLabel } from "@/lib/bundle-facts";
import { isQualifiedReport, listReports } from "@/lib/reports";

/**
 * Rows for /find/ (and /reports/, which renders the same lookup component):
 * one row per listed claim, a lookup, not a feed and not a ranking. A claim
 * reaches this list only by first reaching a board (lib/boards.ts), so a row
 * here never states a claimant, a coverage, a venue or a board link that the
 * board itself does not already carry; the one fact a board does not print
 * that this page needs is the claim's own short finding in words, read here
 * from the claim's result.
 */

export interface FindRow {
  slug: string;
  title: string;
  href: string;
  claimant: Claimant;
  authorIsClaimant: boolean;
  /** The suite name, or the locked method's sealed name (the board's own). */
  suiteOrMethod: string;
  coverageText: string;
  venue: VenueLabel;
  sealedAt: string;
  sealedDate: string;
  /** The claim's own finding in words: the first sentence of its reported result. */
  finding: string;
  board: { slug: string; name: string; href: string };
  /** Lower-cased title, suite/method name and claimant, for the search box. */
  searchText: string;
}

export interface FindBoardOption {
  slug: string;
  name: string;
}

/** The claim's own finding, in words: the first sentence of its reported result. */
function firstSentence(text: string): string {
  return (text.split(/(?<=\.)\s+/u)[0] ?? text).trim();
}

function claimantSearchText(who: Claimant): string {
  return who.kind === "not-stated" ? "" : who.value;
}

function findRow(board: Board, claim: BoardClaim, finding: string): FindRow {
  return {
    slug: claim.slug,
    title: claim.title,
    href: claim.href,
    claimant: claim.claimant,
    authorIsClaimant: claim.authorIsClaimant,
    suiteOrMethod: board.name,
    coverageText: claim.coverage.text,
    venue: claim.venue,
    sealedAt: claim.sealedAt,
    sealedDate: claim.sealedDate,
    finding,
    board: { slug: board.slug, name: board.name, href: board.href },
    searchText: [claim.title, board.name, claimantSearchText(claim.claimant)].join(" ").toLowerCase(),
  };
}

let rowsCache: FindRow[] | null = null;

/**
 * Every listed claim, one row per claim, newest seal first, the slug as the
 * stable secondary key so the order never shuffles between builds. Built
 * from the boards each claim already sits on, so a claim listed here is
 * always on exactly one board (the boards issue's own invariant), and this
 * page never opens a board link that the boards index does not also carry.
 */
export function findRows(): FindRow[] {
  if (rowsCache !== null) return rowsCache;
  const reportsBySlug = new Map(
    listReports().filter(isQualifiedReport).map((report) => [report.slug, report]),
  );
  const rows: FindRow[] = [];
  for (const board of listBoards()) {
    for (const claim of board.claims) {
      const report = reportsBySlug.get(claim.slug);
      if (report === undefined) {
        throw new Error(`${claim.slug}: on the ${board.slug} board but not among the listed reports`);
      }
      rows.push(findRow(board, claim, firstSentence(report.result.primary)));
    }
  }
  rowsCache = rows.sort((left, right) => right.sealedAt.localeCompare(left.sealedAt) || left.slug.localeCompare(right.slug));
  return rowsCache;
}

/** Every board that exists, for the board filter: "All" plus each real board. */
export function findBoardOptions(): FindBoardOption[] {
  return listBoards().map((board) => ({ slug: board.slug, name: board.name }));
}
