"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Globe,
  Search,
  ExternalLink,
  Clock,
  Layers,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Play,
  RefreshCw,
  Loader2,
  SlidersHorizontal,
  ArrowUpDown,
} from "lucide-react";
import { useT } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";
import type { HistoryItem } from "@/app/api/history/route";

type SortKey = "newest" | "oldest" | "mostPages" | "recentlyUpdated";
type StatusFilter = "all" | "completed" | "running" | "failed" | "paused";
type ModeFilter = "all" | "single" | "deep";

const STATUS_CONFIG: Record<string, { color: string; icon: typeof CheckCircle2; label: string }> = {
  completed: { color: "bg-green-500/15 text-green-400 border-green-800/40", icon: CheckCircle2, label: "Completed" },
  running: { color: "bg-blue-500/15 text-blue-400 border-blue-800/40", icon: Loader2, label: "Running" },
  paused: { color: "bg-amber-500/15 text-amber-400 border-amber-800/40", icon: Clock, label: "Paused" },
  pending: { color: "bg-slate-500/15 text-slate-400 border-slate-800/40", icon: Clock, label: "Pending" },
  failed: { color: "bg-red-500/15 text-red-400 border-red-800/40", icon: AlertTriangle, label: "Failed" },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function HistoryPage() {
  const t = useT();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [modeFilter, setModeFilter] = useState<ModeFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [showFilters, setShowFilters] = useState(false);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/history");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setItems(data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load history");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const filtered = useMemo(() => {
    let list = [...items];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (it) =>
          it.url.toLowerCase().includes(q) ||
          it.domain.toLowerCase().includes(q) ||
          (it.title ?? "").toLowerCase().includes(q),
      );
    }

    if (statusFilter !== "all") {
      list = list.filter((it) => it.status === statusFilter);
    }

    if (modeFilter === "single") {
      list = list.filter((it) => it.type === "single");
    } else if (modeFilter === "deep") {
      list = list.filter((it) => it.type === "deep");
    }

    switch (sortKey) {
      case "oldest":
        list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case "mostPages":
        list.sort((a, b) => b.totalPages - a.totalPages);
        break;
      case "recentlyUpdated":
        list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        break;
      default:
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return list;
  }, [items, search, statusFilter, modeFilter, sortKey]);

  const stats = useMemo(() => {
    const total = items.length;
    const completed = items.filter((i) => i.status === "completed").length;
    const running = items.filter((i) => i.status === "running" || i.status === "paused").length;
    const deep = items.filter((i) => i.type === "deep").length;
    return { total, completed, running, deep };
  }, [items]);

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
            <span className="hidden text-sm text-slate-400 sm:inline">{t("history.title")}</span>
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
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{t("history.title")}</h1>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">{t("history.subtitle")}</p>
        </div>

        {/* Summary stats */}
        {!loading && items.length > 0 && (
          <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            <StatCard label={t("history.totalJobs")} value={stats.total} />
            <StatCard label={t("history.completedJobs")} value={stats.completed} color="text-green-400" />
            <StatCard label={t("history.activeJobs")} value={stats.running} color="text-blue-400" />
            <StatCard label={t("history.deepJobs")} value={stats.deep} color="text-purple-400" />
          </div>
        )}

        {/* Search + Filter bar */}
        {!loading && items.length > 0 && (
          <div className="mb-4 space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("history.searchPlaceholder")}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 py-2.5 pl-9 pr-3 text-xs text-white placeholder:text-slate-500 focus:border-slate-700 focus:outline-none sm:text-sm"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-2.5 text-xs font-medium transition sm:text-sm ${
                    showFilters ? "border-purple-500/40 bg-purple-500/10 text-purple-300" : "border-slate-800 bg-slate-900/50 text-slate-400 hover:border-slate-700 hover:text-white"
                  }`}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  {t("common.filter")}
                </button>
                <select
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value as SortKey)}
                  className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-xs text-white focus:outline-none sm:text-sm"
                >
                  <option value="newest">{t("history.sortNewest")}</option>
                  <option value="oldest">{t("history.sortOldest")}</option>
                  <option value="mostPages">{t("history.sortPages")}</option>
                  <option value="recentlyUpdated">{t("history.sortUpdated")}</option>
                </select>
              </div>
            </div>

            {showFilters && (
              <div className="flex flex-wrap gap-2 rounded-lg border border-slate-800 bg-slate-900/50 p-3">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t("common.status")}:</span>
                  {(["all", "completed", "running", "paused", "failed"] as StatusFilter[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
                        statusFilter === s
                          ? "bg-purple-500/15 text-purple-300 ring-1 ring-purple-500/30"
                          : "bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-300"
                      }`}
                    >
                      {s === "all" ? t("common.allTypes") : s}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t("common.type")}:</span>
                  {(["all", "single", "deep"] as ModeFilter[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setModeFilter(m)}
                      className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
                        modeFilter === m
                          ? "bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/30"
                          : "bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-300"
                      }`}
                    >
                      {m === "all" ? t("common.allTypes") : m === "single" ? t("history.singleAnalysis") : "DeepAnalyzer"}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-slate-800" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-2/3 rounded bg-slate-800" />
                    <div className="h-3 w-1/3 rounded bg-slate-800" />
                  </div>
                  <div className="h-6 w-20 rounded-full bg-slate-800" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="rounded-lg border border-red-800/40 bg-red-950/30 p-6 text-center">
            <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-red-400" />
            <p className="text-sm font-medium text-red-400">{t("history.fetchError")}</p>
            <p className="mt-1 text-xs text-red-300/60">{error}</p>
            <button
              onClick={fetchHistory}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700"
            >
              <RefreshCw className="h-4 w-4" />
              {t("history.retry")}
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && items.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-800 p-12 text-center">
            <Clock className="mx-auto mb-4 h-12 w-12 text-slate-700" />
            <h3 className="text-lg font-semibold text-slate-300">{t("history.emptyTitle")}</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              {t("history.emptyDescription")}
            </p>
            <Link
              href="/dashboard"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:from-purple-500 hover:to-indigo-500"
            >
              <Play className="h-4 w-4" />
              {t("history.startNewAnalysis")}
            </Link>
          </div>
        )}

        {/* No filter results */}
        {!loading && !error && items.length > 0 && filtered.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-800 py-12 text-center">
            <Search className="mx-auto mb-3 h-8 w-8 text-slate-600" />
            <p className="text-sm text-slate-500">{t("history.noResults")}</p>
            <button
              onClick={() => { setSearch(""); setStatusFilter("all"); setModeFilter("all"); }}
              className="mt-3 text-xs text-indigo-400 hover:underline"
            >
              {t("history.clearFilters")}
            </button>
          </div>
        )}

        {/* Results */}
        {!loading && filtered.length > 0 && (
          <div className="space-y-2">
            {filtered.map((item) => (
              <HistoryCard key={`${item.type}-${item.id}`} item={item} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value, color = "text-white" }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
      <p className={`text-lg font-bold sm:text-xl ${color}`}>{value}</p>
      <p className="text-[10px] text-slate-500 sm:text-[11px]">{label}</p>
    </div>
  );
}

function HistoryCard({ item }: { item: HistoryItem }) {
  const t = useT();
  const statusCfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.pending;
  const StatusIcon = statusCfg.icon;

  const resultHref =
    item.type === "deep"
      ? `/deep-analysis/${item.id}`
      : `/analysis/${item.id}`;

  let pathname = item.url;
  try { pathname = new URL(item.url).hostname + new URL(item.url).pathname; } catch {}

  return (
    <div className="group rounded-lg border border-slate-800 bg-slate-900/50 transition hover:border-slate-700">
      <div className="flex items-start gap-3 p-3 sm:items-center sm:gap-4 sm:p-4">
        {/* Icon */}
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
          item.type === "deep" ? "bg-purple-500/15" : "bg-indigo-500/15"
        }`}>
          {item.type === "deep" ? (
            <Layers className={`h-4 w-4 ${item.type === "deep" ? "text-purple-400" : "text-indigo-400"}`} />
          ) : (
            <Globe className="h-4 w-4 text-indigo-400" />
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-2">
            <Link
              href={resultHref}
              className="min-w-0 truncate text-xs font-semibold text-white hover:text-indigo-300 hover:underline sm:text-sm"
            >
              {item.title || pathname}
            </Link>
            {/* Type badge */}
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
              item.type === "deep" ? "bg-purple-500/15 text-purple-300" : "bg-indigo-500/15 text-indigo-300"
            }`}>
              {item.type === "deep" ? "Deep" : "Single"}
            </span>
            {/* Mode badge */}
            {item.type === "deep" && item.mode === "max" && (
              <span className="shrink-0 rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-300">
                MAX
              </span>
            )}
            {/* Status */}
            <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusCfg.color}`}>
              <StatusIcon className={`h-2.5 w-2.5 ${item.status === "running" ? "animate-spin" : ""}`} />
              {statusCfg.label}
            </span>
          </div>

          {/* Metadata row */}
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
            <span>{item.domain}</span>
            {item.type === "deep" && (
              <>
                <span>{item.totalSuccess} {t("history.pagesOk")}</span>
                {item.totalFailed > 0 && (
                  <span className="text-red-400/60">{item.totalFailed} {t("history.pagesFailed")}</span>
                )}
              </>
            )}
            <span>{timeAgo(item.createdAt)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1">
          <Link
            href={resultHref}
            className="rounded-md p-1.5 text-slate-600 transition hover:bg-slate-800 hover:text-indigo-400 sm:opacity-0 sm:group-hover:opacity-100"
            title={t("history.openResult")}
          >
            <FileText className="h-4 w-4" />
          </Link>

          {item.resumable && (
            <Link
              href={resultHref}
              className="rounded-md p-1.5 text-slate-600 transition hover:bg-slate-800 hover:text-green-400 sm:opacity-0 sm:group-hover:opacity-100"
              title={t("history.resume")}
            >
              <Play className="h-4 w-4" />
            </Link>
          )}

          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md p-1.5 text-slate-600 transition hover:bg-slate-800 hover:text-slate-300 sm:opacity-0 sm:group-hover:opacity-100"
            title={t("history.openOriginal")}
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>

      {/* Progress bar for running jobs */}
      {(item.status === "running" || item.status === "paused") && item.totalPages > 0 && (
        <div className="border-t border-slate-800/50 px-4 py-2">
          <div className="flex items-center gap-3">
            <div className="h-1.5 flex-1 rounded-full bg-slate-800">
              <div
                className="h-1.5 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all"
                style={{ width: `${Math.min(((item.totalSuccess + item.totalFailed) / item.totalPages) * 100, 99)}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-500">
              {item.totalSuccess + item.totalFailed}/{item.totalPages}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
