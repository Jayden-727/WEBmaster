import type { QueueItem, CrawledPage, CrawlMode, CrawlStrategyPreference } from "@/types/deep-analysis";
import { buildCrawledPage } from "./raw-extractor";
import { detectPageType } from "./page-type-detector";
import { isWithinPathScope } from "./site-crawler";
import { smartFetch } from "./smart-fetcher";

const SKIP_EXTENSIONS = /\.(css|js|json|xml|png|jpe?g|gif|svg|webp|ico|woff2?|ttf|eot|pdf|zip|tar|gz|mp[34]|avi|mov|wmv)$/i;
const MAX_ABSOLUTE_PAGES = 10_000;

function shouldSkipUrl(href: string): boolean {
  if (SKIP_EXTENSIONS.test(href)) return true;
  try {
    const u = new URL(href);
    if (u.protocol !== "http:" && u.protocol !== "https:") return true;
  } catch {
    return true;
  }
  return false;
}

function isInternalUrl(href: string, rootDomain: string): boolean {
  try {
    return new URL(href).hostname.endsWith(rootDomain);
  } catch {
    return false;
  }
}

function normalizeUrl(href: string): string {
  try {
    const u = new URL(href);
    u.hash = "";
    u.search = "";
    let path = u.pathname;
    if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
    u.pathname = path;
    return u.href;
  } catch {
    return href;
  }
}

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
        for (const link of crawledPage.rawLinks) {
          if (!link.isInternal) continue;
          const normLink = normalizeUrl(link.href);
          if (visited.has(normLink)) continue;
          if (shouldSkipUrl(normLink)) continue;
          if (!isWithinPathScope(normLink, opts.allowedPathPrefix)) continue;
          if (item.depth + 1 > effectiveDepth) continue;

          queue.push({
            url: normLink,
            parentUrl: normalized,
            depth: item.depth + 1,
          });
          newDiscovered++;
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
