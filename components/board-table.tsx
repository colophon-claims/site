import type { CSSProperties } from "react";
import { CopyCommand } from "@/components/copy-command";
import { BoardSortTable, type BoardColumn, type BoardGroupData } from "@/components/board-sort-table";
import { shortKey, type Claimant, type VenueLabel } from "@/lib/bundle-facts";
import type { Board, BoardArm, BoardClaim } from "@/lib/boards";

/**
 * A board's rows, rendered on the server in the default order (date sealed,
 * newest first; inside one sealed claim, the record's own arm order). The
 * client table only reorders what is rendered here.
 *
 * Each claim is one group: who sealed it, its venue, when, and a link to its
 * permanent page. Each arm is one row: the arm as sealed, its venue, its
 * coverage, a bar on the board's shared axis with every part written out
 * beneath it, the rate with its denominator, the seal date and the claim link.
 * Colour never carries a result: every part of every bar is also a written
 * count, and nothing is bold or badged for being highest.
 */

/** The claim page's venue chip, same classes: Self-run or Colophon-run, from the sealed record. */
export function VenueChip({ venue }: { venue: VenueLabel }) {
  return (
    <span className={`claim-venue claim-venue--${venue === "Self-run" ? "self-run" : "colophon-run"}`}>
      {venue}
    </span>
  );
}

/**
 * The claimant as the sealed records name them: a name if a record ever
 * carries one, else the signing key, shortened, with the full key behind it.
 */
export function ClaimantKey({ who, authorIsClaimant }: { who: Claimant; authorIsClaimant: boolean }) {
  if (who.kind === "named") return <span>{who.value}</span>;
  if (who.kind === "not-stated") return <span>Claimant not stated</span>;
  return (
    <details className="claim-key board-key">
      <summary>
        {authorIsClaimant ? "Method author and run owner" : "Run owner"}: signing key{" "}
        <code>{shortKey(who.value)}</code>
      </summary>
      <div className="claim-key-body">
        <p>
          No claimant name is recorded. This is the key the sealed run record names as the run&apos;s
          owner{authorIsClaimant ? ", and the locked method names as its author" : ""}.
        </p>
        <div role="group" aria-label="Full signing key">
          <CopyCommand value={who.value} />
        </div>
      </div>
    </details>
  );
}

function GroupHeader({ claim, span }: { claim: BoardClaim; span: number }) {
  return (
    <th scope="rowgroup" colSpan={span} className="board-group">
      <span className="board-group-title">{claim.title}</span>
      <span className="board-group-meta">
        <ClaimantKey who={claim.claimant} authorIsClaimant={claim.authorIsClaimant} />
        <VenueChip venue={claim.venue} />
        <span>
          Sealed <time dateTime={claim.sealedAt}>{claim.sealedDate}</time>
        </span>
        <a href={claim.href}>Open the claim</a>
      </span>
    </th>
  );
}

function Bar({ arm, board }: { arm: BoardArm; board: Board }) {
  const words = board.words;
  const parts = [
    { kind: "passed", count: arm.passed, text: `${arm.passed} ${words.passed}` },
    { kind: "not-passed", count: arm.notPassed, text: `${arm.notPassed} ${words.notPassed}` },
    ...(arm.excluded > 0
      ? [{ kind: "excluded", count: arm.excluded, text: `${arm.excluded} ${words.excluded} (${arm.excludedReason})` }]
      : []),
  ];
  if (parts.reduce((sum, part) => sum + part.count, 0) !== arm.planned) {
    throw new Error(`arm ${arm.id}: the bar's parts do not add up to the ${arm.planned} planned`);
  }
  return (
    <div className="board-bar" style={{ "--board-track": arm.planned / board.planned } as CSSProperties}>
      <span className="board-bar-track" aria-hidden="true">
        {parts.filter((part) => part.count > 0).map((part) => (
          <span key={part.kind} className={`board-bar-part board-bar-part--${part.kind}`} style={{ flexGrow: part.count }} />
        ))}
      </span>
      <span className="board-bar-counts">
        {parts.map((part) => (
          <span key={part.kind} className={`board-bar-count board-bar-count--${part.kind}`}>{part.text}</span>
        ))}
      </span>
    </div>
  );
}

