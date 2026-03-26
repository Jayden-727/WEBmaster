"use client";

import { useState, useEffect, useCallback, useMemo, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Globe,
  List,
  Network,
  FileCode,
  FileText,
  ExternalLink,
  Copy,
  ChevronDown,
  ChevronRight,
  Search,
  Check,
  AlertTriangle,
  Download,
  Layers,
  Cpu,
} from "lucide-react";
import type {
  DeepAnalysisJob,
  CrawledPage,
  RefinedPage,
} from "@/types/deep-analysis";
import { useT } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";

type Tab = "inventory" | "structure" | "techProfile" | "raw" | "refinement" | "export";
type TargetScope = "all" | "single";

const PAGE_TYPE_COLORS: Record<string, string> = {
  homepage: "bg-indigo-500/15 text-indigo-300",
  category: "bg-blue-500/15 text-blue-300",
  product: "bg-emerald-500/15 text-emerald-300",
  article: "bg-amber-500/15 text-amber-300",
  policy: "bg-slate-500/15 text-slate-300",
  contact: "bg-pink-500/15 text-pink-300",
  search: "bg-cyan-500/15 text-cyan-300",
  login: "bg-violet-500/15 text-violet-300",
  other: "bg-slate-500/15 text-slate-400",
};

export default function DeepAnalysisPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = use(params);
  const t = useT();
  const [job, setJob] = useState<DeepAnalysisJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("inventory");
  const [refinedPages, setRefinedPages] = useState<RefinedPage[]>([]);
  const [refining, setRefining] = useState(false);
  const [targetScope, setTargetScope] = useState<TargetScope>("all");
  const [selectedPageUrl, setSelectedPageUrl] = useState<string | null>(null);
  const [batchRunning, setBatchRunning] = useState(false);

  const fetchJob = useCallback(async () => {
    try {
      const res = await fetch(`/api/deep-analyzer/jobs/${jobId}`);
      if (!res.ok) return null;
      const data = await res.json();
      const jobData: DeepAnalysisJob = {
        jobId: data.jobId,
        rootUrl: data.rootUrl,
        domain: data.domain,
        mode: data.mode ?? "all",
        maxPages: data.maxPages,
        maxDepth: data.maxDepth,
        status: data.status,
        pages: data.pages ?? [],
        totalDiscovered: data.totalDiscovered,
        totalProcessed: data.totalProcessed ?? 0,
        totalFailed: data.totalFailed ?? 0,
        startedAt: data.startedAt,
        completedAt: data.completedAt,
      };
      setJob(jobData);
      setLoading(false);
      return jobData;
    } catch {
      setLoading(false);
      return null;
    }
  }, [jobId]);

  const triggerBatch = useCallback(async () => {
    if (batchRunning) return;
    setBatchRunning(true);
    try {
      const res = await fetch(`/api/deep-analyzer/jobs/${jobId}/run-batch`, {
        method: "POST",
      });
      if (res.ok) {
        await fetchJob();
      }
    } catch {}
    setBatchRunning(false);
  }, [jobId, batchRunning, fetchJob]);

  useEffect(() => {
    fetchJob();
  }, [fetchJob]);

  useEffect(() => {
    if (!job) return;

    const isActive = job.status === "running" || job.status === "paused" || job.status === "pending";
    if (!isActive) return;

    triggerBatch();

    const interval = setInterval(async () => {
      const updated = await fetchJob();
      if (updated) {
        const stillActive = updated.status === "running" || updated.status === "paused" || updated.status === "pending";
        if (stillActive) {
          triggerBatch();
        }
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [job?.status, fetchJob, triggerBatch]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
          <p className="text-sm text-slate-400">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <AlertTriangle className="h-8 w-8 text-slate-500" />
        <p className="text-sm text-slate-400">{t("deepResults.notFound")}</p>
        <Link
          href="/dashboard"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          {t("deepResults.backToDashboard")}
        </Link>
      </div>
    );
  }

  const isJobActive = job.status === "running" || job.status === "paused" || job.status === "pending";

  const tabs: { id: Tab; label: string; icon: typeof List }[] = [
    { id: "inventory", label: t("deepResults.inventory"), icon: List },
    { id: "structure", label: t("deepResults.siteStructure"), icon: Network },
    { id: "techProfile", label: t("techProfile.title"), icon: Cpu },
    { id: "raw", label: t("deepResults.rawData"), icon: FileCode },
    { id: "refinement", label: t("deepResults.refinement"), icon: FileText },
    { id: "export", label: t("export.title"), icon: Download },
  ];

  const successPages = job.pages.filter((p) => p.status === "success");
  const errorPages = job.pages.filter((p) => p.status === "error");
  const typeStats = job.pages.reduce(
    (acc, p) => {
      const tp = p.pageTypeGuess ?? "other";
      acc[tp] = (acc[tp] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const selectedPage = selectedPageUrl
    ? job.pages.find((p) => p.url === selectedPageUrl) ?? null
    : null;

  const targetPages =
    targetScope === "all"
      ? job.pages
      : selectedPage
        ? [selectedPage]
        : [];

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="sticky top-0 z-40 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500">
                <Globe className="h-4 w-4 text-white" />
              </div>
              <span className="text-base font-bold tracking-tight sm:text-lg">{t("nav.brand")}</span>
            </Link>
            <span className="hidden text-slate-700 sm:inline">/</span>
            <span className="hidden text-sm text-slate-400 sm:inline">DeepAnalyzer</span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 text-xs text-slate-400 transition hover:border-slate-700 hover:text-white sm:text-sm"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("common.dashboard")}</span>
              <span className="sm:hidden">{t("common.back")}</span>
            </Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto w-full max-w-7xl px-4 pb-12 pt-6 sm:px-6 sm:pt-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-purple-300">
              DeepAnalyzer
            </span>
            {job.mode === "max" && (
              <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase text-amber-300">
                MAX
              </span>
            )}
            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${
              job.status === "completed" ? "bg-green-500/15 text-green-300"
                : job.status === "failed" ? "bg-red-500/15 text-red-300"
                : "bg-blue-500/15 text-blue-300"
            }`}>
              {job.status}
            </span>
          </div>
          <h1 className="break-all text-lg font-bold tracking-tight sm:text-xl md:text-2xl">
            {job.rootUrl}
          </h1>
          <p className="mt-1 text-xs text-slate-500">{job.domain}</p>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-3">
            <SummaryCard label={t("deepResults.pagesCrawled")} value={job.pages.length} />
            <SummaryCard label={t("deepResults.successful")} value={successPages.length} color="text-green-400" />
            <SummaryCard label={t("common.errors")} value={errorPages.length} color="text-red-400" />
            <SummaryCard
              label={t("deepResults.maxDepthReached")}
              value={Math.max(0, ...job.pages.map((p) => p.depth))}
            />
            <SummaryCard label={t("deepResults.mode")} value={job.mode === "max" ? "MAX" : t("deepResults.modeAll")} />
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {Object.entries(typeStats).map(([type, count]) => (
              <span
                key={type}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${PAGE_TYPE_COLORS[type] ?? PAGE_TYPE_COLORS.other}`}
              >
                {count} {type}
              </span>
            ))}
          </div>
        </div>

        {/* Live progress banner */}
        {isJobActive && (
          <div className="mb-4 rounded-lg border border-purple-800/30 bg-purple-950/20 p-3 sm:p-4">
            <div className="flex items-center gap-3">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
              <span className="text-sm text-slate-300">
                {t("deepAnalyzer.crawling")}
              </span>
              {job.mode === "max" && (
                <span className="shrink-0 rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-300">MAX</span>
              )}
              {batchRunning && (
                <span className="shrink-0 rounded bg-blue-500/20 px-1.5 py-0.5 text-[9px] font-medium text-blue-300">
                  {t("deepAnalyzer.processingBatch")}
                </span>
              )}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-md bg-slate-800/40 px-2.5 py-2 text-center">
                <p className="text-base font-bold text-purple-300">{job.totalProcessed}</p>
                <p className="text-[10px] text-slate-500">{t("deepAnalyzer.crawled")}</p>
              </div>
              <div className="rounded-md bg-slate-800/40 px-2.5 py-2 text-center">
                <p className="text-base font-bold text-slate-300">{job.totalDiscovered}</p>
                <p className="text-[10px] text-slate-500">{t("deepAnalyzer.discovered")}</p>
              </div>
              <div className="rounded-md bg-slate-800/40 px-2.5 py-2 text-center">
                <p className="text-base font-bold text-red-300">{job.totalFailed}</p>
                <p className="text-[10px] text-slate-500">{t("common.errors")}</p>
              </div>
            </div>
            {job.totalProcessed > 0 && job.totalDiscovered > 0 && (
              <div className="mt-2">
                <div className="h-1.5 rounded-full bg-slate-800">
                  <div
                    className="h-1.5 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all"
                    style={{ width: `${Math.min((job.totalProcessed / job.totalDiscovered) * 100, 99)}%` }}
                  />
                </div>
                <p className="mt-1 text-right text-[10px] text-slate-500">
                  {t("deepAnalyzer.maxProgress", { crawled: job.totalProcessed, discovered: job.totalDiscovered })}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Target scope selector */}
        <TargetScopeSelector
          scope={targetScope}
          setScope={setTargetScope}
          selectedPageUrl={selectedPageUrl}
          setSelectedPageUrl={setSelectedPageUrl}
          pages={job.pages}
        />

        {/* Tabs */}
        <div className="mb-6 flex gap-1 overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/50 p-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition sm:px-4 sm:text-sm ${
                tab === id
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-300"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {tab === "inventory" && (
          <InventoryTab
            pages={targetPages}
            onSelectPage={(url) => {
              setSelectedPageUrl(url);
              setTargetScope("single");
            }}
          />
        )}
        {tab === "structure" && <StructureTab pages={job.pages} rootUrl={job.rootUrl} />}
        {tab === "techProfile" && <TechProfileTab pages={job.pages} scope={targetScope} selectedPageUrl={selectedPageUrl} />}
        {tab === "raw" && <RawDataTab pages={targetPages} />}
        {tab === "refinement" && (
          <RefinementTab
            pages={targetPages}
            allPages={job.pages}
            scope={targetScope}
            refinedPages={refinedPages}
            setRefinedPages={setRefinedPages}
            refining={refining}
            setRefining={setRefining}
          />
        )}
        {tab === "export" && (
          <ExportTab
            pages={targetPages}
            allPages={job.pages}
            rootUrl={job.rootUrl}
            scope={targetScope}
            selectedPageUrl={selectedPageUrl}
            refinedPages={refinedPages}
          />
        )}
      </main>
    </div>
  );
}

/* ─── Target Scope Selector ─── */

function TargetScopeSelector({
  scope,
  setScope,
  selectedPageUrl,
  setSelectedPageUrl,
  pages,
}: {
  scope: TargetScope;
  setScope: (s: TargetScope) => void;
  selectedPageUrl: string | null;
  setSelectedPageUrl: (u: string | null) => void;
  pages: CrawledPage[];
}) {
  const t = useT();
  const successPages = pages.filter((p) => p.status === "success");

  return (
    <div className="mb-4 rounded-lg border border-slate-800 bg-slate-900/50 p-3 sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-slate-500" />
          <span className="text-xs font-semibold text-slate-400 sm:text-sm">{t("targetScope.label")}:</span>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => setScope("all")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition sm:text-sm ${
              scope === "all"
                ? "bg-purple-500/15 text-purple-300 ring-1 ring-purple-500/30"
                : "bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-300"
            }`}
          >
            <List className="h-3.5 w-3.5" />
            {t("export.allPagesCount", { count: successPages.length })}
          </button>
          <button
            onClick={() => setScope("single")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition sm:text-sm ${
              scope === "single"
                ? "bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/30"
                : "bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-300"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            {t("targetScope.single")}
          </button>
        </div>
        {scope === "single" && (
          <select
            value={selectedPageUrl ?? ""}
            onChange={(e) => setSelectedPageUrl(e.target.value || null)}
            className="min-w-0 flex-1 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none sm:text-sm"
          >
            <option value="">{t("targetScope.selectPage")}</option>
            {pages.map((p) => {
              let pathname = "/";
              try { pathname = new URL(p.url).pathname || "/"; } catch {}
              return (
                <option key={p.url} value={p.url}>
                  {pathname} {p.title ? `— ${p.title}` : ""}
                </option>
              );
            })}
          </select>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  color = "text-white",
}: {
  label: string;
  value: number | string;
  color?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
      <p className={`text-lg font-bold ${color} sm:text-xl`}>{value}</p>
      <p className="text-[10px] text-slate-500 sm:text-[11px]">{label}</p>
    </div>
  );
}

/* ─── Inventory Tab ─── */

function InventoryTab({
  pages,
  onSelectPage,
}: {
  pages: CrawledPage[];
  onSelectPage: (url: string) => void;
}) {
  const t = useT();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    return pages.filter((p) => {
      if (typeFilter !== "all" && p.pageTypeGuess !== typeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          p.url.toLowerCase().includes(q) ||
          (p.title ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [pages, search, typeFilter]);

  const types = useMemo(() => {
    const set = new Set(pages.map((p) => p.pageTypeGuess ?? "other"));
    return ["all", ...Array.from(set).sort()];
  }, [pages]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("deepResults.filterPlaceholder")}
            className="w-full rounded-lg border border-slate-800 bg-slate-950 py-2 pl-9 pr-3 text-xs text-white placeholder:text-slate-500 focus:border-slate-700 focus:outline-none sm:text-sm"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none sm:text-sm"
        >
          {types.map((tp) => (
            <option key={tp} value={tp}>
              {tp === "all" ? t("common.allTypes") : tp}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/50">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="border-b border-slate-800 bg-slate-900">
            <tr>
              <th className="px-3 py-2.5 font-medium text-slate-400 sm:px-4">#</th>
              <th className="px-3 py-2.5 font-medium text-slate-400 sm:px-4">{t("common.url")}</th>
              <th className="hidden px-3 py-2.5 font-medium text-slate-400 sm:table-cell sm:px-4">{t("common.title")}</th>
              <th className="px-3 py-2.5 font-medium text-slate-400 sm:px-4">{t("common.type")}</th>
              <th className="px-3 py-2.5 font-medium text-slate-400 sm:px-4">{t("common.depth")}</th>
              <th className="px-3 py-2.5 font-medium text-slate-400 sm:px-4">{t("common.status")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filtered.map((p, i) => (
              <tr
                key={p.url}
                onClick={() => onSelectPage(p.url)}
                className="cursor-pointer transition hover:bg-slate-800/30"
              >
                <td className="px-3 py-2.5 text-slate-500 sm:px-4">{i + 1}</td>
                <td className="max-w-[200px] truncate px-3 py-2.5 sm:max-w-[350px] sm:px-4">
                  <span className="text-indigo-400">{(() => { try { return new URL(p.url).pathname || "/"; } catch { return p.url; } })()}</span>
                </td>
                <td className="hidden max-w-[200px] truncate px-3 py-2.5 text-slate-300 sm:table-cell sm:px-4">
                  {p.title ?? "—"}
                </td>
                <td className="px-3 py-2.5 sm:px-4">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${PAGE_TYPE_COLORS[p.pageTypeGuess ?? "other"] ?? PAGE_TYPE_COLORS.other}`}>
                    {p.pageTypeGuess ?? "other"}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-slate-400 sm:px-4">{p.depth}</td>
                <td className="px-3 py-2.5 sm:px-4">
                  {p.status === "success" ? (
                    <span className="text-green-400">✓</span>
                  ) : (
                    <span className="text-red-400">✗</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-slate-500">{t("deepResults.noPagesMatch")}</p>
        )}
      </div>
    </div>
  );
}

