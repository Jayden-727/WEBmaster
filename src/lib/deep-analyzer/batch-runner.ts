import type { QueueItem, CrawledPage, CrawlMode } from "@/types/deep-analysis";
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

export interface BatchOptions {
  jobId: string;
  rootDomain: string;
  mode: CrawlMode;
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

    visited.add(normalized);
    lastProcessedUrl = normalized;

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
        opts.rootDomain,
        pageType,
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