function ArmRow({ arm, claim, board }: { arm: BoardArm; claim: BoardClaim; board: Board }) {
  const subset = arm.coverage.kind === "subset";
  return (
    <>
      <th scope="row" className="board-arm">
        <details className="board-arm-facts">
          <summary>{arm.label}</summary>
          <span className="board-arm-sealed">
            Sealed as <code>{arm.id}</code>. {board.words.arm} ID, as the run record pins it:{" "}
            <code className="board-digest">{arm.instrumentSha256}</code>
          </span>
        </details>
        <span className="board-arm-pins">
          <code>{arm.judgeModel}</code> <code>{arm.harness.id} {arm.harness.version}</code>
        </span>
      </th>
      <td className="board-venue"><VenueChip venue={claim.venue} /></td>
      <td className="board-coverage">
        {arm.coverage.text}
        {subset && (
          <>
            {" "}<span className="board-marker">
              <span aria-hidden="true">*</span> part of the {board.key.kind === "official-suite" ? "suite" : "method"}
            </span>
          </>
        )}
      </td>
      <td className="board-bar-column"><Bar arm={arm} board={board} /></td>
      <td className="board-rate">
        <span className="board-rate-value">{arm.percent}</span>{" "}
        <span className="board-rate-of">({arm.passed} of {arm.scored})</span>
      </td>
      <td className="board-sealed"><time dateTime={claim.sealedAt}>{claim.sealedDate}</time></td>
      <td className="board-share">
        <a href={claim.href} aria-label={`Share claim: ${claim.title}, ${arm.label}`}>Share claim</a>
      </td>
    </>
  );
}

/** Four even steps from 0 to the planned count, written under the bar column's heading. */
function axisTicks(planned: number): number[] {
  return [0, 1, 2, 3, 4].map((step) => Math.round((planned * step) / 4));
}

export function BoardTable({ board }: { board: Board }) {
  const words = board.words;
  const columns: BoardColumn[] = [
    { key: "arm", label: words.arm, numeric: false, sortable: true, className: "board-col-arm" },
    { key: "venue", label: "Venue", numeric: false, sortable: true, className: "board-col-venue" },
    { key: "coverage", label: "Coverage", numeric: true, sortable: true, className: "board-col-coverage" },
    {
      key: "passed",
      label: words.passedColumn,
      numeric: true,
      sortable: true,
      className: "board-col-bar",
      axis: { ticks: axisTicks(board.planned), max: board.planned },
    },
    { key: "rate", label: words.rateColumn, numeric: true, sortable: true, className: "board-col-rate" },
    { key: "sealed", label: "Date sealed", numeric: false, sortable: true, className: "board-col-sealed" },
    { key: "claim", label: "Claim page", numeric: false, sortable: false, className: "board-col-share" },
  ];
  const groups: BoardGroupData[] = board.claims.map((claim) => ({
    id: claim.slug,
    header: <GroupHeader claim={claim} span={columns.length} />,
    rows: claim.arms.map((arm) => ({
      id: arm.id,
      sealed: claim.sealedAt,
      values: {
        arm: arm.label,
        venue: claim.venue,
        coverage: arm.planned,
        passed: arm.passed,
        rate: arm.estimate,
        sealed: claim.sealedAt,
      },
      content: <ArmRow arm={arm} claim={claim} board={board} />,
    })),
  }));
  const subsetRows = board.claims.some((claim) => claim.arms.some((arm) => arm.coverage.kind === "subset"));
  const scope = board.key.kind === "official-suite" ? "suite" : "method";
  const units = board.key.kind === "official-suite" ? "tasks" : words.coverageUnit;

  return (
    <>
      <div className="board-table-scroll">
        <BoardSortTable
          caption={`Every listed claim on this board, one group per sealed claim, one row per ${words.arm.toLowerCase()}.`}
          columns={columns}
          groups={groups}
          defaultOrder="date sealed, newest first"
        />
      </div>
      {subsetRows && (
        <p className="board-note">
          <span aria-hidden="true">*</span> Marked rows ran part of the {scope}, as their seal declares. Their
          percentage is out of the {units} they planned, not the full {scope}.
        </p>
      )}
    </>
  );
}
