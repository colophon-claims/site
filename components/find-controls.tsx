"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { FindBoardOption } from "@/lib/find";

/**
 * The search box and the board filter for /find/. The full list (`children`,
 * components/find-list.tsx) is rendered by the server, already in date
 * order; this component only ever hides or shows rows already there and
 * updates the live count, the way the board's sort table only ever reorders
 * rows it did not itself render (components/board-sort-table.tsx). Search
 * and filter are this page's own script over data already in the page: no
 * request, nothing stored, nothing sent anywhere.
 *
 * The controls themselves do not appear until the script has actually run:
 * the static HTML this page is judged on (script off, or before hydration)
 * carries the full list and the live count and no control that cannot yet
 * do anything, the same rule the sort table's buttons follow.
 */

const ALL_BOARDS = "all";

export function FindControls({
  totalCount,
  boards,
  children,
}: {
  totalCount: number;
  boards: FindBoardOption[];
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [board, setBoard] = useState(ALL_BOARDS);
  // The server-rendered count, until the script recomputes it. With no
  // filter applied that is also every claim listed, so the static HTML and
  // the first client render agree.
  const [visible, setVisible] = useState(totalCount);
  const listRef = useRef<HTMLDivElement>(null);
  const queryRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const container = listRef.current;
    if (container === null) return;
    const term = query.trim().toLowerCase();
    const rows = container.querySelectorAll<HTMLElement>("[data-find-row]");
    let shown = 0;
    for (const row of rows) {
      const matchesQuery = term === "" || (row.dataset.search ?? "").includes(term);
      const matchesBoard = board === ALL_BOARDS || row.dataset.board === board;
      const show = matchesQuery && matchesBoard;
      row.hidden = !show;
      if (show) shown += 1;
    }
    setVisible(shown);
  }, [query, board]);

  function clear() {
    setQuery("");
    setBoard(ALL_BOARDS);
    queryRef.current?.focus();
  }

  return (
    <div className="find-body">
      {mounted && (
        <div className="find-controls" role="search" aria-label="Find a claim">
          <div className="find-field find-field-grow">
            <label htmlFor="find-query">Title, claimant or benchmark</label>
            <input
              id="find-query"
              ref={queryRef}
              type="search"
              autoComplete="off"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="find-field">
            <label htmlFor="find-board">Board</label>
            <select id="find-board" value={board} onChange={(event) => setBoard(event.target.value)}>
              <option value={ALL_BOARDS}>All</option>
              {boards.map((option) => (
                <option key={option.slug} value={option.slug}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <p className="find-count" role="status" aria-live="polite">
        {visible} {visible === 1 ? "claim" : "claims"} listed.
      </p>

      <div ref={listRef}>{children}</div>

      {mounted && visible === 0 && (
        <div className="find-empty">
          <p className="find-empty-title">No claim matches</p>
          <p>Nothing in this listing matches that search and that board.</p>
          <button type="button" className="find-clear" onClick={clear}>
            Clear the search
          </button>
        </div>
      )}
    </div>
  );
}
