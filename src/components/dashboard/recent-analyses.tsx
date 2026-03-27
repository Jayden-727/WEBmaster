"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Globe, ArrowRight } from "lucide-react";

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
  const [items, setItems] = useState<RecentAnalysisItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analyses")
      .then((res) => res.json())
      .then((json) => setItems(json.items ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

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

  if (!items.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-800 py-8 text-center sm:py-10">
        <Globe className="mb-3 h-8 w-8 text-slate-700" />
        <p className="text-xs font-medium text-slate-400 sm:text-sm">No analyses yet</p>
        <p className="mt-1 text-[11px] text-slate-600 sm:text-xs">
          Submit a URL above to start your first analysis.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {items.map((item) => (
        <Link
          key={item.id}
          href={`/analysis/${item.id}` as Route}
          className="group flex items-center gap-3 rounded-lg border border-transparent p-2.5 transition hover:border-slate-800 hover:bg-slate-800/40 active:bg-slate-800/60 sm:p-3"
        >
          {/* Domain icon */}
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-800/80 text-slate-500 transition group-hover:bg-indigo-500/10 group-hover:text-indigo-400 sm:h-10 sm:w-10">
            <Globe className="h-4 w-4" />
          </div>

          {/* Content */}
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

          {/* Arrow */}
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-700 transition group-hover:text-slate-400" />
        </Link>
      ))}
    </div>
  );
}
