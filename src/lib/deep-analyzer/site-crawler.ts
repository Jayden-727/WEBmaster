import type { QueueItem, CrawledPage, CrawlStreamEvent, CrawlMode, CrawlStrategyPreference } from "@/types/deep-analysis";
import { buildCrawledPage } from "./raw-extractor";
import { detectPageType } from "./page-type-detector";
import { smartFetch } from "./smart-fetcher";
import { normalizeCrawlUrl, isLikelyPageUrl } from "./link-extractor";

const PAUSE_BUFFER_MS = 5_000;
const MAX_ABSOLUTE_PAGES = 10_000;

export function extractDomain(url: string): string {
  try {
    const host = new URL(url).hostname;
    const parts = host.split(".");
    return parts.length > 2 ? parts.slice(-2).join(".") : host;
  } catch {
    return "";
  }
}

export function extractPathPrefix(url: string): string {
  try {
    const u = new URL(url);
    let path = u.pathname;
    
    // Split into segments
    const segments = path.split("/");
    const lastSegment = segments[segments.length - 1];
    
    // If last segment contains a dot (e.g. index.do, index.html), remove it to get directory path
    if (lastSegment && lastSegment.includes(".")) {
      segments.pop();
      path = segments.join("/");
    }
    
    if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
    if (!path.startsWith("/")) path = "/" + path;
    return path || "/";
  } catch {
    return "/";
  }
}

export function isWithinPathScope(href: string, allowedPathPrefix: string): boolean {
  if (allowedPathPrefix === "/") return true;
  try {
    let path = new URL(href).pathname;
    if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
    return path === allowedPathPrefix || path.startsWith(allowedPathPrefix + "/");
  } catch {
    return false;
  }
}

export function isInternalUrl(href: string, rootDomain: string): boolean {
  try {
    const hrefHost = new URL(href).hostname.replace(/^www\./i, "");
    const rootHost = rootDomain.replace(/^www\./i, "");
    return hrefHost.endsWith(rootHost);
  } catch {
    return false;
  }
}

export function shouldSkipUrl(href: string): boolean {
  return !isLikelyPageUrl(href);
}

export function normalizeUrl(href: string, baseUrl?: string): string {
  return normalizeCrawlUrl(href, baseUrl || href) ?? href;
}

export interface CrawlOptions {
  rootUrl: string;
  mode: CrawlMode;
  maxPages: number;
  maxDepth: number;
  crawlStrategy?: CrawlStrategyPreference;
  initialQueue?: QueueItem[];
  initialVisited?: string[];
  initialPagesCrawled?: number;
  deadlineMs?: number;
}

function resolvePageLimit(mode: CrawlMode, maxPages: number): number {
  if (mode === "max") return MAX_ABSOLUTE_PAGES;
  return maxPages;
}

