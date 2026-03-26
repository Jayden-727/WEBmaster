import { StackSignalResult } from "@/types/analysis";

export function detectStack(html: string): StackSignalResult[] {
  const normalized = html.toLowerCase();
  const results: StackSignalResult[] = [];

  pushIfMatch(results, normalized.includes("/_next/") || normalized.includes("__next_data__"), {
    category: "framework",
    detectedTool: "Next.js",
    confidence: 0.95,
    matchedSignals: ["/_next/", "__NEXT_DATA__"]
  });
  pushIfMatch(results, normalized.includes("wp-content") || normalized.includes("wp-json"), {
    category: "cms",
    detectedTool: "WordPress",
    confidence: 0.9,
    matchedSignals: ["wp-content", "wp-json"]
  });
  pushIfMatch(results, normalized.includes("cdn.shopify.com"), {
    category: "cms",
    detectedTool: "Shopify",
    confidence: 0.92,
    matchedSignals: ["cdn.shopify.com"]
  });
  pushIfMatch(results, normalized.includes("googletagmanager.com"), {
    category: "analytics",
    detectedTool: "Google Tag Manager",
    confidence: 0.88,
    matchedSignals: ["googletagmanager.com"]
  });
  pushIfMatch(results, normalized.includes("cloudflare"), {
    category: "infrastructure",
    detectedTool: "Cloudflare",
    confidence: 0.7,
    matchedSignals: ["cloudflare"]
  });

  return results;
}

function pushIfMatch(target: StackSignalResult[], condition: boolean, entry: StackSignalResult) {
  if (condition) {
    target.push(entry);
  }
}
