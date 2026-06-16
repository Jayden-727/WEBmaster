const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

export async function fetchSitemapLinks(rootUrl: string, rootDomain: string): Promise<string[]> {
  const candidates = [
    new URL("/sitemap.xml", rootUrl).toString(),
    new URL("/sitemap_index.xml", rootUrl).toString(),
    new URL("/sitemap.do", rootUrl).toString(),
    new URL("/robots.txt", rootUrl).toString(),
  ];

  const extracted: string[] = [];

  for (const url of candidates) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url, {
        headers: BROWSER_HEADERS,
        redirect: "follow",
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) continue;
      const text = await res.text();

      if (url.endsWith("robots.txt")) {
        const matches = text.match(/Sitemap:\s*(https?:\/\/[^\s]+)/gi);
        if (matches) {
          for (const m of matches) {
            const smUrl = m.replace(/Sitemap:\s*/i, "").trim();
            try {
              const smController = new AbortController();
              const smTimer = setTimeout(() => smController.abort(), 8000);
              const smRes = await fetch(smUrl, {
                headers: BROWSER_HEADERS,
                redirect: "follow",
                signal: smController.signal,
              });
              clearTimeout(smTimer);
              if (smRes.ok) {
                const smText = await smRes.text();
                extracted.push(...parseXmlSitemap(smText, rootDomain));
              }
            } catch {}
          }
        }
      } else {
        extracted.push(...parseXmlSitemap(text, rootDomain));
      }
    } catch {}
  }
  return [...new Set(extracted)];
}

function parseXmlSitemap(text: string, rootDomain: string): string[] {
  const urls: string[] = [];
  const locRegex = /<loc>\s*(https?:\/\/[^<\s]+)\s*<\/loc>/gi;
  let match;
  while ((match = locRegex.exec(text)) !== null) {
    if (match[1]) {
      try {
        const u = new URL(match[1]);
        if (u.hostname.endsWith(rootDomain)) {
          urls.push(match[1]);
        }
      } catch {}
    }
  }

  if (urls.length === 0) {
    const hrefRegex = /href=['"](https?:\/\/[^'"]+)['"]/gi;
    let match2;
    while ((match2 = hrefRegex.exec(text)) !== null) {
      if (match2[1]) {
        try {
          const u = new URL(match2[1]);
          if (u.hostname.endsWith(rootDomain)) {
            urls.push(match2[1]);
          }
        } catch {}
      }
    }
  }
  return urls;
}
