"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnalyzeMode, AnalyzeApiResponse } from "@/types/analysis";

type FormStatus = "idle" | "loading" | "success" | "error";

export function AnalyzeForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [mode, setMode] = useState<AnalyzeMode>("source");
  const [status, setStatus] = useState<FormStatus>("idle");
  const [result, setResult] = useState<AnalyzeApiResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const submit = async () => {
    if (!url.trim()) return;

    setStatus("loading");
    setResult(null);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), mode }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setStatus("error");
        setErrorMessage(data.error ?? `Request failed with status ${res.status}`);
        return;
      }

      const typedData = data as AnalyzeApiResponse;
      setResult(typedData);
      setStatus("success");

      if (typedData.analysisId) {
        try {
          sessionStorage.setItem(`analysis:${typedData.analysisId}`, JSON.stringify(typedData));
        } catch { /* sessionStorage may be full or unavailable */ }
        setTimeout(() => router.push(`/analysis/${typedData.analysisId}`), 1500);
      }
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Network error — could not reach the server");
    }
  };

  return (
    <div className="space-y-3">
      {/* Input row */}
      <div className="flex flex-col gap-2 sm:flex-row sm:gap-0 sm:rounded-xl sm:border sm:border-slate-700/60 sm:bg-slate-950/60 sm:p-1.5 sm:shadow-lg sm:shadow-black/20 sm:transition sm:focus-within:border-indigo-500/40 sm:focus-within:shadow-indigo-500/10">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && status !== "loading" && submit()}
          placeholder="https://example.com"
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3.5 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500/50 focus:outline-none sm:flex-1 sm:rounded-none sm:border-0 sm:bg-transparent sm:py-3 sm:focus:border-0"
          disabled={status === "loading"}
        />
        <button
          onClick={submit}
          disabled={status === "loading" || !url.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-500 px-6 py-3.5 text-sm font-semibold text-white transition-all hover:bg-indigo-400 active:bg-indigo-600 disabled:opacity-40 sm:w-auto sm:rounded-lg sm:py-3"
        >
          {status === "loading" ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Analyzing…
            </>
          ) : (
            "Start Analysis"
          )}
        </button>
      </div>

      {/* Mode toggle */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-slate-500 sm:text-xs">Mode:</span>
        <div className="flex gap-1">
          <button
            onClick={() => setMode("source")}
            className={`rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors sm:px-3 sm:py-1 sm:text-xs ${
              mode === "source"
                ? "bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/30"
                : "bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-300"
            }`}
          >
            View Source
          </button>
          <button
            onClick={() => setMode("rendered")}
            className={`rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors sm:px-3 sm:py-1 sm:text-xs ${
              mode === "rendered"
                ? "bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/30"
                : "bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-300"
            }`}
          >
            Rendered DOM
          </button>
        </div>
      </div>

      {/* Loading state */}
      {status === "loading" && (
        <div className="rounded-lg border border-indigo-800/30 bg-indigo-950/20 p-3 sm:p-4">
          <div className="flex items-center gap-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
            <span className="min-w-0 truncate text-sm text-slate-300">Analyzing {url}…</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {["Fetching", "Metadata", "Stack", "Structure"].map((step, i) => (
              <div key={step} className="flex items-center gap-2 rounded-md bg-slate-800/40 px-2 py-1.5">
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-400" style={{ animationDelay: `${i * 200}ms` }} />
                <span className="text-[10px] text-slate-400 sm:text-[11px]">{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error state */}
      {status === "error" && errorMessage && (
        <div className="rounded-lg border border-red-800/40 bg-red-950/30 p-3 sm:p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-red-400">Analysis failed</p>
              <p className="mt-1 break-words text-xs text-red-300/80">{errorMessage}</p>
            </div>
            <button onClick={() => setStatus("idle")} className="shrink-0 rounded-md bg-slate-800/60 px-2 py-1 text-[11px] text-slate-400 hover:bg-slate-800 hover:text-slate-300 active:bg-slate-700">
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Success state */}
      {status === "success" && result && (
        <div className="rounded-lg border border-green-800/40 bg-green-950/20 p-3 sm:p-4">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-400" />
            <p className="text-sm font-medium text-green-400">Analysis complete</p>
          </div>
          <p className="mt-1.5 break-words text-xs text-green-300/80">
            {result.title ?? result.url}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[
              { label: "Stack", count: result.data.stack.length },
              { label: "Links", count: result.data.links.length },
              { label: "Images", count: result.data.images.length },
            ].map(({ label, count }) => (
              <span key={label} className="rounded-full bg-green-900/40 px-2 py-0.5 text-[10px] font-medium text-green-300/80 sm:text-[11px]">
                {count} {label}
              </span>
            ))}
          </div>
          {result.errors.length > 0 && (
            <div className="mt-2 space-y-0.5">
              {result.errors.map((e, i) => (
                <p key={i} className="break-words text-[11px] text-red-400/80">✗ {e.section}: {e.message}</p>
              ))}
            </div>
          )}
          <div className="mt-2 flex items-center gap-2">
            <div className="h-3 w-3 animate-spin rounded-full border border-slate-600 border-t-slate-300" />
            <p className="text-[11px] text-slate-500">Redirecting to results…</p>
          </div>
        </div>
      )}
    </div>
  );
}
