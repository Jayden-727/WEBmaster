import { AnalysisDetail } from "@/components/analysis/analysis-detail";

interface AnalysisDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AnalysisDetailPage({ params }: AnalysisDetailPageProps) {
  const { id } = await params;
  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-3 py-4 sm:px-6 sm:py-6">
      <AnalysisDetail analysisId={id} />
    </main>
  );
}
