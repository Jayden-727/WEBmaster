import * as cheerio from "cheerio";

export type LinkSource =
  | "gnb"
  | "header"
  | "footer"
  | "quick-link"
  | "family-site"
  | "sitemap-link"
  | "static-anchor"
  | "rendered-anchor"
  | "onclick"
  | "data-attribute"
  | "form-action"
  | "script-pattern"
  | "robots"
  | "sitemap-xml";

export interface ExtractedLink {
  raw: string;
  normalizedUrl: string | null;
  source: LinkSource;
  priority: number;
  text?: string | null;
  selector?: string;
  isInternal: boolean;
  skipReason?: string | null;
}

export function isLikelyPageUrl(url: string): boolean {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    const assetExtensions = [
      ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg",
      ".pdf", ".zip", ".css", ".js", ".woff", ".woff2",
      ".mp4", ".mov", ".avi", ".ico", ".ttf", ".eot"
    ];
    return !assetExtensions.some((ext) => pathname.endsWith(ext));
  } catch {
    return false;
  }
}

export function normalizeCrawlUrl(rawUrl: string, baseUrl: string): string | null {
  if (!rawUrl) return null;
  const cleaned = rawUrl.trim();
  
  if (
    cleaned === "#" ||
    cleaned.startsWith("#") ||
    cleaned.startsWith("javascript:") ||
    cleaned.startsWith("mailto:") ||
    cleaned.startsWith("tel:")
  ) {
    return null;
  }

  try {
    const url = new URL(cleaned, baseUrl);
    url.hash = "";

    // Clean tracking query parameters
    const params = new URLSearchParams();
    const trackingParams = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid"];
    url.searchParams.forEach((val, key) => {
      if (!trackingParams.includes(key.toLowerCase())) {
        params.append(key, val);
      }
    });
    params.sort();
    const searchStr = params.toString();
    url.search = searchStr ? "?" + searchStr : "";

    let path = url.pathname;
    if (path.length > 1 && path.endsWith("/")) {
      path = path.slice(0, -1);
    }
    url.pathname = path;

    return url.toString();
  } catch {
    return null;
  }
}

export function extractUrlsFromScriptLikeText(text: string): string[] {
  if (!text) return [];
  const patterns = [
    /location\.href\s*=\s*['"]([^'"]+)['"]/gi,
    /document\.location\s*=\s*['"]([^'"]+)['"]/gi,
    /location\.replace\(\s*['"]([^'"]+)['"]\s*\)/gi,
    /window\.open\(\s*['"]([^'"]+)['"]/gi,
    /(?:goPage|fnMove|movePage|goUrl|linkTo|fn_go|goMenu|goMenuPage)\(\s*['"]([^'"]+)['"]\s*\)/gi,
    /url\s*:\s*['"]([^'"]+)['"]/gi,
    /href\s*:\s*['"]([^'"]+)['"]/gi,
    /['"]([^'"]*\/(?:KR|EN)\/[^'"]+)['"]/gi,
    /['"]([^'"]+\.(?:do|html|htm|php|aspx|jsp)(?:\?[^'"]*)?)['"]/gi
  ];

  const urls: string[] = [];
  for (const pattern of patterns) {
    let match;
    pattern.lastIndex = 0;
    while ((match = pattern.exec(text)) !== null) {
      if (match[1]) {
        urls.push(match[1]);
      }
    }
  }
  return [...new Set(urls)];
}

function isWithinPathScopeSimple(href: string, allowedPathPrefix: string): boolean {
  if (!allowedPathPrefix || allowedPathPrefix === "/") return true;
  try {
    const normHrefPath = new URL(href).pathname.toLowerCase().replace(/\/$/, "");
    const normAllowedPrefix = allowedPathPrefix.toLowerCase().replace(/\/$/, "");
    
    return normHrefPath === normAllowedPrefix || normHrefPath.startsWith(normAllowedPrefix + "/");
  } catch {
    return false;
  }
}

