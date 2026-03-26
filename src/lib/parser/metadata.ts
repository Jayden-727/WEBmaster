import * as cheerio from "cheerio";
import { MetadataAnalysis } from "@/types/analysis";

export function extractMetadata(html: string): MetadataAnalysis {
  const $ = cheerio.load(html);
  const jsonLd = $('script[type="application/ld+json"]')
    .map((_, el) => $(el).html())
    .get()
    .filter(Boolean)
    .map((value) => {
      try {
        return JSON.parse(value as string);
      } catch {
        return value;
      }
    });

  return {
    title: $("title").first().text() || null,
    description: $('meta[name="description"]').attr("content") ?? null,
    canonical: $('link[rel="canonical"]').attr("href") ?? null,
    ogTitle: $('meta[property="og:title"]').attr("content") ?? null,
    ogDescription: $('meta[property="og:description"]').attr("content") ?? null,
    ogImage: $('meta[property="og:image"]').attr("content") ?? null,
    robots: $('meta[name="robots"]').attr("content") ?? null,
    language: $("html").attr("lang") ?? null,
    charset: $('meta[charset]').attr("charset") ?? null,
    jsonLd
  };
}
