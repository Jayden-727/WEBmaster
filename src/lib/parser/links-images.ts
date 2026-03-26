import * as cheerio from "cheerio";
import { ImageAnalysis, LinkAnalysis } from "@/types/analysis";

export function extractLinksAndImages(html: string, baseUrl: string): { links: LinkAnalysis[]; images: ImageAnalysis[] } {
  const $ = cheerio.load(html);
  const host = new URL(baseUrl).hostname;

  const links: LinkAnalysis[] = $("a[href]")
    .map((_, el) => {
      const href = $(el).attr("href") ?? "";
      const text = $(el).text().trim();
      const resolved = safeResolve(href, baseUrl);
      const isInternal = resolved ? new URL(resolved).hostname === host : false;

      return { href: resolved ?? href, text, isInternal };
    })
    .get()
    .filter((item) => Boolean(item.href));

  const images: ImageAnalysis[] = $("img")
    .map((_, el) => {
      const src = $(el).attr("src") ?? $(el).attr("data-src") ?? "";
      const alt = $(el).attr("alt") ?? "";
      const isLazy = $(el).attr("loading") === "lazy" || Boolean($(el).attr("data-src"));
      const resolved = safeResolve(src, baseUrl) ?? src;
      const filename = resolved.split("/").pop() ?? "";

      return { src: resolved, alt, isLazy, filename };
    })
    .get()
    .filter((item) => Boolean(item.src));

  return { links, images };
}

function safeResolve(path: string, baseUrl: string): string | null {
  try {
    return new URL(path, baseUrl).toString();
  } catch {
    return null;
  }
}
