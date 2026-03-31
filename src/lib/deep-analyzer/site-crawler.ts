import type { QueueItem, CrawledPage, CrawlStreamEvent, CrawlMode, CrawlStrategyPreference } from "@/types/deep-analysis";
import { buildCrawledPage } from "./raw-extractor";
import { detectPageType } from "./page-type-detector";
import { smartFetch } from "./smart-fetcher";

const SKIP_EXTENSIONS = /\.(css|js|json|xml|png|jpe?g|gif|svg|webp|ico|woff2?|ttf|eot|pdf|zip|tar|gz|mp[34]|avi|mov|wmv)$/i;
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
    let path = new URL(url).pathname;
    if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
    return path;
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

function isInternalUrl(href: string, rootDomain: string): boolean {
  try {
    return new URL(href).hostname.endsWith(rootDomain);
  } catch {
    return false;
  }
}

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
        for (const link of crawledPage.rawLinks) {
          if (!link.isInternal) continue;
          const normLink = normalizeUrl(link.href);
          if (visited.has(normLink)) continue;
          if (shouldSkipUrl(normLink)) continue;
          if (!isWithinPathScope(normLink, pathPrefix)) continue;
          if (item.depth + 1 > effectiveDepth) continue;

          queue.push({
            url: normLink,
            parentUrl: normalized,
            depth: item.depth + 1,
          });

          yield { type: "discovered", url: normLink, depth: item.depth + 1 };
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
