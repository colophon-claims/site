import type { Metadata } from "next";
import Link from "next/link";
import { ReportSummaryCard } from "@/components/report-summary-card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { listReports } from "@/lib/reports";

export const metadata: Metadata = {
  title: "Reports",
  description: "Published benchmark claims with their methods, limits, and evidence attached.",
};

function formatPublishedDate(value: string | null): string {
  if (value === null) return "Publication date unavailable";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(value));
}

export default function ReportsIndex() {
  const reports = listReports();

  return (
    <>
      <SiteHeader />
      <main className="reports-index-main">
        <section className="reports-index-hero">
          <div className="container">
            <h1>Reports</h1>
            <p>Published benchmark claims, with their methods, limits, and evidence attached.</p>
          </div>
        </section>
        <section className="reports-index-section">
          <div className="container">
            {reports.length === 0 ? (
              <p className="reports-empty">No reports have been published yet.</p>
            ) : (
              <div className="reports-list">
                {reports.map((report) => (
                  <article className="reports-entry" key={report.slug}>
                    <div className="reports-entry-meta">
                      <time dateTime={report.reportedAt ?? undefined}>
                        {formatPublishedDate(report.reportedAt)}
                      </time>
                      <span>Immutable report</span>
                    </div>
                    <Link
                      aria-label={`Read report: ${report.title}`}
                      className="reports-entry-link"
                      href={`/reports/${report.slug}/`}
                    >
                      <ReportSummaryCard report={report} label="Published report" />
                    </Link>
                  </article>
                ))}
              </div>
            )}
            <p className="reports-index-note">
              Colophon does not rank reports against each other. Each report answers one bounded
              question and keeps its own scope and limitations attached.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
