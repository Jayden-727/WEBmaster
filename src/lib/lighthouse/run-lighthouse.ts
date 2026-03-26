import { LighthouseMetrics, LighthouseInsightCard } from "@/types/analysis";

const PSI_ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
const PSI_TIMEOUT_MS = 60_000;
const LOCAL_TIMEOUT_MS = 90_000;

export interface LighthouseFullResult {
  metrics: LighthouseMetrics;
  insights: LighthouseInsightCard[];
  source: "local" | "pagespeed-api";
}

export async function runFullLighthouseAnalysis(url: string): Promise<LighthouseFullResult> {
  // Strategy 1: Try local Lighthouse (via Node API)
  try {
    console.log("[LIGHTHOUSE] attempting local execution…");
    const result = await runLocalLighthouse(url);
    console.log(`[LIGHTHOUSE] local execution succeeded — perf=${result.metrics.performanceScore}`);
    return result;
  } catch (localErr) {
    const msg = localErr instanceof Error ? localErr.message : String(localErr);
    console.warn(`[LIGHTHOUSE] local execution failed: ${msg}`);
    console.log("[LIGHTHOUSE] falling back to PageSpeed Insights API…");
  }

  // Strategy 2: Fall back to PageSpeed Insights API
  try {
    const result = await runPageSpeedApi(url);
    console.log(`[LIGHTHOUSE] PageSpeed API succeeded — perf=${result.metrics.performanceScore}`);
    return result;
  } catch (apiErr) {
    const msg = apiErr instanceof Error ? apiErr.message : String(apiErr);
    console.error(`[LIGHTHOUSE] PageSpeed API also failed: ${msg}`);
    throw new Error(`Lighthouse failed (local: Chrome/Lighthouse unavailable, API: ${msg})`);
  }
}

async function runLocalLighthouse(url: string): Promise<LighthouseFullResult> {
  const lighthouse = await import("lighthouse").then((m) => m.default ?? m);
  const chromeLauncher = await import("chrome-launcher");

  const chrome = await chromeLauncher.launch({
    chromeFlags: ["--headless", "--no-sandbox", "--disable-gpu"],
    chromePath: findChromePath(),
  });

  try {
    const result = await Promise.race([
      lighthouse(url, {
        port: chrome.port,
        output: "json",
        logLevel: "error",
        onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Local Lighthouse timed out")), LOCAL_TIMEOUT_MS)
      ),
    ]);

    if (!result || !result.lhr) {
      throw new Error("Lighthouse returned empty result");
    }

    const lhr = result.lhr;
    const categories = lhr.categories ?? {};
    const audits = lhr.audits ?? {};

    return {
      metrics: extractMetrics(categories, audits),
      insights: extractInsights(audits),
      source: "local",
    };
  } finally {
    await chrome.kill();
  }
}

function findChromePath(): string | undefined {
  const paths = [
    process.env.CHROME_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ];
  // Return first truthy env var or let chrome-launcher auto-detect
  for (const p of paths) {
    if (p) return p;
  }
  return undefined;
}

async function runPageSpeedApi(url: string): Promise<LighthouseFullResult> {
  const apiKey = process.env.PAGESPEED_API_KEY ?? "";

  const params = new URLSearchParams({ url, strategy: "mobile", category: "performance" });
  params.append("category", "accessibility");
  params.append("category", "best-practices");
  params.append("category", "seo");
  if (apiKey) params.set("key", apiKey);

  const endpoint = `${PSI_ENDPOINT}?${params.toString()}`;
  console.log(`[LIGHTHOUSE] calling PageSpeed Insights for ${url}`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PSI_TIMEOUT_MS);

  try {
    const res = await fetch(endpoint, {
      signal: controller.signal,
      cache: "no-store",
      headers: { Referer: "https://attractivewebai.vercel.app" },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`PageSpeed API ${res.status}: ${body.slice(0, 300)}`);
    }

    const json = await res.json();
    const lhr = json.lighthouseResult;
    if (!lhr) throw new Error("Missing lighthouseResult in API response");

    return {
      metrics: extractMetrics(lhr.categories ?? {}, lhr.audits ?? {}),
      insights: extractInsights(lhr.audits ?? {}),
      source: "pagespeed-api",
    };
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

function extractMetrics(
  categories: Record<string, unknown>,
  audits: Record<string, unknown>
): LighthouseMetrics {
  const toScore = (cat: string): number | null => {
    const entry = categories[cat] as { score?: number | null } | undefined;
    const s = entry?.score;
    return typeof s === "number" ? Math.round(s * 100) : null;
  };
  const toVal = (id: string): number | null => {
    const entry = audits[id] as { numericValue?: number } | undefined;
    const v = entry?.numericValue;
    return typeof v === "number" ? Math.round(v * 100) / 100 : null;
  };

  return {
    performanceScore: toScore("performance"),
    accessibilityScore: toScore("accessibility"),
    bestPracticesScore: toScore("best-practices"),
    seoScore: toScore("seo"),
    lcp: toVal("largest-contentful-paint"),
    cls: toVal("cumulative-layout-shift"),
    inp: toVal("interaction-to-next-paint"),
    fcp: toVal("first-contentful-paint"),
    tbt: toVal("total-blocking-time"),
    rawJson: null,
  };
}

const INSIGHT_AUDIT_IDS = [
  "render-blocking-resources", "uses-responsive-images", "offscreen-images",
  "unminified-css", "unminified-javascript", "unused-css-rules", "unused-javascript",
  "uses-optimized-images", "modern-image-formats", "uses-text-compression",
  "uses-rel-preconnect", "server-response-time", "redirects", "uses-http2",
  "efficient-animated-content", "duplicated-javascript", "legacy-javascript",
  "dom-size", "no-document-write", "uses-passive-event-listeners",
  "image-alt", "color-contrast", "meta-description", "link-text",
  "crawlable-anchors", "is-crawlable", "robots-txt", "hreflang", "canonical",
  "font-display", "largest-contentful-paint-element", "total-blocking-time", "layout-shifts",
] as const;

function extractInsights(audits: Record<string, unknown>): LighthouseInsightCard[] {
  const results: LighthouseInsightCard[] = [];

  for (const id of INSIGHT_AUDIT_IDS) {
    const audit = audits[id] as Record<string, unknown> | undefined;
    if (!audit) continue;

    const score = audit.score as number | null | undefined;
    if (score === null || score === undefined || score >= 0.9) continue;

    const title = (audit.title as string) ?? id;
    const description =
      (audit.displayValue as string) ??
      (audit.description as string)?.split("[Learn more]")[0]?.trim() ??
      "";

    const severity: LighthouseInsightCard["severity"] =
      score < 0.5 ? "high" : score < 0.9 ? "medium" : "low";

    results.push({ title, severity, description });
  }

  results.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.severity] - order[b.severity];
  });

  return results.slice(0, 20);
}