/* ─── Structure Tab ─── */

function StructureTab({ pages, rootUrl }: { pages: CrawledPage[]; rootUrl: string }) {
  const t = useT();
  const tree = useMemo(() => buildTree(pages, rootUrl), [pages, rootUrl]);

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500 sm:text-sm">{t("deepResults.structureDescription")}</p>
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 sm:p-5">
        {tree.map((node) => (
          <TreeNode key={node.url} node={node} />
        ))}
        {tree.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-500">{t("deepResults.noStructure")}</p>
        )}
      </div>
    </div>
  );
}

interface TreeNodeData {
  url: string;
  title: string | null;
  pageTypeGuess: string | null;
  depth: number;
  children: TreeNodeData[];
}

function buildTree(pages: CrawledPage[], _rootUrl: string): TreeNodeData[] {
  const byUrl = new Map<string, CrawledPage>();
  for (const p of pages) byUrl.set(p.url, p);

  const childMap = new Map<string, CrawledPage[]>();
  const hasParent = new Set<string>();

  for (const p of pages) {
    if (p.parentUrl && byUrl.has(p.parentUrl)) {
      hasParent.add(p.url);
      const children = childMap.get(p.parentUrl) ?? [];
      children.push(p);
      childMap.set(p.parentUrl, children);
    }
  }

  function toNode(p: CrawledPage): TreeNodeData {
    const children = (childMap.get(p.url) ?? []).map(toNode);
    return { url: p.url, title: p.title, pageTypeGuess: p.pageTypeGuess, depth: p.depth, children };
  }

  return pages.filter((p) => !hasParent.has(p.url)).map(toNode);
}

