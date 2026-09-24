import { ClaimantKey, VenueChip } from "@/components/board-table";
import type { FindRow } from "@/lib/find";

/**
 * Every listed claim, one row per claim, in the order the caller hands them
 * (newest seal first, the slug the stable secondary key). This component has
 * no script of its own: it is exactly what a reader with script off gets, in
 * full. The find controls (components/find-controls.tsx) only ever hide or
 * show what is rendered here; they never reorder or rewrite a row.
 *
 * One shape for every record, whatever suite or method it ran: no shared
 * score axis, no bar, no sortable result column. A short finding in the
 * claim's own words may distinguish rows; it is words, not a score.
 *
 * The meta line's dot separators are each the CSS ::before of the item they
 * introduce (.find-row-meta-item in globals.css), not a separate span: a dot
 * can only wrap to a new line glued to its own item, never alone and never
 * split from the text it separates.
 */
export function FindList({ rows }: { rows: FindRow[] }) {
  return (
    <ul className="find-list">
      {rows.map((row) => (
        <li
          key={row.slug}
          className="find-row"
          data-find-row=""
          data-slug={row.slug}
          data-board={row.board.slug}
          data-search={row.searchText}
        >
          <h2 className="find-row-title">
            <a href={row.href}>{row.title}</a>
          </h2>
          <div className="find-row-meta">
            <ClaimantKey who={row.claimant} authorIsClaimant={row.authorIsClaimant} />
            <span className="find-row-meta-item">
              {row.suiteOrMethod}, {row.coverageText}
            </span>
            <span className="find-row-meta-item">
              <VenueChip venue={row.venue} />
            </span>
            <span className="find-row-meta-item">
              Sealed <time dateTime={row.sealedAt}>{row.sealedDate}</time>
            </span>
          </div>
          <p className="find-row-finding">{row.finding}</p>
          <p className="find-row-board">
            On the <a href={row.board.href}>{row.board.name}</a> board
          </p>
        </li>
      ))}
    </ul>
  );
}
