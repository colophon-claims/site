import { BoardTaskGrid, type TaskGridData } from "@/components/board-task-grid";
import { VenueChip } from "@/components/board-table";
import {
  claimTasks,
  type Board,
  type ClaimTasks,
  type TaskArmOutcome,
  type TaskCall,
} from "@/lib/boards";

/**
 * Task by task: every planned unit of every claim on a board, arm by arm,
 * failures and exclusions included, behind one disclosure so it is never the
 * first picture. Each outcome opens, with no script, to the sealed calls
 * behind it: the majority they formed (or the record's reason for an
 * exclusion) and each call's decision, linked to that call's native log in the
 * claim's own bundle. Nothing here is a ranking: units keep the locked
 * method's order and arms keep the record's order.
 */

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const OUTCOME_CODES = { passed: "p", "not-passed": "n", excluded: "x" } as const;
const DECISION_CODES: Record<TaskCall["decision"], string> = {
  accept: "a",
  reject: "r",
  unreadable: "u",
  "not judged": "n",
};

/** The grid's compact record (see components/board-task-grid.tsx). */
function gridData(board: Board, tasks: ClaimTasks): TaskGridData {
  const labels: string[] = [];
  const reasons: string[] = [];
  const indexOf = (list: string[], value: string) => {
    const found = list.indexOf(value);
    if (found !== -1) return found;
    list.push(value);
    return list.length - 1;
  };
  const cell = (outcome: TaskArmOutcome) => {
    const majority = outcome.majority === "accept" ? "a" : outcome.majority === "reject" ? "r" : "-";
    const count = outcome.majority === "accept" ? outcome.accepted : outcome.majority === "reject" ? outcome.rejected : 0;
    const reason = outcome.reason === null ? "-" : String(indexOf(reasons, outcome.reason));
    const calls = outcome.calls.map((call) => `${DECISION_CODES[call.decision]}${call.logSha256 ?? ""}`).join(",");
    return `${OUTCOME_CODES[outcome.outcome]}.${majority}.${count}.${reason}|${calls}`;
  };
  const slug = tasks.claim.slug;
  const rows = tasks.rows.map((row) => {
    if (row.taskHref !== null && row.taskHref !== `/reports/${slug}/bundle/records/${row.taskSha256}.bin`) {
      throw new Error(`${slug}: unexpected task record address ${row.taskHref}`);
    }
    for (const outcome of row.arms) {
      for (const call of outcome.calls) {
        if (call.logHref !== null && call.logHref !== `/reports/${slug}/bundle/native/inspect/${call.logSha256}.eval`) {
          throw new Error(`${slug}: unexpected native log address ${call.logHref}`);
        }
      }
    }
    return [row.taskSha256, indexOf(labels, row.label), row.taskHref === null ? 0 : 1, ...row.arms.map(cell)];
  });
  return {
    unit: capitalise(board.words.coverageUnit.replace(/s$/u, "")),
    arms: tasks.claim.arms.map((arm) => arm.id),
    words: {
      passed: capitalise(board.words.passed),
      notPassed: capitalise(board.words.notPassed),
      excluded: capitalise(board.words.excluded),
    },
    replicates: tasks.replicates,
    recordBase: `/reports/${slug}/bundle/records/`,
    logBase: `/reports/${slug}/bundle/native/inspect/`,
    labels,
    reasons,
    rows,
  };
}

