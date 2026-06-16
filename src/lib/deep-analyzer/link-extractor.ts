import * as cheerio from "cheerio";

export interface ExtractedLink {
  raw: string;
  normalizedUrl: string;
  source:
    | "rendered-dom"
    | "static-html"
    | "gnb"
    | "header"
    | "footer"
    | "sitemap"
    | "robots"
    | "onclick"
    | "data-attribute"
    | "form-action"
    | "raw-pattern";
  priority: number;
  text?: string;
  selector?: string;
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
    /(?:goPage|fnMove|movePage|goUrl|linkTo|fn_go|goMenu)\(\s*['"]([^'"]+)['"]\s*\)/gi,
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

export function extractLinksFromHtml(params: {
  html: string;
  baseUrl: string;
  rootUrl: string;
  source: "static-html" | "rendered-dom";
}): ExtractedLink[] {
  const { html, baseUrl, rootUrl, source } = params;
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
    fallbackSource: ExtractedLink["source"],
    fallbackPriority: number,
    selector?: string
  ) => {
    if (!rawHref) return;

    // Handle javascript: URLs containing onclick/goPage patterns
    if (rawHref.toLowerCase().startsWith("javascript:")) {
      const scriptCode = decodeURIComponent(rawHref.substring(11));
      const scriptUrls = extractUrlsFromScriptLikeText(scriptCode);
      for (const u of scriptUrls) {
        addLink(u, linkText, "onclick", 50, selector);
      }
      return;
    }

    const norm = normalizeCrawlUrl(rawHref, baseUrl);
    if (!norm) return;

    // Same domain checks (internal check)
    let isInternal = false;
    try {
      const urlObj = new URL(norm);
      isInternal = urlObj.hostname.replace(/^www\./i, "").endsWith(rootDomain);
    } catch {
      return;
    }

    // Skip if external for crawl queue purposes, but still tag it
    if (seen.has(norm)) return;
    seen.add(norm);

    let priority = isInternal ? fallbackPriority : 0;
    let linkSource = fallbackSource;

    // Detect GNB/Header
    const gnbSelectors = ["header", "nav", ".gnb", "#gnb", ".global-nav", ".navigation", ".menu", ".main-menu", ".depth1", ".depth2", ".lnb", ".snb"];
    const footerSelectors = ["footer", "#footer", ".footer", ".site-footer", ".footer-menu", ".footer-nav", ".policy", ".customer", ".support", ".family-site", ".familySite", ".sns"];

    if (selector) {
      if (gnbSelectors.some(s => selector.includes(s))) {
        linkSource = "gnb";
        priority = isInternal ? 100 : 0;
      } else if (footerSelectors.some(s => selector.includes(s))) {
        linkSource = "footer";
        priority = isInternal ? 90 : 0;
      }
    }

    extractedLinks.push({
      raw: rawHref,
      normalizedUrl: norm,
      source: linkSource,
      priority,
      text: linkText.slice(0, 200).trim() || "Auto-detected Link",
      selector
    });
  };

  // 1. Anchors and area tags
  $("a[href], area[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const text = $(el).text().trim();
    
    // Find matching selector path
    let selector = "";
    if (isWithinSelector(el, ["header", "nav", ".gnb", "#gnb", ".global-nav", ".navigation", ".menu", ".main-menu", ".depth1", ".depth2", ".lnb", ".snb"])) {
      selector = "gnb";
    } else if (isWithinSelector(el, ["footer", "#footer", ".footer", ".site-footer", ".footer-menu", ".footer-nav", ".policy", ".customer", ".support", ".family-site", ".familySite", ".sns"])) {
      selector = "footer";
    } else {
      selector = "body";
    }

    addLink(href, text, source, 50, selector);
  });

  // 2. Data attributes
  $("[data-href], [data-url], [data-link], [data-target-url]").each((_, el) => {
    const href = $(el).attr("data-href") || $(el).attr("data-url") || $(el).attr("data-link") || $(el).attr("data-target-url") || "";
    const text = $(el).text().trim();
    addLink(href, text, "data-attribute", 50, "body");
  });

  // 3. Onclick handlers
  $("[onclick]").each((_, el) => {
    const onclick = $(el).attr("onclick") ?? "";
    const text = $(el).text().trim();
    const extracted = extractUrlsFromScriptLikeText(onclick);
    for (const u of extracted) {
      addLink(u, text, "onclick", 50, "body");
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
        addLink(u, "Script Link", "raw-pattern", 30, "script");
      }
    }
  });

  return extractedLinks;
}