export function extractLinksFromHtml(params: {
  html: string;
  baseUrl: string;
  rootUrl: string;
  allowedPathPrefix?: string;
  source: "static-html" | "rendered-dom";
}): ExtractedLink[] {
  const { html, baseUrl, rootUrl, allowedPathPrefix = "/", source } = params;
  const $ = cheerio.load(html);
  const rootDomain = new URL(rootUrl).hostname.replace(/^www\./i, "");
  const extractedLinks: ExtractedLink[] = [];
  const seen = new Set<string>();

  const isWithinSelector = (el: any, selectors: string[]): boolean => {
    const parents = $(el).parents();
    for (let i = 0; i < parents.length; i++) {
      const parent = parents[i];
      const tag = parent.tagName?.toLowerCase() || "";
      const id = $(parent).attr("id")?.toLowerCase() || "";
      const className = $(parent).attr("class")?.toLowerCase() || "";

      const match = selectors.some((sel) => {
        if (sel.startsWith(".")) {
          return className.includes(sel.substring(1));
        } else if (sel.startsWith("#")) {
          return id.includes(sel.substring(1));
        } else {
          return tag === sel;
        }
      });
      if (match) return true;
    }
    return false;
  };

  const addLink = (
    rawHref: string,
    linkText: string,
    fallbackSource: LinkSource,
    fallbackPriority: number,
    selector?: string
  ) => {
    if (!rawHref) {
      extractedLinks.push({
        raw: "",
        normalizedUrl: null,
        source: fallbackSource,
        priority: 0,
        text: linkText,
        selector,
        isInternal: false,
        skipReason: "Empty href",
      });
      return;
    }

    const trimmed = rawHref.trim();

    if (trimmed === "#" || trimmed.startsWith("#")) {
      extractedLinks.push({
        raw: trimmed,
        normalizedUrl: null,
        source: fallbackSource,
        priority: 0,
        text: linkText,
        selector,
        isInternal: false,
        skipReason: "Empty/anchor href",
      });
      return;
    }

    if (trimmed.toLowerCase().startsWith("javascript:")) {
      const scriptCode = decodeURIComponent(trimmed.substring(11));
      const scriptUrls = extractUrlsFromScriptLikeText(scriptCode);
      if (scriptUrls.length > 0) {
        for (const u of scriptUrls) {
          addLink(u, linkText, "onclick", 70, selector);
        }
      } else {
        extractedLinks.push({
          raw: trimmed,
          normalizedUrl: null,
          source: "onclick",
          priority: 0,
          text: linkText,
          selector,
          isInternal: false,
          skipReason: "javascript:void(0) or empty script",
        });
      }
      return;
    }

    if (
      trimmed.toLowerCase().startsWith("mailto:") ||
      trimmed.toLowerCase().startsWith("tel:") ||
      trimmed.toLowerCase().startsWith("sms:")
    ) {
      extractedLinks.push({
        raw: trimmed,
        normalizedUrl: null,
        source: fallbackSource,
        priority: 0,
        text: linkText,
        selector,
        isInternal: false,
        skipReason: "Non-http protocol",
      });
      return;
    }

    const norm = normalizeCrawlUrl(trimmed, baseUrl);
    if (!norm) {
      extractedLinks.push({
        raw: trimmed,
        normalizedUrl: null,
        source: fallbackSource,
        priority: 0,
        text: linkText,
        selector,
        isInternal: false,
        skipReason: "Normalization failed",
      });
      return;
    }

    // Domain matching
    let isInternal = false;
    let skipReason: string | null = null;
    try {
      const urlObj = new URL(norm);
      const hrefHost = urlObj.hostname.toLowerCase().replace(/^www\./i, "");
      const rootHost = rootDomain.toLowerCase().replace(/^www\./i, "");
      isInternal = hrefHost === rootHost || hrefHost.endsWith("." + rootHost);
      
      if (!isInternal) {
        skipReason = "External domain";
      } else if (!isLikelyPageUrl(norm)) {
        skipReason = "Asset URL (image/file)";
      } else if (!isWithinPathScopeSimple(norm, allowedPathPrefix)) {
        skipReason = "Out of path scope";
      }
    } catch {
      skipReason = "Invalid URL parse error";
    }

    let linkSource = fallbackSource;
    let priority = isInternal ? fallbackPriority : 0;

    const gnbSelectors = ["header", "nav", "[role=\"navigation\"]", ".gnb", "#gnb", ".global-nav", ".navigation", ".menu", ".main-menu", ".depth1", ".depth2", ".navbar", ".header", ".header-menu", ".lnb", ".snb"];
    const footerSelectors = ["footer", "#footer", ".footer", ".site-footer", ".footer-menu", ".footer-nav", ".quick-link", ".quickLink", ".family-site", ".familySite", ".policy", ".privacy", ".sitemap", ".support", ".customer"];

    if (selector) {
      if (selector === "gnb") {
        linkSource = "gnb";
        priority = isInternal ? 100 : 0;
      } else if (selector === "footer") {
        linkSource = "footer";
        priority = isInternal ? 90 : 0;
      }
    }

    const key = `${norm}::${linkSource}`;
    if (seen.has(key)) return;
    seen.add(key);

    extractedLinks.push({
      raw: trimmed,
      normalizedUrl: norm,
      source: linkSource,
      priority,
      text: linkText.slice(0, 200).trim() || "Auto-detected Link",
      selector,
      isInternal,
      skipReason,
    });
  };

  const defaultAnchorSource: LinkSource = source === "rendered-dom" ? "rendered-anchor" : "static-anchor";

  // 1. Anchors and area tags
  $("a[href], area[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const text = $(el).text().trim();
    
    let selector = "";
    if (isWithinSelector(el, ["header", "nav", "[role=\"navigation\"]", ".gnb", "#gnb", ".global-nav", ".navigation", ".menu", ".main-menu", ".depth1", ".depth2", ".navbar", ".header", ".header-menu", ".lnb", ".snb"])) {
      selector = "gnb";
    } else if (isWithinSelector(el, ["footer", "#footer", ".footer", ".site-footer", ".footer-menu", ".footer-nav", ".quick-link", ".quickLink", ".family-site", ".familySite", ".policy", ".privacy", ".sitemap", ".support", ".customer"])) {
      selector = "footer";
    } else {
      selector = "body";
    }

    addLink(href, text, defaultAnchorSource, 50, selector);
  });

  // 2. Data attributes
  $("[data-href], [data-url], [data-link], [data-target], [data-target-url]").each((_, el) => {
    const href = $(el).attr("data-href") || $(el).attr("data-url") || $(el).attr("data-link") || $(el).attr("data-target") || $(el).attr("data-target-url") || "";
    const text = $(el).text().trim();
    addLink(href, text, "data-attribute", 70, "body");
  });

  // 3. Onclick handlers
  $("[onclick]").each((_, el) => {
    const onclick = $(el).attr("onclick") ?? "";
    const text = $(el).text().trim();
    const extracted = extractUrlsFromScriptLikeText(onclick);
    for (const u of extracted) {
      addLink(u, text, "onclick", 70, "body");
    }
  });

  // 4. Form actions
  $("form[action]").each((_, el) => {
    const href = $(el).attr("action") ?? "";
    addLink(href, "Form Action", "form-action", 50, "body");
  });

  // 5. Raw regex pattern matching from script blocks
  $("script").each((_, el) => {
    const scriptContent = $(el).html() ?? "";
    if (scriptContent) {
      const extracted = extractUrlsFromScriptLikeText(scriptContent);
      for (const u of extracted) {
        addLink(u, "Script Link", "script-pattern", 40, "script");
      }
    }
  });

  return extractedLinks;
}