function ClaimTaskTables({ board, tasks }: { board: Board; tasks: ClaimTasks }) {
  const { claim, rows, tallies } = tasks;
  const words = board.words;
  const titleId = `tasks-${claim.slug}`;
  return (
    <section className="board-tasks-claim" aria-labelledby={titleId}>
      <h3 id={titleId} className="board-tasks-title">{claim.title}</h3>
      <p className="board-tasks-meta">
        <VenueChip venue={claim.venue} />
        <span>Sealed <time dateTime={claim.sealedAt}>{claim.sealedDate}</time></span>
        <a href={claim.href}>Open the claim</a>
      </p>
      <dl className="board-tasks-key">
        {claim.arms.map((arm) => (
          <div key={arm.id}>
            <dt><code>{arm.id}</code></dt>
            <dd>{arm.label}</dd>
          </div>
        ))}
      </dl>

      <div className="table-scroll">
        <table className="data-table board-tally">
          <caption className="claim-caption">Every planned {words.coverageUnit.replace(/s$/u, "")}, {words.arm.toLowerCase()} by {words.arm.toLowerCase()}</caption>
          <thead>
            <tr>
              <th scope="col">Outcome</th>
              {claim.arms.map((arm) => <th key={arm.id} scope="col" className="num"><code>{arm.id}</code></th>)}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">{capitalise(words.passed)}</th>
              {tallies.map((tally) => <td key={tally.armId} className="num mono">{tally.passed}</td>)}
            </tr>
            <tr>
              <th scope="row">{capitalise(words.notPassed)}</th>
              {tallies.map((tally) => <td key={tally.armId} className="num mono">{tally.notPassed}</td>)}
            </tr>
            <tr>
              <th scope="row">{capitalise(words.excluded)}</th>
              {tallies.map((tally) => <td key={tally.armId} className="num mono">{tally.excluded}</td>)}
            </tr>
            <tr className="claim-total">
              <th scope="row">All planned {words.coverageUnit}</th>
              {tallies.map((tally) => <td key={tally.armId} className="num mono">{tally.planned}</td>)}
            </tr>
            <tr>
              <th scope="row">Judge calls planned</th>
              {tallies.map((tally) => <td key={tally.armId} className="num mono">{tally.callsPlanned}</td>)}
            </tr>
            <tr>
              <th scope="row">Judge calls judged</th>
              {tallies.map((tally) => <td key={tally.armId} className="num mono">{tally.callsJudged}</td>)}
            </tr>
            <tr>
              <th scope="row">Judged, response unreadable</th>
              {tallies.map((tally) => <td key={tally.armId} className="num mono">{tally.callsUnreadable}</td>)}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="table-scroll board-tasks-scroll">
        <BoardTaskGrid
          data={gridData(board, tasks)}
          caption={`All ${rows.length} ${words.coverageUnit}, in the locked method's order`}
        />
      </div>
    </section>
  );
}

export function BoardTasks({ board }: { board: Board }) {
  const words = board.words;
  const all = board.claims.map((claim) => claimTasks(board, claim));
  const replicates = [...new Set(all.map((tasks) => tasks.replicates))];
  return (
    <details className="report-details board-disclosure" id="task-by-task">
      <summary>
        Task by task
        <span className="board-disclosure-side">
          Every planned {words.coverageUnit.replace(/s$/u, "")}, failures and exclusions included
        </span>
      </summary>
      <div className="report-details-body">
        <p className="board-reading">
          All {board.planned} {words.coverageUnit} the method fixes, for every {words.arm.toLowerCase()} on every
          claim, in the method&apos;s own order. Failures and exclusions are included, and no flag drops a row.
          Each item links to its sealed task record. Open an outcome for the sealed calls behind it: the
          majority they formed, or the record&apos;s reason for an exclusion, and each call&apos;s decision
          {replicates.length === 1 ? ` (${replicates[0]} per item)` : ""}, linked to that call&apos;s native log,
          a file in the claim&apos;s bundle named by its SHA-256.
        </p>
        <p className="board-reading">
          Every call ran on its claim&apos;s venue, shown with the claim. None of the files this page reads
          records a wall-clock time for a call, so none is shown here; each native log is the harness&apos;s
          own record of its call.
        </p>
        {all.map((tasks) => <ClaimTaskTables key={tasks.claim.slug} board={board} tasks={tasks} />)}
      </div>
    </details>
  );
}
