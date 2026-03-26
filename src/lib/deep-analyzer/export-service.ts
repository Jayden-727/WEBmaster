import type { CrawledPage, RefinedPage, MarkdownTemplateSections } from "@/types/deep-analysis";
import { generateMarkdown } from "./markdown-generator";

export function generateCombinedMarkdown(
  pages: CrawledPage[],
  rootUrl: string,
  templateOverrides?: Partial<MarkdownTemplateSections>,
): string {
  const successPages = pages.filter((p) => p.status === "success");
  const lines: string[] = [];

  lines.push(`# Site Analysis Report`);
  lines.push("");
  lines.push(`**Root URL:** ${rootUrl}`);
  lines.push(`**Total Pages:** ${successPages.length}`);
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  lines.push("## Table of Contents");
  lines.push("");
  for (let i = 0; i < successPages.length; i++) {
    const p = successPages[i];
    let pathname = "/";
    try { pathname = new URL(p.url).pathname || "/"; } catch {}
    lines.push(`${i + 1}. [${p.title || pathname}](#page-${i + 1})`);
  }
  lines.push("");
  lines.push("---");
  lines.push("");

  for (let i = 0; i < successPages.length; i++) {
    const page = successPages[i];
    lines.push(`<a id="page-${i + 1}"></a>`);
    lines.push("");
    lines.push(generateMarkdown(page, templateOverrides));
    lines.push("");
    if (i < successPages.length - 1) {
      lines.push("---");
      lines.push("");
    }
  }

  return lines.join("\n");
}

export function generateSinglePageMarkdown(
  page: CrawledPage,
  templateOverrides?: Partial<MarkdownTemplateSections>,
): string {
  return generateMarkdown(page, templateOverrides);
}

export function combinedFromRefined(
  refinedPages: RefinedPage[],
  rootUrl: string,
): string {
  const lines: string[] = [];

  lines.push(`# Site Analysis Report`);
  lines.push("");
  lines.push(`**Root URL:** ${rootUrl}`);
  lines.push(`**Total Pages:** ${refinedPages.length}`);
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  for (let i = 0; i < refinedPages.length; i++) {
    lines.push(refinedPages[i].markdown);
    lines.push("");
    if (i < refinedPages.length - 1) {
      lines.push("---");
      lines.push("");
    }
  }

  return lines.join("\n");
}
