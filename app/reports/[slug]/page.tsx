import type { Metadata } from "next";
import { EvidenceReportPage } from "@/components/evidence-report-page";
import { GroupedReportPage } from "@/components/grouped-report-page";
import { QualifiedReportPage } from "@/components/qualified-report-page";
import {
  getReport,
  isEvidenceReport,
  isGroupedReport,
  isQualifiedReport,
  listReports,
  type ReportData,
} from "@/lib/reports";

export const dynamicParams = false;

export function generateStaticParams() {
  return listReports().map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const report = getReport(slug);
  return {
    title: report.title,
    description: report.summary ?? undefined,
    ...(report.socialCardPath === null
      ? {}
      : { openGraph: { images: [`/reports/${slug}/bundle/${report.socialCardPath}`] } }),
  };
}

export default async function ReportPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const report = getReport(slug);
  if (isGroupedReport(report)) return <GroupedReportPage report={report} />;
  if (isQualifiedReport(report)) return <QualifiedReportPage report={report} />;
  if (isEvidenceReport(report)) return <EvidenceReportPage report={report} />;
  // Static export: an unsupported format fails `npm run build`, never a
  // visitor's browser. No public route can render a format this dispatch
  // does not recognize.
  throw new Error(`Unsupported report format: ${(report as ReportData).format}`);
}