export async function* crawlSite(
  opts: CrawlOptions,
): AsyncGenerator<CrawlStreamEvent> {
  const {
    rootUrl,
    mode,
    maxPages,
    maxDepth,
    crawlStrategy: strategyPref = "fetch",
    initialQueue,
    initialVisited,
    initialPagesCrawled = 0,
    deadlineMs = 55_000,
  } = opts;

  const effectiveLimit = resolvePageLimit(mode, maxPages);
  const effectiveDepth = mode === "max" ? Math.max(maxDepth, 10) : maxDepth;

  const domain = extractDomain(rootUrl);
  const pathPrefix = extractPathPrefix(rootUrl);
  const jobId = crypto.randomUUID();
  const startTime = Date.now();

  const visited = new Set<string>(initialVisited ?? []);
  const queue: QueueItem[] =
    initialQueue && initialQueue.length > 0
      ? [...initialQueue]
      : [{ url: normalizeUrl(rootUrl), parentUrl: null, depth: 0 }];

  let pagesCrawled = initialPagesCrawled;
  let totalErrors = 0;

  if (!initialQueue) {
    yield { type: "started", jobId, rootUrl };
  }

  while (queue.length > 0 && pagesCrawled < effectiveLimit) {
    if (Date.now() - startTime > deadlineMs - PAUSE_BUFFER_MS) {
      yield {
        type: "paused",
        queue: [...queue],
        visited: [...visited],
        pagesCrawled,
      };
      return;
    }

    const item = queue.shift()!;
    const normalized = normalizeUrl(item.url);

    if (visited.has(normalized)) continue;
    if (item.depth > effectiveDepth) continue;
    if (shouldSkipUrl(normalized)) continue;
    if (!isInternalUrl(normalized, domain)) continue;
    if (!isWithinPathScope(normalized, pathPrefix)) continue;

    visited.add(normalized);
    try {
      const fetchResult = await smartFetch(normalized, strategyPref);
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
        domain,
        pageType,
        {
          crawlStrategy: fetchResult.strategy,
          contentScore: fetchResult.contentScore,
          finalUrl: fetchResult.finalUrl !== normalized ? fetchResult.finalUrl : undefined,
          cookieBannerHandled: fetchResult.cookieBannerHandled || undefined,
        },
      );

      const refinedType = detectPageType({
        url: normalized,
        title: crawledPage.title,
        headings: crawledPage.rawHeadings,
        textPreview: crawledPage.rawTextPreview,
      });
      crawledPage.pageTypeGuess = refinedType;

      pagesCrawled++;
      yield { type: "page", page: crawledPage };

      if (pagesCrawled < effectiveLimit) {
        let extractedCount = crawledPage.rawLinks.length;
        let internalCount = 0;
        let enqueuedCount = 0;
        let skippedExternal = 0;
        let skippedAsset = 0;
        let skippedDuplicate = 0;
        let skippedDepth = 0;
        let skippedScope = 0;

        const sourceCounts: Record<string, number> = {};
        const newItems: QueueItem[] = [];

        for (const link of crawledPage.rawLinks) {
          const linkSrc = link.source || "unknown";
          sourceCounts[linkSrc] = (sourceCounts[linkSrc] || 0) + 1;

          if (!link.isInternal) {
            skippedExternal++;
            continue;
          }
          internalCount++;
          const normLink = normalizeUrl(link.href, normalized);

          if (visited.has(normLink)) {
            skippedDuplicate++;
            continue;
          }
          if (queue.some(q => normalizeUrl(q.url, normalized) === normLink) || newItems.some(n => normalizeUrl(n.url, normalized) === normLink)) {
            skippedDuplicate++;
            continue;
          }
          if (shouldSkipUrl(normLink)) {
            skippedAsset++;
            continue;
          }
          if (!isWithinPathScope(normLink, pathPrefix)) {
            skippedScope++;
            continue;
          }
          if (item.depth + 1 > effectiveDepth) {
            skippedDepth++;
            continue;
          }

          newItems.push({
            url: normLink,
            parentUrl: normalized,
            depth: item.depth + 1,
            isPriority: link.isPriority,
            priority: link.priority,
          } as any);
          enqueuedCount++;
        }

        if (newItems.length > 0) {
          queue.push(...newItems);
          queue.sort((a: any, b: any) => {
            if (a.depth !== b.depth) return a.depth - b.depth;
            const aPri = a.priority ?? 0;
            const bPri = b.priority ?? 0;
            return bPri - aPri;
          });

          for (const newItem of newItems) {
            yield { type: "discovered", url: newItem.url, depth: newItem.depth };
          }
        }

        if (process.env.NODE_ENV === "development") {
          console.log(`[DeepAnalyzer] URL: ${normalized}`);
          console.log(`[DeepAnalyzer] Links Extracted Total: ${extractedCount}`);
          Object.entries(sourceCounts).forEach(([src, count]) => {
            console.log(`  - ${src}: ${count}`);
          });
          console.log(`[DeepAnalyzer] internal links: ${internalCount}`);
          console.log(`[DeepAnalyzer] enqueued links: ${enqueuedCount}`);
          console.log(`[DeepAnalyzer] skipped external: ${skippedExternal}`);
          console.log(`[DeepAnalyzer] skipped asset: ${skippedAsset}`);
          console.log(`[DeepAnalyzer] skipped duplicate: ${skippedDuplicate}`);
          console.log(`[DeepAnalyzer] skipped depth: ${skippedDepth}`);
          console.log(`[DeepAnalyzer] skipped scope: ${skippedScope}`);
        }

        // Sitemap fallback if it's the seed page (depth 0) and we didn't discover enough links
        if (item.depth === 0 && queue.length < 5) {
          if (process.env.NODE_ENV === "development") {
            console.log(`[DeepAnalyzer] Low link count (${queue.length}) on seed page. Triggering sitemap fallback...`);
          }
          try {
            const { fetchSitemapLinks } = await import("./sitemap-extractor");
            const sitemapLinks = await fetchSitemapLinks(rootUrl, domain);
            let sitemapEnqueued = 0;
            const sitemapNewItems: QueueItem[] = [];

            for (const sUrl of sitemapLinks) {
              const normSUrl = normalizeUrl(sUrl, rootUrl);
              if (visited.has(normSUrl)) continue;
              if (queue.some(q => normalizeUrl(q.url, rootUrl) === normSUrl) || sitemapNewItems.some(n => normalizeUrl(n.url, rootUrl) === normSUrl)) continue;
              if (shouldSkipUrl(normSUrl)) continue;
              if (!isWithinPathScope(normSUrl, pathPrefix)) continue;
              
              sitemapNewItems.push({
                url: normSUrl,
                parentUrl: normalized,
                depth: 1,
                isPriority: false,
                priority: 80,
              } as any);
              sitemapEnqueued++;
            }

            if (sitemapNewItems.length > 0) {
              queue.push(...sitemapNewItems);
              queue.sort((a: any, b: any) => {
                if (a.depth !== b.depth) return a.depth - b.depth;
                const aPri = a.priority ?? 0;
                const bPri = b.priority ?? 0;
                return bPri - aPri;
              });

              for (const sItem of sitemapNewItems) {
                yield { type: "discovered", url: sItem.url, depth: sItem.depth };
              }
            }
            if (process.env.NODE_ENV === "development") {
              console.log(`[DeepAnalyzer] Sitemap fallback added ${sitemapEnqueued} links to queue.`);
            }
          } catch (smErr) {
            if (process.env.NODE_ENV === "development") {
              console.error("[DeepAnalyzer] Sitemap fallback error:", smErr);
            }
          }
        }
      }
    } catch (err) {
      totalErrors++;
      yield {
        type: "error",
        url: normalized,
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  yield { type: "completed", totalPages: pagesCrawled, totalErrors };
}
