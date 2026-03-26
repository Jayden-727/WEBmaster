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
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && status !== "loading" && submit()}
          placeholder="https://example.com"
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500"
        />
        <button
          onClick={submit}
          disabled={status === "loading" || !url.trim()}
          className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-400 disabled:opacity-40"
        >
          {status === "loading" ? "Analyzing…" : "Analyze"}
        </button>
      </div>

      <div className="flex gap-2 text-sm text-slate-300">
        <button
          onClick={() => setMode("source")}
          className={`rounded-md px-3 py-1 transition-colors ${mode === "source" ? "bg-slate-700 text-white" : "bg-slate-800 hover:bg-slate-700"}`}
        >
          View Source
        </button>
        <button
          onClick={() => setMode("rendered")}
          className={`rounded-md px-3 py-1 transition-colors ${mode === "rendered" ? "bg-slate-700 text-white" : "bg-slate-800 hover:bg-slate-700"}`}
        >
          Rendered DOM
        </button>
      </div>

      {status === "loading" && (
        <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
          <div className="flex items-center gap-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
            <span className="text-sm text-slate-300">Analyzing {url}…</span>
          </div>
          <div className="mt-3 space-y-2">
            {["Fetching HTML", "Extracting metadata", "Detecting stack", "Analyzing structure"].map((step) => (
              <div key={step} className="h-3 animate-pulse rounded bg-slate-800" style={{ width: `${60 + Math.random() * 30}%` }} />
            ))}
          </div>
        </div>
      )}

      {status === "error" && errorMessage && (
        <div className="rounded-lg border border-red-800 bg-red-950 p-4">
          <p className="text-sm font-medium text-red-400">Analysis failed</p>
          <p className="mt-1 text-sm text-red-300">{errorMessage}</p>
          <button onClick={() => setStatus("idle")} className="mt-2 text-xs text-red-400 underline hover:text-red-300">
            Dismiss
          </button>
        </div>
      )}

      {status === "success" && result && (
        <div className="rounded-lg border border-green-800 bg-green-950 p-4">
          <p className="text-sm font-medium text-green-400">Analysis complete</p>
          <p className="mt-1 text-sm text-green-300">
            {result.title ?? result.url} — {result.data.stack.length} stack signals, {result.data.links.length} links, {result.data.images.length} images
          </p>
          {result.warnings.length > 0 && (
            <ul className="mt-2 space-y-1">
              {result.warnings.map((w, i) => (
                <li key={i} className="text-xs text-yellow-400">⚠ {w}</li>
              ))}
            </ul>
          )}
          {result.errors.length > 0 && (
            <ul className="mt-2 space-y-1">
              {result.errors.map((e, i) => (
                <li key={i} className="text-xs text-red-400">✗ {e.section}: {e.message}</li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-slate-400">Redirecting to detail view…</p>
        </div>
      )}
    </div>
  );
}
