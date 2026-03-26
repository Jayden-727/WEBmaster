"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export function HeroForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed, mode: "source" }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error ?? "Analysis failed");
        setLoading(false);
        return;
      }

      if (data.analysisId) {
        try {
          sessionStorage.setItem(`analysis:${data.analysisId}`, JSON.stringify(data));
        } catch {}
        router.push(`/analysis/${data.analysisId}`);
      }
    } catch {
      setError("Network error — could not reach the server");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl">
      <div className="flex flex-col gap-2 sm:flex-row sm:gap-0 sm:rounded-xl sm:border sm:border-slate-700/80 sm:bg-slate-900/80 sm:p-1.5 sm:shadow-2xl sm:shadow-indigo-500/10 sm:backdrop-blur-sm sm:transition sm:focus-within:border-indigo-500/50 sm:focus-within:shadow-indigo-500/20">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3.5 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none sm:flex-1 sm:rounded-none sm:border-0 sm:bg-transparent sm:py-3"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-500 px-6 py-3.5 text-sm font-semibold text-white transition-all hover:bg-indigo-400 disabled:opacity-40 sm:w-auto sm:rounded-lg sm:py-3"
        >
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Analyzing…
            </>
          ) : (
            "Start Analysis"
          )}
        </button>
      </div>
      {error && (
        <p className="mt-3 text-sm text-red-400">{error}</p>
      )}
      <p className="mt-3 text-xs text-slate-500">
        Free to use. No sign-up required.
      </p>
    </form>
  );
}
