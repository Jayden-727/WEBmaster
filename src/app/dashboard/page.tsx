import { AnalyzeForm } from "@/components/dashboard/analyze-form";
import { RecentAnalysesList } from "@/components/dashboard/recent-analyses";
import { Card } from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Dashboard</h1>
        <p className="text-sm text-slate-400">Submit a URL and inspect the full analysis output.</p>
      </header>
      <Card>
        <AnalyzeForm />
      </Card>
      <Card>
        <h2 className="mb-3 text-lg font-medium">Recent analyses</h2>
        <RecentAnalysesList />
      </Card>
    </section>
  );
}