function TreeNode({ node }: { node: TreeNodeData }) {
  const [open, setOpen] = useState(node.depth < 2);
  const hasChildren = node.children.length > 0;
  const typeCls = PAGE_TYPE_COLORS[node.pageTypeGuess ?? "other"] ?? PAGE_TYPE_COLORS.other;
  let pathname = "/";
  try { pathname = new URL(node.url).pathname || "/"; } catch {}

  return (
    <div style={{ paddingLeft: `${node.depth * 16}px` }}>
      <div className="flex items-center gap-1.5 py-1.5">
        {hasChildren ? (
          <button onClick={() => setOpen(!open)} className="shrink-0 text-slate-500 hover:text-slate-300">
            {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        ) : (
          <span className="w-3.5" />
        )}
        <a href={node.url} target="_blank" rel="noopener noreferrer" className="min-w-0 truncate text-xs text-indigo-400 hover:text-indigo-300 hover:underline sm:text-sm">
          {pathname}
        </a>
        <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${typeCls}`}>
          {node.pageTypeGuess ?? "other"}
        </span>
        {node.title && (
          <span className="hidden truncate text-[11px] text-slate-500 sm:inline">— {node.title}</span>
        )}
      </div>
      {open && node.children.map((child) => <TreeNode key={child.url} node={child} />)}
    </div>
  );
}

/* ─── Raw Data Tab ─── */

function RawDataTab({ pages }: { pages: CrawledPage[] }) {
  const t = useT();
  return (
    <div className="space-y-3">
      {pages.map((p) => (
        <RawPageCard key={p.url} page={p} />
      ))}
      {pages.length === 0 && (
        <p className="py-8 text-center text-sm text-slate-500">{t("deepResults.noPages")}</p>
      )}
    </div>
  );
}

function RawPageCard({ page }: { page: CrawledPage }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  let pathname = "/";
  try { pathname = new URL(page.url).pathname || "/"; } catch {}

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(JSON.stringify(page, null, 2)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [page]);

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-2 px-3 py-3 text-left sm:px-4">
        {open ? <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" /> : <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />}
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-white sm:text-sm">{pathname}</span>
        {page.status === "success" ? <Check className="h-3.5 w-3.5 shrink-0 text-green-400" /> : <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-400" />}
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${PAGE_TYPE_COLORS[page.pageTypeGuess ?? "other"] ?? PAGE_TYPE_COLORS.other}`}>
          {page.pageTypeGuess ?? "other"}
        </span>
      </button>

      {open && (
        <div className="border-t border-slate-800 px-3 pb-4 pt-3 sm:px-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <a href={page.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-indigo-400 hover:underline">
              {page.url} <ExternalLink className="h-3 w-3" />
            </a>
            <button onClick={handleCopy} className="flex items-center gap-1 rounded-md bg-slate-800 px-2 py-1 text-[10px] text-slate-400 hover:bg-slate-700 hover:text-white">
              <Copy className="h-3 w-3" />
              {copied ? t("common.copied") : t("deepResults.copyJson")}
            </button>
          </div>

          {page.error && (
            <div className="mb-3 rounded-md border border-red-800/40 bg-red-950/30 p-2 text-xs text-red-300">{page.error}</div>
          )}

          {page.title && (
            <DataSection title={t("common.title")}>
              <p className="text-xs text-slate-300 sm:text-sm">{page.title}</p>
            </DataSection>
          )}

          {Object.keys(page.rawMetadata).length > 0 && (
            <DataSection title={t("deepResults.metadata")}>
              <div className="grid gap-1">
                {Object.entries(page.rawMetadata).map(([k, v]) => (
                  <div key={k} className="flex gap-2 text-xs">
                    <span className="shrink-0 font-medium text-slate-400">{k}:</span>
                    <span className="min-w-0 break-all text-slate-300">{v ?? "—"}</span>
                  </div>
                ))}
              </div>
            </DataSection>
          )}

          {page.rawHeadings.length > 0 && (
            <DataSection title={`${t("deepResults.headings")} (${page.rawHeadings.length})`}>
              <div className="space-y-0.5">
                {page.rawHeadings.map((h, i) => (
                  <p key={i} className="text-xs text-slate-300" style={{ paddingLeft: `${(h.level - 1) * 12}px` }}>
                    <span className="mr-1 text-slate-500">H{h.level}</span> {h.text}
                  </p>
                ))}
              </div>
            </DataSection>
          )}

          {page.rawLinks.length > 0 && (
            <DataSection title={`${t("dashboard.links")} (${page.rawLinks.length})`}>
              <div className="max-h-[200px] space-y-0.5 overflow-y-auto">
                {page.rawLinks.slice(0, 30).map((l, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs">
                    <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${l.isInternal ? "bg-blue-500/15 text-blue-300" : "bg-slate-500/15 text-slate-400"}`}>
                      {l.isInternal ? t("deepResults.int") : t("deepResults.ext")}
                    </span>
                    <a href={l.href} target="_blank" rel="noopener noreferrer" className="min-w-0 truncate text-indigo-400 hover:underline">{l.href}</a>
                  </div>
                ))}
                {page.rawLinks.length > 30 && <p className="text-[11px] text-slate-500">+{page.rawLinks.length - 30} more</p>}
              </div>
            </DataSection>
          )}

          {page.rawImages.length > 0 && (
            <DataSection title={`${t("dashboard.images")} (${page.rawImages.length})`}>
              <div className="max-h-[200px] space-y-0.5 overflow-y-auto">
                {page.rawImages.slice(0, 20).map((img, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs">
                    <a href={img.src} target="_blank" rel="noopener noreferrer" className="min-w-0 truncate text-indigo-400 hover:underline">{img.src}</a>
                    {img.alt && <span className="shrink-0 text-slate-500">(alt: {img.alt})</span>}
                  </div>
                ))}
              </div>
            </DataSection>
          )}

          {page.rawTextPreview && (
            <DataSection title={t("deepResults.textPreview")}>
              <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-400">{page.rawTextPreview}</p>
            </DataSection>
          )}
        </div>
      )}
    </div>
  );
}

function DataSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{title}</h4>
      {children}
    </div>
  );
}

/* ─── Refinement Tab ─── */

function RefinementTab({
  pages,
  allPages,
  scope,
  refinedPages,
  setRefinedPages,
  refining,
  setRefining,
}: {
  pages: CrawledPage[];
  allPages: CrawledPage[];
  scope: TargetScope;
  refinedPages: RefinedPage[];
  setRefinedPages: (p: RefinedPage[]) => void;
  refining: boolean;
  setRefining: (b: boolean) => void;
}) {
  const t = useT();
  const [error, setError] = useState<string | null>(null);

  const targetForRefine = scope === "all" ? allPages : pages;
  const successCount = targetForRefine.filter((p) => p.status === "success").length;

  const handleRefine = useCallback(async () => {
    setRefining(true);
    setError(null);
    try {
      const res = await fetch("/api/deep-analyze/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pages: targetForRefine.filter((p) => p.status === "success") }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Server error (${res.status})`);
      }
      const data = await res.json();
      setRefinedPages(data.pages ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("refinement.refinementFailed"));
    } finally {
      setRefining(false);
    }
  }, [targetForRefine, setRefinedPages, setRefining, t]);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 sm:p-6">
        <h3 className="text-sm font-semibold text-white sm:text-base">
          {scope === "all" ? t("refinement.refineAllPages") : t("refinement.refineSinglePage")}
        </h3>
        <p className="mt-1 text-xs text-slate-400 sm:text-sm">
          {t("refinement.refineAllDescription", { count: successCount })}
        </p>

        {/* Agent-friendly note */}
        <div className="mt-3 flex items-start gap-2 rounded-md border border-purple-800/30 bg-purple-950/20 p-2.5">
          <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-purple-400" />
          <div>
            <p className="text-[11px] font-medium text-purple-300">{t("export.agentFriendly")}</p>
            <p className="mt-0.5 text-[10px] leading-relaxed text-slate-500">{t("export.agentFriendlyNote")}</p>
          </div>
        </div>

        <button
          onClick={handleRefine}
          disabled={refining || successCount === 0}
          className="mt-4 flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40"
        >
          {refining ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              {t("refinement.refining")}
            </>
          ) : (
            <>
              <FileText className="h-4 w-4" />
              {scope === "all"
                ? `${t("refinement.refineAllPages")} (${successCount})`
                : t("refinement.refineSinglePage")}
            </>
          )}
        </button>
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      </div>

      {refinedPages.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-white">
            {t("refinement.refinedOutput", { count: refinedPages.length })}
          </h3>
          {refinedPages.map((rp) => (
            <RefinedPageCard key={rp.url} refined={rp} />
          ))}
        </div>
      )}
    </div>
  );
}

