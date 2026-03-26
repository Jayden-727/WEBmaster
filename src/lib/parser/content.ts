import * as cheerio from "cheerio";
import TurndownService from "turndown";

export function extractContent(html: string): { cleanText: string; markdownText: string } {
  const $ = cheerio.load(html);
  $("script, style, noscript").remove();
  const cleanText = $("body").text().replace(/\s+/g, " ").trim();
  const markdownText = new TurndownService().turndown($.html("body"));
  return { cleanText, markdownText };
}
