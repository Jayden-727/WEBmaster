import type { CrawledPage, MarkdownTemplateSections } from "@/types/deep-analysis";
import { DEFAULT_TEMPLATE } from "./markdown-templates";

export function generateMarkdown(
  page: CrawledPage,
  sectionOverrides?: Partial<MarkdownTemplateSections>,
): string {
  const sections = { ...DEFAULT_TEMPLATE.sections, ...sectionOverrides };
  const titlePrefix = DEFAULT_TEMPLATE.titleFormat === "h1" ? "#" : "##";
  const lines: string[] = [];

  if (sections.title && page.title) {
    lines.push(`${titlePrefix} ${page.title}`, "");
  }

  if (sections.url) {
    lines.push(`**URL:** ${page.url}`, "");
  }

  if (sections.pageType && page.pageTypeGuess) {
    lines.push(`**Page Type:** ${page.pageTypeGuess}`, "");
  }

  if (sections.metadataSummary && Object.keys(page.rawMetadata).length > 0) {
    lines.push("## Metadata", "");
    for (const [key, value] of Object.entries(page.rawMetadata)) {
      if (value) lines.push(`- **${key}:** ${value}`);
    }
    lines.push("");
  }

  if (sections.headingsHierarchy && page.rawHeadings.length > 0) {
    lines.push("## Headings Hierarchy", "");
    for (const h of page.rawHeadings) {
      const indent = "  ".repeat(h.level - 1);
      lines.push(`${indent}- H${h.level}: ${h.text}`);
    }
    lines.push("");
  }

  if (sections.mainText && page.rawTextPreview) {
    lines.push("## Content Preview", "");
    lines.push(page.rawTextPreview, "");
  }

  if (sections.keyLinks && page.rawLinks.length > 0) {
    const internal = page.rawLinks.filter((l) => l.isInternal);
    const external = page.rawLinks.filter((l) => !l.isInternal);

    lines.push("## Links", "");

    if (internal.length > 0) {
      lines.push(`### Internal Links (${internal.length})`, "");
      for (const l of internal.slice(0, 30)) {
        lines.push(`- [${l.text || l.href}](${l.href})`);
      }
      if (internal.length > 30) lines.push(`- ... and ${internal.length - 30} more`);
      lines.push("");
    }

    if (external.length > 0) {
      lines.push(`### External Links (${external.length})`, "");
      for (const l of external.slice(0, 20)) {
        lines.push(`- [${l.text || l.href}](${l.href})`);
      }
      if (external.length > 20) lines.push(`- ... and ${external.length - 20} more`);
      lines.push("");
    }
  }

  if (sections.imageReferences && page.rawImages.length > 0) {
    lines.push("## Images", "");
    for (const img of page.rawImages.slice(0, 30)) {
      lines.push(`- ![${img.alt || "image"}](${img.src})`);
    }
    if (page.rawImages.length > 30) lines.push(`- ... and ${page.rawImages.length - 30} more`);
    lines.push("");
  }

  lines.push("---", "");
  lines.push(`*Generated at ${new Date().toISOString()}*`);

  return lines.join("\n");
}
