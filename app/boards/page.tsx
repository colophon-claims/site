import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { listBoards, type Board } from "@/lib/boards";

export const metadata: Metadata = {
  title: "Boards",
  description:
    "Views over the claims sealed on one suite, or on one locked method. Not ranked against each other.",
};

function claimsText(board: Board): string {
  const claims = board.claims.length;
  const arms = board.claims.reduce((sum, claim) => sum + claim.arms.length, 0);
  return `${claims} ${claims === 1 ? "claim" : "claims"}, ${arms} ${board.words.arms}`;
}

function keyText(board: Board): string {
  return board.key.kind === "official-suite"
    ? `Official suite ${board.key.suite}`
    : `Locked method ${board.key.digest.slice(0, 8)}…${board.key.digest.slice(-4)}`;
}

export default function BoardsIndex() {
  const boards = listBoards();
  return (
    <>
      <SiteHeader />
      <main className="board-page boards-index">
        <div className="container board-container">
          <header className="board-head">
            <p className="claim-eyebrow">Boards</p>
            <h1>Boards</h1>
            <p className="board-lede">
              A board is a view over the claims sealed on one suite, or on one locked method that is no
              official suite. Every claim on it ran the same suite, or the same locked method, under the same
              scoring; each row says what coverage it took. A board is not the claims&apos; container; each
              claim has its own permanent page.
            </p>
          </header>

          <div className="table-scroll boards-table-scroll">
            <table className="data-table boards-table">
              <caption className="claim-hidden-heading">Every board, most recent seal first</caption>
              <thead>
                <tr>
                  <th scope="col">Board</th>
                  <th scope="col">Coverages on it</th>
                  <th scope="col">Claims</th>
                  <th scope="col">Most recent seal</th>
                </tr>
              </thead>
              <tbody>
                {boards.map((board) => (
                  <tr key={board.slug} data-sealed={board.mostRecentSeal}>
                    <th scope="row" className="boards-name">
                      <a href={board.href}>{board.name}</a>
                      <span className="boards-key">{keyText(board)}</span>
                    </th>
                    <td>{board.coverages.join("; ")}</td>
                    <td>{claimsText(board)}</td>
                    <td className="mono">
                      <time dateTime={board.mostRecentSeal}>{board.mostRecentSeal.slice(0, 10)}</time>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="board-foot-line">Most recent seal first. The order is by date, not merit.</p>

          <div className="board-notes">
            <p>
              Boards are not ranked against each other, and neither are the claims on them. Colophon creates no
              benchmarks. A board opens when the first claim on a suite or locked method is listed, and it stays
              a board of one until another listed claim shares that suite or method.
            </p>
            <p>
              Looking for one particular claim? <Link href="/reports/">Every listed claim is under Reports</Link>.
            </p>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
