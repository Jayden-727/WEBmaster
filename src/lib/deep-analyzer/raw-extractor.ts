import * as cheerio from "cheerio";
import type { CrawledPage, CrawledPageTech, CrawlStrategyUsed } from "@/types/deep-analysis";
import { detectStack } from "@/lib/stack-detection/detect-stack";

interface RawExtractionResult {
  title: string | null;
  rawMetadata: Record<string, string | null>;
  rawHeadings: { level: number; text: string }[];
  rawLinks: { href: string; text: string; isInternal: boolean }[];
  rawImages: { src: string; alt: string }[];
  rawTextPreview: string;
  detectedTech: CrawledPageTech[];
}

export function extractRawPageData(
  html: string,
  pageUrl: string,
  rootDomain: string,
): RawExtractionResult {
  const $ = cheerio.load(html);

  const title =
    $("title").first().text().trim() ||
    $('meta[property="og:title"]').attr("content")?.trim() ||
    null;

  const rawMetadata: Record<string, string | null> = {
    title,
    description: $('meta[name="description"]').attr("content") ?? null,
    canonical: $('link[rel="canonical"]').attr("href") ?? null,
    ogTitle: $('meta[property="og:title"]').attr("content") ?? null,
    ogDescription: $('meta[property="og:description"]').attr("content") ?? null,
    ogImage: $('meta[property="og:image"]').attr("content") ?? null,
    robots: $('meta[name="robots"]').attr("content") ?? null,
    language: $("html").attr("lang") ?? null,
    charset:
      $("meta[charset]").attr("charset") ??
      $('meta[http-equiv="Content-Type"]').attr("content") ??
      null,
  };

  const rawHeadings: { level: number; text: string }[] = [];
  $("h1, h2, h3, h4, h5, h6").each((_, el) => {
    const tag = (el as unknown as { tagName: string }).tagName.toLowerCase();
    const level = parseInt(tag.charAt(1), 10);
    const text = $(el).text().trim();
    if (text) rawHeadings.push({ level, text });
  });

  const rawLinks: RawExtractionResult["rawLinks"] = [];
  const seenHrefs = new Set<string>();
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const text = $(el).text().trim();
    if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;

    let resolved = href;
    try {
      resolved = new URL(href, pageUrl).href;
    } catch {
      return;
    }

    if (seenHrefs.has(resolved)) return;
    seenHrefs.add(resolved);

    let isInternal = false;
    try {
      isInternal = new URL(resolved).hostname.endsWith(rootDomain);
    } catch {}

    rawLinks.push({ href: resolved, text: text.slice(0, 200), isInternal });
  });

  const rawImages: { src: string; alt: string }[] = [];
  $("img[src]").each((_, el) => {
    const src = $(el).attr("src") ?? "";
    if (!src) return;
    let resolved = src;
    try {
      resolved = new URL(src, pageUrl).href;
    } catch {}
    rawImages.push({ src: resolved, alt: $(el).attr("alt") ?? "" });
  });

  $("script, style, noscript, svg, nav, footer, header").remove();
  const bodyText = $("body").text().replace(/\s+/g, " ").trim();
  const rawTextPreview = bodyText.slice(0, 500);

  const stackResults = detectStack(html);
  const detectedTech: CrawledPageTech[] = stackResults.map((s) => ({
    name: s.detectedTool,
    category: s.category,
    confidence: s.confidence,
    description: s.description,
    matchedSignals: s.matchedSignals,
  }));

  return { title, rawMetadata, rawHeadings, rawLinks, rawImages, rawTextPreview, detectedTech };
}

export interface BuildPageMeta {
  crawlStrategy?: CrawlStrategyUsed;
  contentScore?: number;
  finalUrl?: string;
  cookieBannerHandled?: boolean;
}

export function buildCrawledPage(
  url: string,
  parentUrl: string | null,
  depth: number,
  html: string,
  rootDomain: string,
  pageTypeGuess: string | null,
  meta?: BuildPageMeta,
): CrawledPage {
  try {
    const raw = extractRawPageData(html, url, rootDomain);
    return {
      url,
      parentUrl,
      depth,
      title: raw.title,
      status: "success",
      rawMetadata: raw.rawMetadata,
      rawHeadings: raw.rawHeadings,
      rawLinks: raw.rawLinks,
      rawImages: raw.rawImages,
      rawTextPreview: raw.rawTextPreview,
      pageTypeGuess,
      detectedTech: raw.detectedTech,
      crawlStrategy: meta?.crawlStrategy,
      contentScore: meta?.contentScore,
      finalUrl: meta?.finalUrl,
      cookieBannerHandled: meta?.cookieBannerHandled,
      crawledAt: new Date().toISOString(),
    };
  } catch (err) {
    return {
      url,
      parentUrl,
      depth,
      title: null,
      status: "error",
      rawMetadata: {},
      rawHeadings: [],
      rawLinks: [],
      rawImages: [],
      rawTextPreview: "",
      pageTypeGuess: null,
      crawlStrategy: meta?.crawlStrategy,
      contentScore: meta?.contentScore,
      error: err instanceof Error ? err.message : String(err),
      crawledAt: new Date().toISOString(),
    };
  }
}
