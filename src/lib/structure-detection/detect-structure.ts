import * as cheerio from "cheerio";
import { StructureSignalResult } from "@/types/analysis";

export function detectStructure(html: string): StructureSignalResult[] {
  const $ = cheerio.load(html);
  const rules: Array<{ name: StructureSignalResult["componentName"]; selectors: string[] }> = [
    { name: "header", selectors: ["header", '[role="banner"]'] },
    { name: "footer", selectors: ["footer", '[role="contentinfo"]'] },
    { name: "hero", selectors: [".hero", '[class*="hero"]'] },
    { name: "cta_button", selectors: ["button", 'a[class*="btn"]'] },
    { name: "form", selectors: ["form"] },
    { name: "faq", selectors: ['[class*="faq"]', "details"] },
    { name: "tabs", selectors: ['[role="tablist"]', '[class*="tab"]'] },
    { name: "product_gallery", selectors: ['[class*="gallery"]', '[class*="carousel"]'] },
    { name: "reviews", selectors: ['[class*="review"]', '[itemprop="review"]'] },
    { name: "related_products", selectors: ['[class*="related"]', '[class*="recommend"]'] },
    { name: "newsletter", selectors: ['[class*="newsletter"]', 'input[type="email"]'] }
  ];

  return rules.map((rule) => {
    const count = rule.selectors.reduce((total, selector) => total + $(selector).length, 0);
    return {
      componentName: rule.name,
      detectedCount: count,
      confidence: Math.min(1, count > 0 ? 0.6 + count * 0.05 : 0),
      matchedPatterns: rule.selectors
    };
  });
}
