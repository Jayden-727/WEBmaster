import Link from "next/link";
import { AnalyzeForm } from "@/components/dashboard/analyze-form";
import { DeepAnalyzerForm } from "@/components/dashboard/deep-analyzer-form";
import { RecentAnalysesList } from "@/components/dashboard/recent-analyses";
import { QuickActionsSection } from "@/components/dashboard/quick-actions";
import {
  Globe,
  ArrowLeft,
  Sparkles,
  Clock,
  FileText,
  Database,
  Code2,
  Grid3X3,
  Link2,
  ImageIcon,
  Gauge,
  LayoutDashboard,
  Layers,
} from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="min-h-screen">
      <DashboardNav />
      <main className="mx-auto w-full max-w-6xl px-4 pb-12 pt-6 sm:px-6 sm:pt-8">
        <div className="space-y-6 sm:space-y-8">
          <HeroAnalyzeCard />
          <DeepAnalyzerCard />
          <QuickActionsSection />
          <div className="grid gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <RecentSection />
            </div>
            <div className="lg:col-span-2">
              <CapabilitiesSection />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ─── Dashboard Nav ─── */

function DashboardNav() {
  return (
    <nav className="sticky top-0 z-40 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500">
              <Globe className="h-4 w-4 text-white" />
            </div>
            <span className="text-base font-bold tracking-tight sm:text-lg">AttractiveWebAI</span>
          </Link>
          <span className="hidden text-slate-700 sm:inline">/</span>
          <span className="hidden text-sm text-slate-400 sm:inline">Dashboard</span>
        </div>

        <Link
          href="/"
          className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 text-xs text-slate-400 transition hover:border-slate-700 hover:text-white active:bg-slate-800 sm:text-sm"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Back to Home</span>
          <span className="sm:hidden">Home</span>
        </Link>
      </div>
    </nav>
  );
}

/* ─── Hero Analyze Card ─── */

function HeroAnalyzeCard() {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-20 -top-20 h-[300px] w-[300px] rounded-full bg-indigo-500/8 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 h-[200px] w-[300px] rounded-full bg-purple-500/5 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="relative px-4 py-6 sm:px-8 sm:py-10">
        <div className="mb-5 sm:mb-6">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-[11px] font-medium text-indigo-300 sm:text-xs">
            <Sparkles className="h-3 w-3" />
            Website Intelligence
          </div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl md:text-3xl">
            Analyze any website
          </h1>
          <p className="mt-1.5 max-w-xl text-xs leading-relaxed text-slate-400 sm:mt-2 sm:text-sm">
            Enter any public URL to inspect metadata, structure, technology stack,
            content, links, images, and Lighthouse performance — all in one place.
          </p>
        </div>
        <AnalyzeForm />
      </div>
    </section>
  );
}

/* ─── DeepAnalyzer Card ─── */

function DeepAnalyzerCard() {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-purple-800/30 bg-gradient-to-br from-slate-900 via-slate-900 to-purple-950/30">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-20 -top-20 h-[250px] w-[250px] rounded-full bg-purple-500/8 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 h-[180px] w-[280px] rounded-full bg-indigo-500/5 blur-3xl" />
      </div>

      <div className="relative px-4 py-6 sm:px-8 sm:py-8">
        <div className="mb-4 sm:mb-5">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-[11px] font-medium text-purple-300 sm:text-xs">
            <Layers className="h-3 w-3" />
            Multi-Page Crawl & IA Analysis
          </div>
          <h2 className="text-lg font-bold tracking-tight sm:text-xl md:text-2xl">
            DeepAnalyzer
          </h2>
          <p className="mt-1.5 max-w-xl text-xs leading-relaxed text-slate-400 sm:text-sm">
            Crawl entire sites to build a page inventory, visualize site structure, and generate refined Markdown reports on demand.
          </p>
        </div>
        <DeepAnalyzerForm />
      </div>
    </section>
  );
}

/* ─── Recent Analyses Section ─── */

function RecentSection() {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-white sm:text-base">Recent Analyses</h2>
        </div>
        <Link
          href="/history"
          className="text-[11px] text-indigo-400 transition hover:text-indigo-300 sm:text-xs"
        >
          View all →
        </Link>
      </div>
      <RecentAnalysesList />
    </section>
  );
}

/* ─── Capabilities Section ─── */

function CapabilitiesSection() {
  const modules = [
    { icon: LayoutDashboard, label: "Overview", color: "text-indigo-400" },
    { icon: FileText, label: "Metadata", color: "text-blue-400" },
    { icon: Database, label: "Content", color: "text-cyan-400" },
    { icon: Code2, label: "Stack", color: "text-purple-400" },
    { icon: Grid3X3, label: "Structure", color: "text-pink-400" },
    { icon: Link2, label: "Links", color: "text-amber-400" },
    { icon: ImageIcon, label: "Images", color: "text-emerald-400" },
    { icon: Gauge, label: "Lighthouse", color: "text-orange-400" },
  ];

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-slate-500" />
        <h2 className="text-sm font-semibold text-white sm:text-base">Analysis Modules</h2>
      </div>
      <p className="mb-4 text-[11px] leading-relaxed text-slate-500 sm:text-xs">
        Every analysis runs all eight modules simultaneously, delivering a comprehensive intelligence report.
      </p>
      <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
        {modules.map(({ icon: Icon, label, color }) => (
          <div
            key={label}
            className="flex items-center gap-2 rounded-lg border border-slate-800/60 bg-slate-950/40 px-2.5 py-2 transition hover:border-slate-700 sm:gap-2.5 sm:px-3 sm:py-2.5"
          >
            <Icon className={`h-3.5 w-3.5 shrink-0 ${color} sm:h-4 sm:w-4`} />
            <span className="text-[11px] font-medium text-slate-300 sm:text-xs">{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
