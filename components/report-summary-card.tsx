import { VerdictChip } from "./ds";
import { Mark } from "./mark";
import { formatUtc, shortDigest, type ReportData } from "@/lib/reports";

/**
 * The landing page's report card (surface copy §3). Every field is rendered
 * from the published bundle's read model, not written by hand. Visual base:
 * the vendored ReportCard (vendor/design-system/reference/components/claim/
 * ReportCard.jsx) — same slab-top article, eyebrow, serif title, mono data
 * lines — with the copy's five fields in place of the entrant bars.
 */
export function ReportSummaryCard({ report }: { report: ReportData }) {
  return (
    <article
      style={{
        background: "var(--surface-card)",
        border: "var(--border-hair) solid var(--rule-strong)",
        borderTop: "var(--border-slab) solid var(--rule-accent)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: "var(--space-8) var(--space-8) var(--space-6)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-4)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-4)",
            font: "var(--type-label)",
            letterSpacing: "var(--tracking-caps)",
            textTransform: "uppercase",
            color: "var(--text-muted)",
          }}
        >
          <Mark size={12} /> Colophon report
        </div>
        <h3
          style={{
            font: "var(--type-title)",
            fontSize: "var(--text-lg)",
            margin: 0,
            letterSpacing: "var(--tracking-tight)",
          }}
        >
          {report.title}
        </h3>
        <div style={{ font: "var(--type-data)", fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>
          {report.taskSet} · {report.taskCount} tasks · {report.replicates} replicates per cell
        </div>
      </div>
      <div
        style={{
          padding: "0 var(--space-8) var(--space-7)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-4)",
          font: "var(--type-data)",
          fontSize: "var(--text-xs)",
          color: "var(--text-secondary)",
        }}
      >
        <span style={{ wordBreak: "break-all" }}>
          Method locked {formatUtc(report.lockedAt)} · {shortDigest(report.digests.reportSha256)}
        </span>
        <span>
          {report.completeness.judged} of {report.completeness.expected} expected executions judged
        </span>
      </div>
      <div
        style={{
          marginTop: "auto",
          padding: "var(--space-6) var(--space-8)",
          borderTop: "var(--border-hair) solid var(--rule)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--space-6)",
        }}
      >
        <VerdictChip size="sm" verdict="attested">
          Self-run venue
        </VerdictChip>
        {report.fixture && (
          <VerdictChip size="sm" verdict="conflicted" texture="missing">
            Fixture
          </VerdictChip>
        )}
      </div>
    </article>
  );
}