function RefinedPageCard({ refined }: { refined: RefinedPage }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  let pathname = "/";
  try { pathname = new URL(refined.url).pathname || "/"; } catch {}

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-2 px-3 py-3 text-left sm:px-4">
        {open ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-500" />}
        <FileText className="h-3.5 w-3.5 text-purple-400" />
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-white sm:text-sm">{pathname}</span>
      </button>
      {open && (
        <div className="border-t border-slate-800 px-3 pb-4 pt-3 sm:px-4">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(refined.markdown).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                });
              }}
              className="flex items-center gap-1 rounded-md bg-slate-800 px-2 py-1 text-[10px] text-slate-400 hover:bg-slate-700 hover:text-white"
            >
              <Copy className="h-3 w-3" />
              {copied ? t("common.copied") : t("refinement.copyMarkdown")}
            </button>
            <button
              onClick={() => downloadText(refined.markdown, `${pathname.replace(/\//g, "_").replace(/^_/, "") || "page"}.md`)}
              className="flex items-center gap-1 rounded-md bg-slate-800 px-2 py-1 text-[10px] text-slate-400 hover:bg-slate-700 hover:text-white"
            >
              <Download className="h-3 w-3" />
              {t("export.downloadSingleMd")}
            </button>
          </div>
          <pre className="max-h-[400px] overflow-auto rounded-md bg-slate-950 p-3 text-xs leading-relaxed text-slate-300">
            {refined.markdown}
          </pre>
        </div>
      )}
    </div>
  );
}

