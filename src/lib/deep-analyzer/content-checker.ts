import * as cheerio from "cheerio";

export interface ContentScore {
  score: number;
  hasTitle: boolean;
  hasDescription: boolean;
  headingCount: number;
  internalLinkCount: number;
  bodyTextLength: number;
  isLikelyShell: boolean;
}

const SHELL_INDICATORS = [
  /<div\s+id=["'](?:root|app|__next|__nuxt)["']\s*>\s*<\/div>/i,
  /noscript.*enable javascript/i,
  /loading\.\.\./i,
];

const FRAMEWORK_SHELL_PATTERNS = [
  /<script[^>]*(?:_next|__NEXT|_nuxt|__NUXT|chunk|bundle|main|app)\b[^>]*>/i,
];

/**
 * Scores how "complete" the HTML content looks.
 * Returns 0–1 where 1 = fully populated page, 0 = empty shell.
 */
export function scoreContent(html: string): ContentScore {
  const $ = cheerio.load(html);

  const title = $("title").first().text().trim();
  const hasTitle = title.length > 2;

  const descContent = $('meta[name="description"]').attr("content") ?? "";
  const hasDescription = descContent.length > 10;

  let headingCount = 0;
  $("h1, h2, h3, h4, h5, h6").each((_, el) => {
    if ($(el).text().trim().length > 0) headingCount++;
  });

  let internalLinkCount = 0;
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    if (href && !href.startsWith("#") && !href.startsWith("javascript:") && !href.startsWith("mailto:")) {
      internalLinkCount++;
    }
  });

  $("script, style, noscript, svg").remove();
  const bodyText = $("body").text().replace(/\s+/g, " ").trim();
  const bodyTextLength = bodyText.length;

  let isLikelyShell = false;
  for (const pattern of SHELL_INDICATORS) {
    if (pattern.test(html)) {
      isLikelyShell = true;
      break;
    }
  }

  const hasFrameworkShell = FRAMEWORK_SHELL_PATTERNS.some((p) => p.test(html));
  if (hasFrameworkShell && bodyTextLength < 200 && headingCount === 0) {
    isLikelyShell = true;
  }

  let score = 0;
  if (hasTitle) score += 0.15;
  if (hasDescription) score += 0.1;
  score += Math.min(headingCount / 5, 1) * 0.2;
  score += Math.min(internalLinkCount / 10, 1) * 0.2;
  score += Math.min(bodyTextLength / 500, 1) * 0.35;

  if (isLikelyShell && score > 0.3) {
    score *= 0.5;
  }

  return {
    score: Math.round(score * 100) / 100,
    hasTitle,
    hasDescription,
    headingCount,
    internalLinkCount,
    bodyTextLength,
    isLikelyShell,
  };
}

export const CONTENT_ADEQUATE_THRESHOLD = 0.35;
