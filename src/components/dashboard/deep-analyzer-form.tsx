"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n";
import type {
  CrawledPage,
  CrawlStreamEvent,
  QueueItem,
} from "@/types/deep-analysis";

type Status = "idle" | "crawling" | "paused" | "completed" | "error";

export function DeepAnalyzerForm() {
  const router = useRouter();
  const t = useT();
  const [url, setUrl] = useState("");
  const [maxPages, setMaxPages] = useState(10);
  const [maxDepth, setMaxDepth] = useState(3);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const [pages, setPages] = useState<CrawledPage[]>([]);
  const [discovered, setDiscovered] = useState(0);
  const [crawled, setCrawled] = useState(0);
  const [errors, setErrors] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);

  const processStream = useCallback(
    async (
      response: Response,
      existingPages: CrawledPage[],
    ): Promise<{
      pages: CrawledPage[];
      pauseData: { queue: QueueItem[]; visited: string[]; pagesCrawled: number } | null;
      finalJobId: string | null;
    }> => {
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No stream available");

      const decoder = new TextDecoder();
      let buffer = "";
      const allPages = [...existingPages];
      let pauseData: { queue: QueueItem[]; visited: string[]; pagesCrawled: number } | null = null;
      let currentJobId: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event: CrawlStreamEvent = JSON.parse(line);

            switch (event.type) {
              case "started":
                currentJobId = event.jobId;
                setJobId(event.jobId);
                break;
              case "page":
                allPages.push(event.page);
                setPages([...allPages]);
                setCrawled((c) => c + 1);
                break;
              case "discovered":
                setDiscovered((d) => d + 1);
                break;
              case "error":
                setErrors((e) => e + 1);
                break;
              case "paused":
                pauseData = {
                  queue: event.queue,
                  visited: event.visited,
                  pagesCrawled: event.pagesCrawled,
                };
                break;
              case "completed":
                break;
            }
          } catch {}
        }
      }

      return { pages: allPages, pauseData, finalJobId: currentJobId };
    },
    [],
  );

  const startCrawl = useCallback(async () => {
    const trimmed = url.trim();
    if (!trimmed) return;

    setStatus("crawling");
    setError(null);
    setPages([]);
    setDiscovered(0);
    setCrawled(0);
    setErrors(0);
    setJobId(null);

    try {
      let allPages: CrawledPage[] = [];
      const rootUrl = trimmed;
      let currentJobId: string | null = null;

      const res = await fetch("/api/deep-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed, maxPages, maxDepth }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Server error (${res.status})`);
      }

      let result = await processStream(res, allPages);
      allPages = result.pages;
      if (result.finalJobId) currentJobId = result.finalJobId;

      while (result.pauseData) {
        setStatus("paused");
        const contRes = await fetch("/api/deep-analyze/continue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rootUrl,
            maxPages,
            maxDepth,
            queue: result.pauseData.queue,
            visited: result.pauseData.visited,
            pagesCrawled: result.pauseData.pagesCrawled,
          }),
        });

        if (!contRes.ok) break;
        setStatus("crawling");
        result = await processStream(contRes, allPages);
        allPages = result.pages;
      }

      setStatus("completed");

      const finalId = currentJobId ?? crypto.randomUUID();
      try {
        sessionStorage.setItem(
          `deep-analysis:${finalId}`,
          JSON.stringify({
            jobId: finalId,
            rootUrl,
            domain: new URL(rootUrl).hostname,
            maxPages,
            maxDepth,
            status: "completed",
            pages: allPages,
            totalDiscovered: allPages.length,
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
          }),
        );
      } catch {}

      setTimeout(() => router.push(`/deep-analysis/${finalId}`), 1200);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Crawl failed");
    }
  }, [url, maxPages, maxDepth, processStream, router]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:gap-0 sm:rounded-xl sm:border sm:border-purple-700/40 sm:bg-slate-950/60 sm:p-1.5 sm:shadow-lg sm:shadow-purple-500/10 sm:transition sm:focus-within:border-purple-500/40 sm:focus-within:shadow-purple-500/15">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && status !== "crawling" && startCrawl()}
          placeholder="https://example.com"
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3.5 text-sm text-white placeholder:text-slate-500 focus:border-purple-500/50 focus:outline-none sm:flex-1 sm:rounded-none sm:border-0 sm:bg-transparent sm:py-3 sm:focus:border-0"
          disabled={status === "crawling" || status === "paused"}
        />
        <button
          onClick={startCrawl}
          disabled={status === "crawling" || status === "paused" || !url.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-3.5 text-sm font-semibold text-white transition-all hover:from-purple-500 hover:to-indigo-500 active:from-purple-700 active:to-indigo-700 disabled:opacity-40 sm:w-auto sm:rounded-lg sm:py-3"
        >
          {status === "crawling" || status === "paused" ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              {status === "paused" ? t("deepAnalyzer.resuming") : t("deepAnalyzer.crawling")}
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

      {/* Config row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-500">{t("deepAnalyzer.configPages")}</span>
          <div className="flex gap-1">
            {[10, 25, 50].map((n) => (
              <button
                key={n}
                onClick={() => setMaxPages(n)}
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
            {[1, 2, 3, 5].map((n) => (
              <button
                key={n}
                onClick={() => setMaxDepth(n)}
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
        <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-purple-300">
          {t("common.premium")}
        </span>
      </div>

      {/* Progress */}
      {(status === "crawling" || status === "paused") && (
        <div className="rounded-lg border border-purple-800/30 bg-purple-950/20 p-3 sm:p-4">
          <div className="flex items-center gap-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
            <span className="min-w-0 truncate text-sm text-slate-300">
              {status === "paused" ? t("deepAnalyzer.resuming") : `${t("deepAnalyzer.crawling").replace("…", "")} ${url}…`}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded-md bg-slate-800/40 px-2.5 py-2 text-center">
              <p className="text-base font-bold text-purple-300">{crawled}</p>
              <p className="text-[10px] text-slate-500">{t("deepAnalyzer.crawled")}</p>
            </div>
            <div className="rounded-md bg-slate-800/40 px-2.5 py-2 text-center">
              <p className="text-base font-bold text-slate-300">{discovered}</p>
              <p className="text-[10px] text-slate-500">{t("deepAnalyzer.discovered")}</p>
            </div>
            <div className="rounded-md bg-slate-800/40 px-2.5 py-2 text-center">
              <p className="text-base font-bold text-red-300">{errors}</p>
              <p className="text-[10px] text-slate-500">{t("common.errors")}</p>
            </div>
          </div>
          {crawled > 0 && (
            <div className="mt-2">
              <div className="h-1.5 rounded-full bg-slate-800">
                <div
                  className="h-1.5 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all"
                  style={{ width: `${Math.min((crawled / maxPages) * 100, 100)}%` }}
                />
              </div>
              <p className="mt-1 text-right text-[10px] text-slate-500">
                {t("deepAnalyzer.maxLabel", { crawled, max: maxPages })}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Error */}
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

      {/* Complete */}
      {status === "completed" && pages.length > 0 && (
        <div className="rounded-lg border border-green-800/40 bg-green-950/20 p-3 sm:p-4">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-400" />
            <p className="text-sm font-medium text-green-400">
              {t("deepAnalyzer.crawlComplete")} — {t("deepAnalyzer.pagesCount", { count: pages.length })}
            </p>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {Object.entries(
              pages.reduce(
                (acc, p) => {
                  const tp = p.pageTypeGuess ?? "other";
                  acc[tp] = (acc[tp] ?? 0) + 1;
                  return acc;
                },
                {} as Record<string, number>,
              ),
            ).map(([type, count]) => (
              <span
                key={type}
                className="rounded-full bg-green-900/40 px-2 py-0.5 text-[10px] font-medium text-green-300/80"
              >
                {count} {type}
              </span>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-3 w-3 animate-spin rounded-full border border-slate-600 border-t-slate-300" />
            <p className="text-[11px] text-slate-500">{t("deepAnalyzer.redirecting")}</p>
          </div>
        </div>
      )}
    </div>
  );
}
