import { AnalysisDetail } from "@/components/analysis/analysis-detail";

interface AnalysisDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AnalysisDetailPage({ params }: AnalysisDetailPageProps) {
  const { id } = await params;
  return <AnalysisDetail analysisId={id} />;
}
