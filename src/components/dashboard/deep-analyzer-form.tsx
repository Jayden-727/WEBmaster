"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { useT } from "@/lib/i18n";
import type { CrawlMode } from "@/types/deep-analysis";

type Status = "idle" | "creating" | "error";

const MODE_PRESETS: Record<CrawlMode, { maxPages: number; maxDepth: number }> = {
  all: { maxPages: 25, maxDepth: 3 },
  max: { maxPages: 10000, maxDepth: 10 },
};

export function DeepAnalyzerForm() {
  const router = useRouter();
  const t = useT();
  const [url, setUrl] = useState("");
  const [mode, setMode] = useState<CrawlMode>("all");
  const [maxPages, setMaxPages] = useState(25);
  const [maxDepth, setMaxDepth] = useState(3);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const switchMode = useCallback((newMode: CrawlMode) => {
    setMode(newMode);
    const preset = MODE_PRESETS[newMode];
    setMaxPages(preset.maxPages);
    setMaxDepth(preset.maxDepth);
  }, []);

  const startJob = useCallback(async () => {
    const trimmed = url.trim();
    if (!trimmed) return;

    setStatus("creating");
    setError(null);

    try {
      const res = await fetch("/api/deep-analyzer/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed, mode, maxPages, maxDepth }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Server error (${res.status})`);
      }

      const { jobId } = await res.json();
      router.push(`/deep-analysis/${jobId}` as Route);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to create job");
    }
  }, [url, mode, maxPages, maxDepth, router]);

  const isRunning = status === "creating";

  return (
    <div className="space-y-3">
      {/* URL input + button */}
      <div className="flex flex-col gap-2 sm:flex-row sm:gap-0 sm:rounded-xl sm:border sm:border-purple-700/40 sm:bg-slate-950/60 sm:p-1.5 sm:shadow-lg sm:shadow-purple-500/10 sm:transition sm:focus-within:border-purple-500/40 sm:focus-within:shadow-purple-500/15">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !isRunning && startJob()}
          placeholder="https://example.com"
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3.5 text-sm text-white placeholder:text-slate-500 focus:border-purple-500/50 focus:outline-none sm:flex-1 sm:rounded-none sm:border-0 sm:bg-transparent sm:py-3 sm:focus:border-0"
          disabled={isRunning}
        />
        <button
          onClick={startJob}
          disabled={isRunning || !url.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-3.5 text-sm font-semibold text-white transition-all hover:from-purple-500 hover:to-indigo-500 active:from-purple-700 active:to-indigo-700 disabled:opacity-40 sm:w-auto sm:rounded-lg sm:py-3"
        >
          {isRunning ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              {t("deepAnalyzer.creating")}
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {t("deepAnalyzer.button")}
            </>
          )}
        </button>
      </div>

      {/* Mode selector */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {t("deepAnalyzer.modeLabel")}
          </span>
          <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-purple-300">
            {t("common.premium")}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            onClick={() => switchMode("all")}
            disabled={isRunning}
            className={`rounded-lg border p-3 text-left transition ${
              mode === "all"
                ? "border-purple-500/40 bg-purple-500/10"
                : "border-slate-800 bg-slate-900/30 hover:border-slate-700"
            }`}
          >
            <div className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded-full border-2 ${mode === "all" ? "border-purple-400 bg-purple-400" : "border-slate-600"}`} />
              <span className="text-xs font-semibold text-white">{t("deepAnalyzer.modeAllTitle")}</span>
            </div>
            <p className="mt-1 pl-5 text-[11px] text-slate-400">{t("deepAnalyzer.modeAllDesc")}</p>
          </button>

          <button
            onClick={() => switchMode("max")}
            disabled={isRunning}
            className={`rounded-lg border p-3 text-left transition ${
              mode === "max"
                ? "border-amber-500/40 bg-amber-500/10"
                : "border-slate-800 bg-slate-900/30 hover:border-slate-700"
            }`}
          >
            <div className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded-full border-2 ${mode === "max" ? "border-amber-400 bg-amber-400" : "border-slate-600"}`} />
              <span className="text-xs font-semibold text-white">{t("deepAnalyzer.modeMaxTitle")}</span>
              <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-300">
                {t("deepAnalyzer.modeMaxBadge")}
              </span>
            </div>
            <p className="mt-1 pl-5 text-[11px] text-slate-400">{t("deepAnalyzer.modeMaxDesc")}</p>
          </button>
        </div>
      </div>

      {/* Config row - only for All Pages mode */}
      {mode === "all" && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-500">{t("deepAnalyzer.configPages")}</span>
            <div className="flex gap-1">
              {[10, 25, 50, 100, 200].map((n) => (
                <button
                  key={n}
                  onClick={() => setMaxPages(n)}
                  disabled={isRunning}
                  className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                    maxPages === n
                      ? "bg-purple-500/15 text-purple-300 ring-1 ring-purple-500/30"
                      : "bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-300"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-500">{t("deepAnalyzer.configDepth")}</span>
            <div className="flex gap-1">
              {[1, 2, 3, 5, 10].map((n) => (
                <button
                  key={n}
                  onClick={() => setMaxDepth(n)}
                  disabled={isRunning}
                  className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                    maxDepth === n
                      ? "bg-purple-500/15 text-purple-300 ring-1 ring-purple-500/30"
                      : "bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-300"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {mode === "max" && status === "idle" && (
        <div className="rounded-lg border border-amber-800/30 bg-amber-950/20 p-3">
          <p className="text-[11px] text-amber-300/80">
            ⚡ {t("deepAnalyzer.maxWarning")}
          </p>
        </div>
      )}

      {status === "error" && error && (
        <div className="rounded-lg border border-red-800/40 bg-red-950/30 p-3 sm:p-4">
          <p className="text-sm font-medium text-red-400">{t("deepAnalyzer.crawlFailed")}</p>
          <p className="mt-1 break-words text-xs text-red-300/80">{error}</p>
          <button
            onClick={() => setStatus("idle")}
            className="mt-2 rounded-md bg-slate-800/60 px-2 py-1 text-[11px] text-slate-400 hover:bg-slate-800 hover:text-slate-300"
          >
            {t("common.dismiss")}
          </button>
        </div>
      )}
    </div>
  );
}
