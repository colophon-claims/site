"use client";

/**
 * The task-by-task grid: one row per planned unit, one column per arm, each
 * outcome a disclosure that opens, with no script, to the sealed calls behind
 * it.
 *
 * It is a client component for one reason: page weight. The grid holds every
 * judge call of the claim (4,320 for the judge report), each linked to its
 * native log. Rendered as server markup, every link would travel twice, once
 * in the HTML and once in the page's hydration data. Here the hydration data
 * carries only the compact record below, the static HTML carries the full
 * markup built from it, and the rows are set as one block of markup so the
 * browser does no per-call work after load. The same function builds the
 * markup on the server and in the browser, so the two are identical.
 */

export interface TaskGridData {
  /** Heading text for the unit column. */
  unit: string;
  arms: string[];
  words: { passed: string; notPassed: string; excluded: string };
  replicates: number;
  /** Where a unit's sealed task record is: `${recordBase}${sha256}.bin`. */
  recordBase: string;
  /** Where a call's native log is: `${logBase}${sha256}.eval`. */
  logBase: string;
  labels: string[];
  reasons: string[];
  /**
   * One entry per unit, in the locked method's order:
   * [task SHA-256, label index, 1 if the bundle carries its task record, ...cells].
   * A cell is `${outcome}.${majority}.${count}.${reason}` then `|` then its
   * calls, comma-separated. outcome: p passed, n not passed, x excluded.
   * majority: a accept, r reject, - none. count: how many calls formed the
   * majority. reason: an index into `reasons`, or - for none. A call is its
   * decision (a accept, r reject, u unreadable, n not judged) followed by its
   * native log's SHA-256, or by nothing when it has none.
   */
  rows: (string | number)[][];
}

const OUTCOME_CLASS: Record<string, string> = { p: "passed", n: "not-passed", x: "excluded" };
const DECISIONS: Record<string, string> = { a: "Accept", r: "Reject", u: "Unreadable", n: "Not judged" };
const MAJORITY: Record<string, string> = { a: "accept", r: "reject" };

function escapeHtml(text: string): string {
  return text.replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;").replace(/"/gu, "&quot;");
}

function shortId(hex: string): string {
  return `${hex.slice(0, 8)}…${hex.slice(-4)}`;
}

function cellHtml(data: TaskGridData, cell: string): string {
  const [head = "", callList = ""] = cell.split("|");
  const [outcome = "", majority = "", count = "", reason = ""] = head.split(".");
  const word = outcome === "p" ? data.words.passed : outcome === "n" ? data.words.notPassed : data.words.excluded;
  const line = majority === "-"
    ? `Reason: ${data.reasons[Number(reason)] ?? "none recorded"}.`
    : `Majority ${MAJORITY[majority] ?? majority}, ${count} of ${data.replicates}.`;
  const calls = callList.split(",").map((call) => {
    const decision = escapeHtml(DECISIONS[call.charAt(0)] ?? call.charAt(0));
    const log = call.slice(1);
    return log === ""
      ? `<li>${decision}</li>`
      : `<li><a href="${escapeHtml(`${data.logBase}${log}.eval`)}">${decision}</a></li>`;
  }).join("");
  return `<td class="board-task board-task--${OUTCOME_CLASS[outcome] ?? "excluded"}"><details><summary>${escapeHtml(word)}</summary>`
    + `<p>${escapeHtml(line)}</p><ol class="board-calls">${calls}</ol></details></td>`;
}

export function taskRowsHtml(data: TaskGridData): string {
  return data.rows.map((row, index) => {
    const [task, label, hasRecord, ...cells] = row;
    const hex = String(task);
    const id = `<code>${shortId(hex)}</code>`;
    return `<tr><th scope="row" class="board-task-item"><span class="board-task-n">${index + 1}</span> `
      + (hasRecord === 1 ? `<a href="${escapeHtml(`${data.recordBase}${hex}.bin`)}">${id}</a>` : id)
      + `</th><td class="board-task-label">${escapeHtml(data.labels[Number(label)] ?? "")}</td>`
      + cells.map((cell) => cellHtml(data, String(cell))).join("")
      + "</tr>";
  }).join("");
}

export function BoardTaskGrid({ data, caption }: { data: TaskGridData; caption: string }) {
  return (
    <table className="data-table board-tasks-table">
      <caption className="claim-caption">{caption}</caption>
      <thead>
        <tr>
          <th scope="col">{data.unit}</th>
          <th scope="col">Label</th>
          {data.arms.map((arm) => <th key={arm} scope="col"><code>{arm}</code></th>)}
        </tr>
      </thead>
      <tbody dangerouslySetInnerHTML={{ __html: taskRowsHtml(data) }} />
    </table>
  );
}
