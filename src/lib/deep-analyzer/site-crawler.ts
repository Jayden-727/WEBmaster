import type { QueueItem, CrawledPage, CrawlStreamEvent, CrawlMode } from "@/types/deep-analysis";
import { buildCrawledPage } from "./raw-extractor";
import { detectPageType } from "./page-type-detector";

const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
};

const SKIP_EXTENSIONS = /\.(css|js|json|xml|png|jpe?g|gif|svg|webp|ico|woff2?|ttf|eot|pdf|zip|tar|gz|mp[34]|avi|mov|wmv)$/i;
const PAGE_FETCH_TIMEOUT = 15_000;
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

async function fetchPage(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PAGE_FETCH_TIMEOUT);
  try {
    const res = await fetch(url, {
      headers: BROWSER_HEADERS,
      signal: controller.signal,
      redirect: "follow",
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("text/html") && !ct.includes("application/xhtml")) {
      throw new Error(`Not HTML (${ct.split(";")[0]})`);
    }
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

export interface CrawlOptions {
  rootUrl: string;
  mode: CrawlMode;
  maxPages: number;
  maxDepth: number;
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
      const html = await fetchPage(normalized);

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
        html,
        domain,
        pageType,
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
