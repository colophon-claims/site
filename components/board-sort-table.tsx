"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * The board's table, with the reader's re-sort.
 *
 * The server hands every row over already rendered and already in the
 * default order: date sealed, newest first, and inside one sealed claim the
 * record's own arm order. That order is what the static HTML shows, so the
 * page reads correctly with no script. This component only adds the re-sort:
 * a header button per column that holds a value, aria-sort on the sorted
 * column, and rows reordered inside each claim group as well as the groups
 * themselves. The buttons appear only once the script has run: the static
 * HTML, and the page before it has loaded, carry plain header text, so no
 * control is offered that cannot yet work. aria-sort is true either way. The chosen sort lives in this component's memory only. It is
 * not stored, not sent anywhere, not carried to another page, and it never
 * marks a top row.
 */

export type SortDirection = "ascending" | "descending";

export interface BoardColumn {
  key: string;
  label: string;
  /** Sort by number rather than by text. */
  numeric: boolean;
  sortable: boolean;
  className?: string;
  /** Ticks written under the heading, for the shared axis the bars sit on. */
  axis?: { ticks: number[]; max: number };
}

export interface BoardRowData {
  /** The arm's ID in the sealed record. */
  id: string;
  sealed: string;
  values: Record<string, string | number>;
  content: ReactNode;
}

export interface BoardGroupData {
  /** The claim's slug. */
  id: string;
  header: ReactNode;
  rows: BoardRowData[];
}

interface Sort {
  key: string;
  direction: SortDirection;
}

const DEFAULT_SORT: Sort = { key: "sealed", direction: "descending" };

function compareValues(left: string | number | undefined, right: string | number | undefined, numeric: boolean): number {
  if (numeric) return Number(left ?? 0) - Number(right ?? 0);
  return String(left ?? "").localeCompare(String(right ?? ""), "en", { sensitivity: "base", numeric: true });
}

/**
 * Rows sort inside their group; groups then sort by their first row. Ties keep
 * the default order, so a re-sort never shuffles rows it cannot tell apart.
 */
function sortGroups(groups: BoardGroupData[], sort: Sort, column: BoardColumn | undefined): BoardGroupData[] {
  const sign = sort.direction === "ascending" ? 1 : -1;
  const numeric = column?.numeric ?? false;
  const sorted = groups.map((group, groupIndex) => ({
    groupIndex,
    group: {
      ...group,
      rows: group.rows
        .map((row, rowIndex) => ({ row, rowIndex }))
        .sort((left, right) =>
          sign * compareValues(left.row.values[sort.key], right.row.values[sort.key], numeric)
          || left.rowIndex - right.rowIndex)
        .map(({ row }) => row),
    },
  }));
  return sorted
    .sort((left, right) =>
      sign * compareValues(left.group.rows[0]?.values[sort.key], right.group.rows[0]?.values[sort.key], numeric)
      || left.groupIndex - right.groupIndex)
    .map(({ group }) => group);
}

function SortMark({ state }: { state: SortDirection | "none" }) {
  return (
    <svg className={`board-sort-mark board-sort-mark--${state}`} width="8" height="12" viewBox="0 0 8 12" aria-hidden="true" focusable="false">
      <path className="board-sort-up" d="M4 1 7.5 5h-7z" />
      <path className="board-sort-down" d="M4 11 .5 7h7z" />
    </svg>
  );
}

export function BoardSortTable({
  caption,
  columns,
  groups,
  defaultOrder,
}: {
  caption: string;
  columns: BoardColumn[];
  groups: BoardGroupData[];
  /** How the default order reads, for the status line after a re-sort back to it. */
  defaultOrder: string;
}) {
  // null is the default order, exactly as the server rendered it.
  const [sort, setSort] = useState<Sort | null>(null);
  const [status, setStatus] = useState("");
  // False on the server and in the first client render, so the two match;
  // true once the script is running and a button can do what it says.
  const [enhanced, setEnhanced] = useState(false);
  useEffect(() => setEnhanced(true), []);
  const active = sort ?? DEFAULT_SORT;
  const ordered = sort === null
    ? groups
    : sortGroups(groups, sort, columns.find((column) => column.key === sort.key));

  function choose(column: BoardColumn) {
    const next: Sort = active.key === column.key
      ? { key: column.key, direction: active.direction === "ascending" ? "descending" : "ascending" }
      : { key: column.key, direction: "ascending" };
    if (next.key === DEFAULT_SORT.key && next.direction === DEFAULT_SORT.direction) {
      setSort(null);
      setStatus(`Rows in the default order: ${defaultOrder}.`);
      return;
    }
    setSort(next);
    setStatus(`Sorted by the ${column.label} column, ${next.direction}.`);
  }

  return (
    <>
      <table className="board-table">
        <caption className="claim-hidden-heading">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => {
              const state: SortDirection | "none" = active.key === column.key ? active.direction : "none";
              return (
                <th
                  key={column.key}
                  scope="col"
                  className={column.className}
                  aria-sort={column.sortable ? state : undefined}
                >
                  {column.sortable && enhanced ? (
                    <button
                      type="button"
                      className="board-sort"
                      onClick={() => choose(column)}
                      // On a narrow screen the table scrolls sideways under a
                      // pinned first column; bring the focused heading fully
                      // into the frame's clear part (its scroll-padding).
                      onFocus={(event) => event.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest" })}
                    >
                      <span>{column.label}</span>
                      <SortMark state={state} />
                    </button>
                  ) : column.sortable ? (
                    <span className="board-sort-label">{column.label}</span>
                  ) : (
                    <span className="claim-hidden-heading">{column.label}</span>
                  )}
                  {column.axis !== undefined && (
                    <span className="board-axis" aria-hidden="true">
                      {column.axis.ticks.map((tick) => (
                        <span key={tick} style={{ left: `${(tick / column.axis!.max) * 100}%` }}>{tick}</span>
                      ))}
                    </span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        {ordered.map((group) => (
          <tbody key={group.id} data-claim={group.id}>
            <tr className="board-group-row">{group.header}</tr>
            {group.rows.map((row) => (
              <tr key={row.id} className="board-arm-row" data-sealed={row.sealed} data-arm={row.id}>
                {row.content}
              </tr>
            ))}
          </tbody>
        ))}
      </table>
      <p className="claim-hidden-heading" role="status" aria-live="polite">{status}</p>
    </>
  );
}
