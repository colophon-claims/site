import type { Metadata } from "next";
import { BoardTable } from "@/components/board-table";
import { BoardTasks } from "@/components/board-tasks";
import { CopyCommand } from "@/components/copy-command";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getBoard, listBoards, type Board } from "@/lib/boards";
import { shortKey } from "@/lib/bundle-facts";

export const dynamicParams = false;

export function generateStaticParams() {
  return listBoards().map((board) => ({ board: board.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ board: string }> }): Promise<Metadata> {
  const { board: slug } = await params;
  const board = getBoard(slug);
  return { title: board.name, description: board.lede };
}

const NUMBER_WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

function countWord(count: number): string {
  return NUMBER_WORDS[count] ?? count.toLocaleString("en-US");
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** How many listed claims the board holds, said plainly, a board of one included. */
function claimCount(board: Board): string {
  const words = board.words;
  if (board.claims.length === 1) {
    const arms = board.claims[0]?.arms.length ?? 0;
    return `One listed claim is on this board: the claim that opened it, with ${countWord(arms)} ${words.arms}`
      + " sealed together.";
  }
  return `${capitalise(countWord(board.claims.length))} listed claims are on this board.`;
}

function AboutMethod({ board }: { board: Board }) {
  const words = board.words;
  const key = board.key;
  const authors = [...new Set(board.claims.map((claim) => claim.methodAuthor))];
  const author = authors.length === 1 ? authors[0] ?? null : null;
  const first = board.claims[board.claims.length - 1];
  const methodFile = first === undefined ? null : `/reports/${first.slug}/bundle/benchmark.json`;
  return (
    <details className="board-about">
      <summary>About this {key.kind === "official-suite" ? "suite" : "method"}</summary>
      <div className="board-about-body">
        {key.kind === "official-suite" ? (
          <p>
            Board key: the suite, <code>{key.suite}</code>. Every listed claim on this suite lands here,
            whatever coverage it declared. Each row shows its coverage, and a row that did not run the full
            suite is marked. The claimant&apos;s agent is not part of the key.
          </p>
        ) : (
          <>
            <p>
              Board key: the locked method, <code className="board-digest">{key.digest}</code> (its tasks and
              scoring). The claimant&apos;s agent is not part of the key, so every listed claim on this same
              method lands here.
            </p>
            <div role="group" aria-label="Board key">
              <CopyCommand value={key.digest} />
            </div>
          </>
        )}
        <p>
          The {key.kind === "official-suite" ? "suite" : "method"}: {board.name}
          {board.version === null ? "" : `, version ${board.version}`}
          {board.description === null ? "" : <>, which describes itself as &ldquo;{board.description}&rdquo;</>}. It
          fixes {board.planned.toLocaleString("en-US")} {words.coverageUnit}
          {methodFile === null ? "" : <>; its sealed file is <a href={methodFile} download>benchmark.json</a></>}.
        </p>
        {author !== null && (
          <p>
            {board.claims.every((claim) => claim.authorIsClaimant) ? (
              <>
                The method&apos;s author and the claimant are the same signing key,{" "}
                <code>{shortKey(author)}</code>: the locked method names it as its author, and the sealed run
                record names it as the run&apos;s owner.
              </>
            ) : (
              <>The locked method names signing key <code>{shortKey(author)}</code> as its author.</>
            )}
          </p>
        )}
        <p>
          Colophon creates no benchmarks. This board opened when the first claim on this{" "}
          {key.kind === "official-suite" ? "suite" : "method"} was listed. Anyone who seals a new{" "}
          {words.arm.toLowerCase()} against the same {board.planned.toLocaleString("en-US")} {words.units}{" "}
          joins this board when that claim is listed.
        </p>
      </div>
    </details>
  );
}

export default async function BoardPage({ params }: { params: Promise<{ board: string }> }) {
  const { board: slug } = await params;
  const board = getBoard(slug);
  const scope = board.key.kind === "official-suite" ? "suite" : "locked method";

  return (
    <>
      <SiteHeader />
      <main className="board-page">
        <div className="container board-container">
          <header className="board-head">
            <nav className="claim-crumb" aria-label="Breadcrumb">
              <a href="/boards/">All boards</a>
            </nav>
            <h1>{board.name}</h1>
            <p className="board-lede">{board.lede}</p>
          </header>

          <div className="board-facts">
            <ul className="board-fact-line">
              <li>Same {scope} and scoring</li>
              <li>Coverage shown on every row</li>
              <li>All outcomes included</li>
            </ul>
            <AboutMethod board={board} />
          </div>

          <section className="board-claims" aria-labelledby="board-claims-title">
            <h2 id="board-claims-title" className="claim-hidden-heading">Claims on this board</h2>
            <p className="board-count">{claimCount(board)}</p>
            <BoardTable board={board} />
            <div className="board-foot">
              <p>Date sealed, newest first, unless you re-sort. One group is one sealed claim.</p>
              <p>A result for these tasks, not a ranking of overall ability.</p>
            </div>
          </section>

          <div className="board-disclosures">
            <BoardTasks board={board} />
            <details className="report-details board-disclosure">
              <summary>What makes these claims comparable?</summary>
              <div className="report-details-body">
                <p className="board-reading">
                  Every claim on this board ran the same {scope} under the same scoring. Rows can differ in
                  coverage, and each row says what it covered. A chart here never spans two boards. Claims on
                  different suites or methods are never compared.
                </p>
                {board.words.outsideKey !== null && <p className="board-reading">{board.words.outsideKey}</p>}
              </div>
            </details>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
