"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface RecentAnalysisItem {
  id: string;
  title: string | null;
  url: string;
  createdAt: string;
  mode: string;
  status: string;
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
          <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-800" />
        ))}
      </div>
    );
  }

  if (!items.length) {
    return <div className="text-sm text-slate-400">No analyses yet. Submit a URL above to get started.</div>;
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <Link
          key={item.id}
          href={`/analysis/${item.id}`}
          className="block rounded-lg border border-slate-800 p-3 transition-colors hover:bg-slate-900"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">{item.title ?? item.url}</p>
            <span className={`rounded-full px-2 py-0.5 text-xs ${
              item.status === "completed" ? "bg-green-900 text-green-300" : "bg-yellow-900 text-yellow-300"
            }`}>
              {item.status}
            </span>
          </div>
          <p className="text-xs text-slate-400">{new Date(item.createdAt).toLocaleString()} · {item.mode}</p>
        </Link>
      ))}
    </div>
  );
}