/* ─── Export Tab ─── */

function ExportTab({
  pages,
  allPages,
  rootUrl,
  scope,
  selectedPageUrl,
  refinedPages,
}: {
  pages: CrawledPage[];
  allPages: CrawledPage[];
  rootUrl: string;
  scope: TargetScope;
  selectedPageUrl: string | null;
  refinedPages: RefinedPage[];
}) {
  const t = useT();
  const [downloading, setDownloading] = useState(false);

  const handleDownload = useCallback(
    async (dlScope: "all" | "single") => {
      setDownloading(true);
      try {
        const body: Record<string, unknown> = {
          pages: dlScope === "all" ? allPages : pages,
          rootUrl,
          scope: dlScope,
        };
        if (dlScope === "single" && selectedPageUrl) {
          body.pageUrl = selectedPageUrl;
        }

        const res = await fetch("/api/deep-analyze/export", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) throw new Error(`Export failed (${res.status})`);

        const blob = await res.blob();
        const disposition = res.headers.get("Content-Disposition") ?? "";
        const filenameMatch = disposition.match(/filename="?([^"]+)"?/);
        const filename = filenameMatch?.[1] ?? "export.md";

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error(err);
      } finally {
        setDownloading(false);
      }
    },
    [allPages, pages, rootUrl, selectedPageUrl],
  );

  const successCount = allPages.filter((p) => p.status === "success").length;

  return (
    <div className="space-y-4">
      {/* Agent-friendly banner */}
      <div className="rounded-lg border border-purple-800/30 bg-purple-950/20 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <FileText className="mt-0.5 h-5 w-5 shrink-0 text-purple-400" />
          <div>
            <h3 className="text-sm font-semibold text-purple-300">{t("export.agentFriendly")}</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">{t("export.agentFriendlyNote")}</p>
          </div>
        </div>
      </div>

      {/* Download options */}
      <div className="grid gap-3 sm:grid-cols-2">
        {/* All pages */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Layers className="h-4 w-4 text-purple-400" />
            <h4 className="text-sm font-semibold text-white">{t("export.downloadCombined")}</h4>
          </div>
          <p className="mb-4 text-[11px] leading-relaxed text-slate-500">{t("export.combinedDescription")}</p>
          <p className="mb-3 text-xs text-slate-400">
            {t("export.allPagesCount", { count: successCount })}
          </p>
          <button
            onClick={() => handleDownload("all")}
            disabled={downloading || successCount === 0}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40"
          >
            {downloading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                {t("export.generating")}
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                {t("export.downloadAllMarkdown")}
              </>
            )}
          </button>
        </div>

        {/* Single page */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
          <div className="mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-indigo-400" />
            <h4 className="text-sm font-semibold text-white">{t("export.downloadMarkdown")}</h4>
          </div>
          <p className="mb-4 text-[11px] leading-relaxed text-slate-500">{t("export.perPageDescription")}</p>
          {scope === "single" && selectedPageUrl ? (
            <button
              onClick={() => handleDownload("single")}
              disabled={downloading}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-indigo-600 bg-indigo-600/10 px-4 py-2.5 text-sm font-semibold text-indigo-300 transition-all hover:bg-indigo-600/20 disabled:opacity-40"
            >
              <Download className="h-4 w-4" />
              {t("export.downloadSingleMd")}
            </button>
          ) : (
            <p className="text-xs text-slate-500">{t("targetScope.selectPage")}</p>
          )}
        </div>
      </div>

      {/* Refined markdown quick export */}
      {refinedPages.length > 0 && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
          <h4 className="mb-2 text-sm font-semibold text-white">{t("refinement.refinedOutput", { count: refinedPages.length })}</h4>
          <p className="mb-3 text-[11px] text-slate-500">
            {refinedPages.length} pages refined and ready for download.
          </p>
          <button
            onClick={() => {
              const combined = refinedPages.map((rp) => rp.markdown).join("\n\n---\n\n");
              downloadText(combined, "refined_report.md");
            }}
            className="flex items-center gap-2 rounded-lg border border-purple-600 bg-purple-600/10 px-4 py-2 text-sm font-medium text-purple-300 transition hover:bg-purple-600/20"
          >
            <Download className="h-4 w-4" />
            {t("export.downloadCombined")}
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Utility ─── */

function downloadText(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ─── Technology Profile Tab ─── */

interface AggregatedTech {
  name: string;
  category: string;
  confidence: number;
  description?: string;
  matchedSignals: string[];
  pageCount: number;
  pages: string[];
}

const TECH_CATEGORY_COLORS: Record<string, string> = {
  ecommerce: "bg-emerald-500/15 text-emerald-300 border-emerald-800/40",
  cms: "bg-blue-500/15 text-blue-300 border-blue-800/40",
  framework: "bg-indigo-500/15 text-indigo-300 border-indigo-800/40",
  jsLibrary: "bg-violet-500/15 text-violet-300 border-violet-800/40",
  analytics: "bg-orange-500/15 text-orange-300 border-orange-800/40",
  marketing: "bg-pink-500/15 text-pink-300 border-pink-800/40",
  widgets: "bg-cyan-500/15 text-cyan-300 border-cyan-800/40",
  cdn: "bg-sky-500/15 text-sky-300 border-sky-800/40",
  hosting: "bg-teal-500/15 text-teal-300 border-teal-800/40",
  search: "bg-amber-500/15 text-amber-300 border-amber-800/40",
  security: "bg-red-500/15 text-red-300 border-red-800/40",
  fonts: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-800/40",
  media: "bg-rose-500/15 text-rose-300 border-rose-800/40",
  other: "bg-slate-500/15 text-slate-300 border-slate-800/40",
};

const TECH_CATEGORY_ORDER = [
  "ecommerce", "cms", "framework", "jsLibrary", "analytics", "marketing",
  "widgets", "search", "cdn", "hosting", "fonts", "media", "security", "other",
];

function TechProfileTab({
  pages,
  scope,
  selectedPageUrl,
}: {
  pages: CrawledPage[];
  scope: "all" | "single";
  selectedPageUrl: string | null;
}) {
  const t = useT();

  const aggregated = useMemo(() => {
    const relevantPages =
      scope === "single" && selectedPageUrl
        ? pages.filter((p) => p.url === selectedPageUrl)
        : pages.filter((p) => p.status === "success");

    const techMap = new Map<string, AggregatedTech>();

    for (const page of relevantPages) {
      if (!page.detectedTech) continue;
      for (const tech of page.detectedTech) {
        const existing = techMap.get(tech.name);
        if (existing) {
          existing.pageCount++;
          if (!existing.pages.includes(page.url)) existing.pages.push(page.url);
          existing.confidence = Math.max(existing.confidence, tech.confidence);
          for (const sig of tech.matchedSignals) {
            if (!existing.matchedSignals.includes(sig)) existing.matchedSignals.push(sig);
          }
        } else {
          techMap.set(tech.name, {
            name: tech.name,
            category: tech.category,
            confidence: tech.confidence,
            description: tech.description,
            matchedSignals: [...tech.matchedSignals],
            pageCount: 1,
            pages: [page.url],
          });
        }
      }
    }

    return Array.from(techMap.values()).sort((a, b) => b.pageCount - a.pageCount || b.confidence - a.confidence);
  }, [pages, scope, selectedPageUrl]);

  const byCategory = useMemo(() => {
    const map: Record<string, AggregatedTech[]> = {};
    for (const tech of aggregated) {
      (map[tech.category] ??= []).push(tech);
    }
    return map;
  }, [aggregated]);

  const sortedCategories = TECH_CATEGORY_ORDER.filter((c) => byCategory[c]);
  const totalPages = pages.filter((p) => p.status === "success").length;

  if (aggregated.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed border-slate-800 py-12">
        <p className="text-sm text-slate-500">{t("techProfile.noTech")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          {scope === "all" ? t("techProfile.siteWide") : t("techProfile.detected")} ({aggregated.length})
        </h3>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {aggregated.map((tech) => (
            <span
              key={tech.name}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium sm:text-xs ${TECH_CATEGORY_COLORS[tech.category] ?? TECH_CATEGORY_COLORS.other}`}
            >
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${tech.confidence >= 0.85 ? "bg-green-400" : tech.confidence >= 0.7 ? "bg-yellow-400" : "bg-orange-400"}`} />
              {tech.name}
              {scope === "all" && totalPages > 1 && (
                <span className="ml-0.5 text-[10px] opacity-60">({tech.pageCount})</span>
              )}
            </span>
          ))}
        </div>
      </div>

      {sortedCategories.map((category) => {
        const items = byCategory[category]!;
        const categoryLabel = t(`techProfile.categories.${category}`);

        return (
          <div key={category} className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-200 sm:text-sm">{categoryLabel}</h3>
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">{items.length}</span>
            </div>
            <div className="space-y-2">
              {items.map((tech) => (
                <DeepTechCard key={tech.name} tech={tech} totalPages={totalPages} showPages={scope === "all" && totalPages > 1} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DeepTechCard({ tech, totalPages, showPages }: { tech: AggregatedTech; totalPages: number; showPages: boolean }) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  const confPct = (tech.confidence * 100).toFixed(0);
  const confColor = tech.confidence >= 0.85 ? "text-green-400" : tech.confidence >= 0.7 ? "text-yellow-400" : "text-orange-400";
  const barColor = tech.confidence >= 0.85 ? "bg-green-500" : tech.confidence >= 0.7 ? "bg-yellow-500" : "bg-orange-500";

  return (
    <div className="rounded-lg border border-slate-800/70 bg-slate-950/50 transition hover:border-slate-700">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left sm:px-4"
      >
        <span className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${TECH_CATEGORY_COLORS[tech.category] ?? TECH_CATEGORY_COLORS.other}`}>
          {tech.name}
        </span>
        {tech.description && (
          <span className="hidden min-w-0 flex-1 truncate text-[11px] text-slate-500 sm:inline">{tech.description}</span>
        )}
        <span className="ml-auto flex shrink-0 items-center gap-2">
          {showPages && (
            <span className="text-[10px] text-slate-500">{t("techProfile.appearsOn", { count: tech.pageCount })}</span>
          )}
          <span className={`text-xs font-bold ${confColor}`}>{confPct}%</span>
          <span className="text-slate-600">{expanded ? "▾" : "▸"}</span>
        </span>
      </button>

      {expanded && (
        <div className="border-t border-slate-800/50 px-3 pb-3 pt-2.5 sm:px-4">
          {tech.description && <p className="mb-2 text-xs text-slate-400 sm:hidden">{tech.description}</p>}

          <div className="mb-2 flex items-center gap-2">
            <span className="text-[10px] text-slate-500">{t("techProfile.confidence")}</span>
            <div className="h-1.5 flex-1 rounded-full bg-slate-800">
              <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${tech.confidence * 100}%` }} />
            </div>
            <span className={`text-[11px] font-bold ${confColor}`}>{confPct}%</span>
          </div>

          <div className="mb-2">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {t("techProfile.evidence")} ({tech.matchedSignals.length} {t("techProfile.signals")})
            </p>
            <div className="flex flex-wrap gap-1">
              {tech.matchedSignals.map((sig, j) => (
                <code key={j} className="break-all rounded bg-slate-800 px-1.5 py-0.5 text-[11px] text-slate-400">{sig}</code>
              ))}
            </div>
          </div>

          {showPages && tech.pages.length > 0 && (
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {t("common.pages")} ({tech.pageCount}/{totalPages})
              </p>
              <div className="max-h-32 space-y-0.5 overflow-y-auto">
                {tech.pages.map((url) => {
                  let pathname = url;
                  try { pathname = new URL(url).pathname || "/"; } catch {}
                  return (
                    <div key={url} className="truncate text-[11px] text-slate-500">{pathname}</div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
