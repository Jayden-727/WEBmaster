import { scoreContent, CONTENT_ADEQUATE_THRESHOLD } from "./content-checker";
import { isRendererAvailable, renderPage } from "./page-renderer";
import type { CrawlStrategyUsed, CrawlStrategyPreference } from "@/types/deep-analysis";

export interface SmartFetchResult {
  html: string;
  finalUrl: string;
  strategy: CrawlStrategyUsed;
  contentScore: number;
  cookieBannerHandled: boolean;
  errors: string[];
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

  const fetch1 = await httpFetch(url);

  if (fetch1.error) {
    errors.push(`Fetch: ${fetch1.error}`);

    if (preference === "fetch") {
      throw new Error(fetch1.error);
    }

    return tryRenderFallback(url, errors, "fallback-rendered");
  }

  const content = scoreContent(fetch1.html);

  if (preference === "fetch" || content.score >= CONTENT_ADEQUATE_THRESHOLD) {
    return {
      html: fetch1.html,
      finalUrl: fetch1.finalUrl,
      strategy: "fetch",
      contentScore: content.score,
      cookieBannerHandled: false,
      errors,
    };
  }

  errors.push(
    `Low content score (${content.score}): shell=${content.isLikelyShell}, text=${content.bodyTextLength}b, headings=${content.headingCount}, links=${content.internalLinkCount}`,
  );

  return tryRenderFallback(url, errors, "fallback-rendered", {
    fetchHtml: fetch1.html,
    fetchScore: content.score,
    fetchFinalUrl: fetch1.finalUrl,
  });
}

async function tryRenderFallback(
  url: string,
  errors: string[],
  strategyLabel: CrawlStrategyUsed,
  fetchFallback?: {
    fetchHtml: string;
    fetchScore: number;
    fetchFinalUrl: string;
  },
): Promise<SmartFetchResult> {
  const available = await isRendererAvailable();

  if (available) {
    try {
      const result = await renderPage(url);
      const content = scoreContent(result.html);
      errors.push(...result.errors);

      if (
        fetchFallback &&
        content.score <= fetchFallback.fetchScore &&
        fetchFallback.fetchScore > 0
      ) {
        return {
          html: fetchFallback.fetchHtml,
          finalUrl: fetchFallback.fetchFinalUrl,
          strategy: "fetch",
          contentScore: fetchFallback.fetchScore,
          cookieBannerHandled: false,
          errors,
        };
      }

      return {
        html: result.html,
        finalUrl: result.finalUrl,
        strategy: strategyLabel,
        contentScore: content.score,
        cookieBannerHandled: result.cookieBannerHandled,
        errors,
      };
    } catch (err) {
      errors.push(
        `Render: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  } else {
    errors.push("Renderer not available — using fetch result");
  }

  if (fetchFallback && fetchFallback.fetchHtml) {
    return {
      html: fetchFallback.fetchHtml,
      finalUrl: fetchFallback.fetchFinalUrl,
      strategy: "fetch",
      contentScore: fetchFallback.fetchScore,
      cookieBannerHandled: false,
      errors,
    };
  }

  throw new Error(`All strategies failed: ${errors.join(" → ")}`);
}
