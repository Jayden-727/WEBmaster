import { scoreContent, CONTENT_ADEQUATE_THRESHOLD } from "./content-checker";
import { isRendererAvailable, renderPage } from "./page-renderer";
import type { CrawlStrategyUsed, CrawlStrategyPreference } from "@/types/deep-analysis";

export interface SmartFetchResult {
  url: string;
  finalUrl: string;
  html: string;
  strategyUsed: "fetch" | "playwright" | "fallback";
  strategy: CrawlStrategyUsed; // keep for backward compatibility
  contentScore: number;
  cookieBannerHandled: boolean;
  error?: string | null;
  warnings?: string[];
  statusCode?: number;
}

const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
};

const HTTP_TIMEOUT = 15_000;

async function httpFetch(
  url: string,
): Promise<{ html: string; finalUrl: string; error: string | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HTTP_TIMEOUT);

  try {
    const res = await fetch(url, {
      headers: BROWSER_HEADERS,
      signal: controller.signal,
      redirect: "follow",
      cache: "no-store",
    });

    const finalUrl = res.url || url;

    if (!res.ok) {
      return { html: "", finalUrl, error: `HTTP ${res.status}` };
    }

    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("text/html") && !ct.includes("application/xhtml") && !ct.includes("text/plain")) {
      return { html: "", finalUrl, error: `Not HTML (${ct.split(";")[0]})` };
    }

    const html = await res.text();
    return { html, finalUrl, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { html: "", finalUrl: url, error: msg };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * "fetch" mode  — fast HTTP-only, no rendering overhead.
 * "strong" mode — HTTP fetch first, then auto-render fallback if content is incomplete.
 */
export async function smartFetch(
  url: string,
  preference: CrawlStrategyPreference = "fetch",
): Promise<SmartFetchResult> {
  const errors: string[] = [];

  if (preference === "strong") {
    const available = await isRendererAvailable();
    if (available) {
      try {
        const result = await renderPage(url);
        const content = scoreContent(result.html);
        if (result.html && result.html.length > 1000) {
          return {
            url,
            html: result.html,
            finalUrl: result.finalUrl,
            strategyUsed: "playwright",
            strategy: "rendered",
            contentScore: content.score,
            cookieBannerHandled: result.cookieBannerHandled,
            warnings: result.errors,
          };
        } else {
          errors.push("Rendered HTML was empty or too small");
        }
      } catch (err) {
        errors.push(`Render: ${err instanceof Error ? err.message : String(err)}`);
      }
    } else {
      errors.push("Renderer not available");
    }

    // Fall back to fetch if rendering fails
    const fetchRes = await httpFetch(url);
    if (fetchRes.error) {
      errors.push(`Fetch fallback: ${fetchRes.error}`);
      return {
        url,
        finalUrl: fetchRes.finalUrl,
        html: "",
        strategyUsed: "fallback",
        strategy: "fallback-rendered",
        contentScore: 0,
        cookieBannerHandled: false,
        error: `Strong mode failed rendering and fetch: ${errors.join(" → ")}`,
        warnings: errors,
      };
    }
    const content = scoreContent(fetchRes.html);
    return {
      url,
      html: fetchRes.html,
      finalUrl: fetchRes.finalUrl,
      strategyUsed: "fetch",
      strategy: "fetch",
      contentScore: content.score,
      cookieBannerHandled: false,
      warnings: errors,
    };
  }

  // preference === "fetch"
  const fetchRes = await httpFetch(url);
  if (fetchRes.error) {
    return {
      url,
      finalUrl: fetchRes.finalUrl,
      html: "",
      strategyUsed: "fetch",
      strategy: "fetch",
      contentScore: 0,
      cookieBannerHandled: false,
      error: fetchRes.error,
      warnings: [`Fetch: ${fetchRes.error}`],
    };
  }
  const content = scoreContent(fetchRes.html);
  return {
    url,
    html: fetchRes.html,
    finalUrl: fetchRes.finalUrl,
    strategyUsed: "fetch",
    strategy: "fetch",
    contentScore: content.score,
    cookieBannerHandled: false,
    warnings: [],
  };
}
