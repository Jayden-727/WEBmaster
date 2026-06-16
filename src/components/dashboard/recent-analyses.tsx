"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Globe, ArrowRight, Trash2, AlertCircle } from "lucide-react";
import { useT } from "@/lib/i18n";

interface RecentAnalysisItem {
  id: string;
  title: string | null;
  url: string;
  createdAt: string;
  mode: string;
  status: string;
}

function extractDomain(url: string): string {
  try { return new URL(url).hostname; } catch { return url; }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function RecentAnalysesList() {
  const t = useT();
  const [items, setItems] = useState<RecentAnalysisItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbConfigured, setDbConfigured] = useState<boolean | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const loadLocalFallback = useCallback(() => {
    try {
      const localKey = "attractivewebai-recent-analyses";
      const stored = localStorage.getItem(localKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const deletedKey = "attractivewebai-deleted-analyses";
          const deletedStr = localStorage.getItem(deletedKey);
          const deletedIds: string[] = deletedStr ? JSON.parse(deletedStr) || [] : [];
          
          return parsed.filter((item) => item && item.id && !deletedIds.includes(item.id));
        }
      }
    } catch (e) {
      console.warn("Failed to load local recent analyses", e);
    }
    return [];
  }, []);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/analyses");
      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }
      const json = await res.json();
      
      const isDb = json.databaseConfigured !== false;
      setDbConfigured(isDb);
      
      const deletedKey = "attractivewebai-deleted-analyses";
      let deletedIds: string[] = [];
      try {
        const deletedStr = localStorage.getItem(deletedKey);
        deletedIds = deletedStr ? JSON.parse(deletedStr) || [] : [];
      } catch {}

      if (isDb) {
        const fetchedItems = (json.items ?? []).filter((item: RecentAnalysisItem) => item && item.id && !deletedIds.includes(item.id));
        setItems(fetchedItems);
        try {
          const localKey = "attractivewebai-recent-analyses";
          localStorage.setItem(localKey, JSON.stringify(fetchedItems));
        } catch {}
        setFetchError(null);
      } else {
        const localItems = loadLocalFallback();
        setItems(localItems);
        setFetchError(null);
      }
    } catch (err) {
      console.error("Failed to load recent analyses", err);
      setFetchError("Failed to load recent analyses");
      
      const localItems = loadLocalFallback();
      if (localItems.length > 0 || items.length === 0) {
        setItems(localItems);
      }
    } finally {
      setLoading(false);
    }
  }, [items.length, loadLocalFallback]);

  useEffect(() => {
    loadData();
  }, []);

  const handleRemove = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();

    setItems((prev) => prev.filter((item) => item.id !== id));

    try {
      const deletedKey = "attractivewebai-deleted-analyses";
      const deletedStr = localStorage.getItem(deletedKey);
      let deletedIds: string[] = deletedStr ? JSON.parse(deletedStr) || [] : [];
      if (!deletedIds.includes(id)) {
        deletedIds.push(id);
      }
      localStorage.setItem(deletedKey, JSON.stringify(deletedIds));
    } catch {}

    if (!dbConfigured) {
      try {
        const localKey = "attractivewebai-recent-analyses";
        const currentLocal = localStorage.getItem(localKey);
        if (currentLocal) {
          const parsed = JSON.parse(currentLocal);
          if (Array.isArray(parsed)) {
            const updated = parsed.filter((item) => item && item.id !== id);
            localStorage.setItem(localKey, JSON.stringify(updated));
          }
        }
      } catch {}
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg bg-slate-800/40 p-3">
            <div className="h-8 w-8 animate-pulse rounded-lg bg-slate-800" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-2/3 animate-pulse rounded bg-slate-800" />
              <div className="h-2.5 w-1/3 animate-pulse rounded bg-slate-800" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {fetchError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-800/40 bg-red-950/20 px-3 py-2 text-xs text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span>{t("dashboard.failedToLoadRecent") || "Failed to load recent analyses"}</span>
        </div>
      )}

      {dbConfigured === false && (
        <div className="rounded-lg border border-amber-800/30 bg-amber-950/10 px-3 py-2 text-[10px] leading-relaxed text-slate-400 sm:text-xs">
          {t("dashboard.dbNotConfiguredNote") || "Database persistence is not configured. Analyses are temporarily saved in your browser storage."}
        </div>
      )}

      {!items.length ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-800 py-8 text-center sm:py-10">
          <Globe className="mb-3 h-8 w-8 text-slate-700" />
          <p className="text-xs font-medium text-slate-400 sm:text-sm">
            {t("history.emptyTitle") || "No analyses yet"}
          </p>
          <p className="mt-1 text-[11px] text-slate-600 sm:text-xs">
            {t("dashboard.submitCtaNote") || "Submit a URL above to start your first analysis."}
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/analysis/${item.id}` as Route}
              className="group flex items-center gap-3 rounded-lg border border-transparent p-2.5 transition hover:border-slate-800 hover:bg-slate-800/40 active:bg-slate-800/60 sm:p-3"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-800/80 text-slate-500 transition group-hover:bg-indigo-500/10 group-hover:text-indigo-400 sm:h-10 sm:w-10">
                <Globe className="h-4 w-4" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="min-w-0 truncate text-xs font-semibold text-white sm:text-sm">
                    {item.title ?? extractDomain(item.url)}
                  </p>
                  <span className={`shrink-0 rounded-full px-1.5 py-px text-[9px] font-medium leading-4 sm:text-[10px] ${
                    item.status === "completed"
                      ? "bg-green-500/10 text-green-400 ring-1 ring-green-500/20"
                      : "bg-yellow-500/10 text-yellow-400 ring-1 ring-yellow-500/20"
                  }`}>
                    {item.status === "completed" ? "Done" : item.status}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-[10px] text-slate-500 sm:text-[11px]">
                  {extractDomain(item.url)} · {timeAgo(item.createdAt)} · {item.mode}
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={(e) => handleRemove(e, item.id)}
                  className="rounded-md p-1.5 text-slate-600 transition hover:bg-red-950/30 hover:text-red-400 sm:opacity-0 sm:group-hover:opacity-100"
                  title="Remove from history"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-700 transition group-hover:text-slate-400" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
