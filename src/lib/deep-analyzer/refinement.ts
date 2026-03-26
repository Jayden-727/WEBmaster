import type { CrawledPage, RefinedPage, MarkdownTemplateSections } from "@/types/deep-analysis";
import { generateMarkdown } from "./markdown-generator";

export function refineAllPages(
  pages: CrawledPage[],
  templateOverrides?: Partial<MarkdownTemplateSections>,
): RefinedPage[] {
  return pages
    .filter((p) => p.status === "success")
    .map((page) => {
      try {
        return {
          url: page.url,
          markdown: generateMarkdown(page, templateOverrides),
          refinedAt: new Date().toISOString(),
        };
      } catch {
        return {
          url: page.url,
          markdown: `# Error\n\nFailed to generate Markdown for ${page.url}`,
          refinedAt: new Date().toISOString(),
        };
      }
    });
}
