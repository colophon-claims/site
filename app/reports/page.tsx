import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { VerdictChip } from "@/components/ds";
import { formatUtc, listReports } from "@/lib/reports";

export const metadata: Metadata = {
  title: "Published reports",
  description: "Benchmark reports published with their evidence bundles.",
};

export default function ReportsIndex() {
  const reports = listReports();
  return (
    <>
      <SiteHeader />
      <main className="container" style={{ paddingTop: "var(--space-11)", paddingBottom: "var(--space-13)" }}>
        <div
          style={{
            borderTop: "var(--border-heavy) solid var(--rule-heavy)",
            paddingTop: "var(--space-6)",
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: "var(--space-8)",
          }}
        >
          <h1 style={{ font: "var(--type-title)", fontSize: "var(--text-2xl)", margin: 0 }}>
            Published reports
          </h1>
        </div>
        <div
          style={{
            border: "var(--border-hair) solid var(--rule)",
            background: "var(--surface-card)",
            marginTop: "var(--space-8)",
          }}
        >
          {reports.map((r, i) => (
            <Link
              key={r.slug}
              href={`/reports/${r.slug}/`}
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "var(--space-4) var(--space-7)",
                alignItems: "baseline",
                padding: "var(--space-6) var(--space-8)",
                borderTop: i > 0 ? "var(--border-hair) solid var(--rule)" : "none",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <span style={{ font: "var(--type-body)", fontSize: "var(--text-md)", flex: "1 1 24rem", minWidth: 0 }}>
                {r.title}
              </span>
              <span style={{ font: "var(--type-data)", fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>
                {r.completeness.judged} of {r.completeness.expected} expected executions judged
              </span>
              <span style={{ font: "var(--type-data)", fontSize: "var(--text-xs)", color: "var(--text-faint)" }}>
                {formatUtc(r.reportedAt)}
              </span>
              {r.fixture && (
                <VerdictChip size="sm" verdict="conflicted" texture="missing">
                  Fixture
                </VerdictChip>
              )}
            </Link>
          ))}
          {reports.length === 0 && (
            <p style={{ font: "var(--type-body)", color: "var(--text-secondary)", padding: "var(--space-8)", margin: 0 }}>
              No report is published yet. A published report appears here with its evidence bundle
              once it is ingested.
            </p>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
