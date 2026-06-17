import type { QueueItem, CrawledPage, CrawlStreamEvent, CrawlMode, CrawlStrategyPreference } from "@/types/deep-analysis";
import { buildCrawledPage } from "./raw-extractor";
import { detectPageType } from "./page-type-detector";
import { smartFetch } from "./smart-fetcher";
import { normalizeCrawlUrl, isLikelyPageUrl } from "./link-extractor";

const PAUSE_BUFFER_MS = 5_000;
const MAX_ABSOLUTE_PAGES = 10_000;

export async function verifyUrlHeader(url: string): Promise<{ valid: boolean; finalUrl?: string }> {
  const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
  try {
    const res = await fetch(url, {
      method: "HEAD",
      headers: { "User-Agent": userAgent },
      redirect: "follow"
    });
    if (res.status >= 200 && res.status < 400) {
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("html")) {
        return { valid: true, finalUrl: res.url || url };
      }
    }
  } catch {}
  
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { "User-Agent": userAgent },
      redirect: "follow"
    });
    if (res.status >= 200 && res.status < 400) {
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("html")) {
        return { valid: true, finalUrl: res.url || url };
      }
    }
  } catch {}
  
  return { valid: false };
}

export async function verifyAndEnqueueHanonGuesses(params: {
  normalized: string;
  pathPrefix: string;
  rootUrl: string;
  visited: Set<string>;
  queue: QueueItem[];
}): Promise<string[]> {
  const { normalized, pathPrefix, rootUrl, visited, queue } = params;
  const enqueuedUrls: string[] = [];
  const candidates = [
    "/KR/Company",
    "/KR/Company/CorporateDirection",
    "/KR/Company/History",
    "/KR/Company/GlobalNetwork",
    "/KR/Company/Ethics",
    "/KR/Solutions",
    "/KR/Solutions/SoftwareDefinedThermalManagementSystems",
    "/KR/Solutions/NaturalRefrigerantTechnologies",
    "/KR/Solutions/HeatPumpSystemsAndModules",
    "/KR/Solutions/Compressors",
    "/KR/Solutions/HeatExchangers",
    "/KR/Solutions/FluidTransportPumpSystems",
    "/KR/Solutions/FuelCellEV",
    "/KR/Investors",
    "/KR/Investors/GeneralInformation",
    "/KR/Investors/Presentations",
    "/KR/Investors/Reports",
    "/KR/Investors/Notices",
    "/KR/Investors/IRContacts",
    "/KR/Sustainability",
    "/KR/Sustainability/ApproachAndPhilosophy",
    "/KR/Sustainability/CarbonNeutral",
    "/KR/Media",
    "/KR/Media/NewsReleases",
    "/KR/Media/Videos",
    "/KR/Media/Recognition",
    "/KR/Suppliers",
    "/KR/Suppliers/SupplierPartnership",
    "/KR/Sitemap",
    "/KR/PrivacyPolicy",
    "/KR/Ethics",
  ];

  const addedUrls = new Set<string>();

  for (const candidate of candidates) {
    const fullUrl = new URL(candidate, rootUrl).toString();
    const norm = normalizeCrawlUrl(fullUrl, rootUrl) ?? fullUrl;
    if (visited.has(norm)) continue;
    if (queue.some(q => (normalizeCrawlUrl(q.url, rootUrl) ?? q.url) === norm) || addedUrls.has(norm)) continue;
    if (!isWithinPathScope(norm, pathPrefix)) continue;

    const { valid, finalUrl } = await verifyUrlHeader(norm);
    if (valid) {
      const targetUrl = finalUrl ? (normalizeCrawlUrl(finalUrl, rootUrl) ?? finalUrl) : norm;
      if (visited.has(targetUrl)) continue;
      if (queue.some(q => (normalizeCrawlUrl(q.url, rootUrl) ?? q.url) === targetUrl) || addedUrls.has(targetUrl)) continue;
      if (!isWithinPathScope(targetUrl, pathPrefix)) continue;

      queue.push({
        url: targetUrl,
        parentUrl: normalized,
        depth: 1,
        isPriority: false,
        priority: 20,
      } as any);
      addedUrls.add(targetUrl);
      enqueuedUrls.push(targetUrl);
    }
  }

  if (enqueuedUrls.length > 0) {
    queue.sort((a: any, b: any) => {
      if (a.depth !== b.depth) return a.depth - b.depth;
      const aPri = a.priority ?? 0;
      const bPri = b.priority ?? 0;
      return bPri - aPri;
    });
  }

  return enqueuedUrls;
}

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
  if (!allowedPathPrefix || allowedPathPrefix === "/") return true;
  try {
    const normHrefPath = new URL(href).pathname.toLowerCase().replace(/\/$/, "");
    const normAllowedPrefix = allowedPathPrefix.toLowerCase().replace(/\/$/, "");
    
    return normHrefPath === normAllowedPrefix || normHrefPath.startsWith(normAllowedPrefix + "/");
  } catch {
    return false;
  }
}

export function isInternalUrl(href: string, rootDomain: string): boolean {
  try {
    const hrefHost = new URL(href).hostname.toLowerCase().replace(/^www\./i, "");
    const rootHost = rootDomain.toLowerCase().replace(/^www\./i, "");
    return hrefHost === rootHost || hrefHost.endsWith("." + rootHost);
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
        pathPrefix,
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
        // Hanon Systems route guess fallback if it's the seed page and we still don't have enough links
        if (item.depth === 0 && queue.length < 5 && domain.toLowerCase().includes("hanonsystems")) {
          if (process.env.NODE_ENV === "development") {
            console.log(`[DeepAnalyzer] Low link count (${queue.length}) on seed page for Hanon. Triggering route guesses fallback...`);
          }
          try {
            const hanonNewUrls = await verifyAndEnqueueHanonGuesses({
              normalized,
              pathPrefix,
              rootUrl,
              visited,
              queue,
            });
            for (const hUrl of hanonNewUrls) {
              yield { type: "discovered", url: hUrl, depth: 1 };
            }
            if (process.env.NODE_ENV === "development") {
              console.log(`[DeepAnalyzer] Hanon route guesses added ${hanonNewUrls.length} links to queue.`);
            }
          } catch (guessErr) {
            if (process.env.NODE_ENV === "development") {
              console.error("[DeepAnalyzer] Hanon route guesses error:", guessErr);
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
