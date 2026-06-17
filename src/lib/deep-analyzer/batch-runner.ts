import type { QueueItem, CrawledPage, CrawlMode, CrawlStrategyPreference } from "@/types/deep-analysis";
import { buildCrawledPage } from "./raw-extractor";
import { detectPageType } from "./page-type-detector";
import { isWithinPathScope, normalizeUrl, shouldSkipUrl, isInternalUrl, verifyAndEnqueueHanonGuesses } from "./site-crawler";
import { smartFetch } from "./smart-fetcher";

const MAX_ABSOLUTE_PAGES = 10_000;

export interface BatchOptions {
  jobId: string;
  rootDomain: string;
  allowedPathPrefix: string;
  mode: CrawlMode;
  crawlStrategy: CrawlStrategyPreference;
  maxPages: number;
  maxDepth: number;
  queue: QueueItem[];
  visited: Set<string>;
  pagesCrawled: number;
  deadlineMs: number;
  onPage: (page: CrawledPage) => Promise<void>;
  onError: (url: string, parentUrl: string | null, depth: number, message: string) => Promise<void>;
}

export interface BatchResult {
  pagesProcessed: number;
  pagesSuccess: number;
  pagesFailed: number;
  newDiscovered: number;
  remainingQueue: QueueItem[];
  visited: Set<string>;
  lastProcessedUrl: string | null;
  lastError: string | null;
}

export async function runBatch(opts: BatchOptions): Promise<BatchResult> {
  const {
    mode,
    maxPages,
    maxDepth,
    queue,
    visited,
    deadlineMs,
    onPage,
    onError,
  } = opts;

  const effectiveLimit = mode === "max" ? MAX_ABSOLUTE_PAGES : maxPages;
  const effectiveDepth = mode === "max" ? Math.max(maxDepth, 10) : maxDepth;

  let pagesCrawled = opts.pagesCrawled;
  const startTime = Date.now();
  let pagesProcessed = 0;
  let pagesSuccess = 0;
  let pagesFailed = 0;
  let newDiscovered = 0;
  let lastProcessedUrl: string | null = null;
  let lastError: string | null = null;

  while (queue.length > 0 && pagesCrawled < effectiveLimit) {
    if (Date.now() - startTime > deadlineMs) break;

    const item = queue.shift()!;
    const normalized = normalizeUrl(item.url);

    if (visited.has(normalized)) continue;
    if (item.depth > effectiveDepth) continue;
    if (shouldSkipUrl(normalized)) continue;
    if (!isInternalUrl(normalized, opts.rootDomain)) continue;
    if (!isWithinPathScope(normalized, opts.allowedPathPrefix)) continue;

    visited.add(normalized);
    lastProcessedUrl = normalized;
    try {
      const fetchResult = await smartFetch(normalized, opts.crawlStrategy);
      if (fetchResult.error) {
        throw new Error(fetchResult.error);
      }

      const pageType = detectPageType({
        url: normalized,
        title: null,
        headings: [],
        textPreview: "",
      });

      const crawledPage = buildCrawledPage(
        normalized,
        item.parentUrl,
        item.depth,
        fetchResult.html,
        opts.rootDomain,
        pageType,
        {
          crawlStrategy: fetchResult.strategy,
          contentScore: fetchResult.contentScore,
          finalUrl: fetchResult.finalUrl !== normalized ? fetchResult.finalUrl : undefined,
          cookieBannerHandled: fetchResult.cookieBannerHandled || undefined,
        },
        opts.allowedPathPrefix,
      );

      const refinedType = detectPageType({
        url: normalized,
        title: crawledPage.title,
        headings: crawledPage.rawHeadings,
        textPreview: crawledPage.rawTextPreview,
      });
      crawledPage.pageTypeGuess = refinedType;

      await onPage(crawledPage);
      pagesCrawled++;
      pagesProcessed++;
      pagesSuccess++;

      if (pagesCrawled < effectiveLimit) {
        let enqueuedCount = 0;
        const newItems: QueueItem[] = [];

        for (const link of crawledPage.rawLinks) {
          if (!link.isInternal) continue;
          const normLink = normalizeUrl(link.href, normalized);

          if (visited.has(normLink)) continue;
          if (queue.some(q => normalizeUrl(q.url, normalized) === normLink) || newItems.some(n => normalizeUrl(n.url, normalized) === normLink)) continue;
          if (shouldSkipUrl(normLink)) continue;
          if (!isWithinPathScope(normLink, opts.allowedPathPrefix)) continue;
          if (item.depth + 1 > effectiveDepth) continue;

          newItems.push({
            url: normLink,
            parentUrl: normalized,
            depth: item.depth + 1,
            isPriority: link.isPriority,
            priority: link.priority,
          } as any);
          enqueuedCount++;
          newDiscovered++;
        }

        if (newItems.length > 0) {
          queue.push(...newItems);
          queue.sort((a: any, b: any) => {
            if (a.depth !== b.depth) return a.depth - b.depth;
            const aPri = a.priority ?? 0;
            const bPri = b.priority ?? 0;
            return bPri - aPri;
          });
        }

        // Sitemap fallback if it's the seed page (depth 0) and we didn't discover enough links
        if (item.depth === 0 && queue.length < 5) {
          try {
            const { fetchSitemapLinks } = await import("./sitemap-extractor");
            const sitemapLinks = await fetchSitemapLinks(normalized, opts.rootDomain);
            const sitemapNewItems: QueueItem[] = [];

            for (const sUrl of sitemapLinks) {
              const normSUrl = normalizeUrl(sUrl, normalized);
              if (visited.has(normSUrl)) continue;
              if (queue.some(q => normalizeUrl(q.url, normalized) === normSUrl) || sitemapNewItems.some(n => normalizeUrl(n.url, normalized) === normSUrl)) continue;
              if (shouldSkipUrl(normSUrl)) continue;
              if (!isWithinPathScope(normSUrl, opts.allowedPathPrefix)) continue;
              
              sitemapNewItems.push({
                url: normSUrl,
                parentUrl: normalized,
                depth: 1,
                isPriority: false,
                priority: 80,
              } as any);
              newDiscovered++;
            }

            if (sitemapNewItems.length > 0) {
              queue.push(...sitemapNewItems);
              queue.sort((a: any, b: any) => {
                if (a.depth !== b.depth) return a.depth - b.depth;
                const aPri = a.priority ?? 0;
                const bPri = b.priority ?? 0;
                return bPri - aPri;
              });
            }
          } catch {}
        }
        // Hanon Systems route guess fallback
        if (item.depth === 0 && queue.length < 5 && opts.rootDomain.toLowerCase().includes("hanonsystems")) {
          try {
            const hanonNewUrls = await verifyAndEnqueueHanonGuesses({
              normalized,
              pathPrefix: opts.allowedPathPrefix,
              rootUrl: normalized,
              visited,
              queue,
            });
            newDiscovered += hanonNewUrls.length;
          } catch {}
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      lastError = msg;
      await onError(normalized, item.parentUrl, item.depth, msg);
      pagesCrawled++;
      pagesProcessed++;
      pagesFailed++;
    }
  }

  return {
    pagesProcessed,
    pagesSuccess,
    pagesFailed,
    newDiscovered,
    remainingQueue: queue,
    visited,
    lastProcessedUrl,
    lastError,
  };
}
