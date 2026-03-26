import type { MarkdownTemplate, MarkdownTemplateSections } from "@/types/deep-analysis";

export const DEFAULT_TEMPLATE: MarkdownTemplate = {
  id: "default",
  name: "Standard Report",
  sections: {
    title: true,
    url: true,
    pageType: true,
    metadataSummary: true,
    headingsHierarchy: true,
    mainText: true,
    keyLinks: true,
    imageReferences: true,
  },
  titleFormat: "h1",
  includeRawHtml: false,
};

const STORAGE_KEY = "deep-analyzer-template";

export function getTemplate(): MarkdownTemplate {
  if (typeof window === "undefined") return DEFAULT_TEMPLATE;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<MarkdownTemplate>;
      return { ...DEFAULT_TEMPLATE, ...parsed, sections: { ...DEFAULT_TEMPLATE.sections, ...parsed.sections } };
    }
  } catch {}
  return DEFAULT_TEMPLATE;
}

export function saveTemplate(overrides: Partial<MarkdownTemplateSections>): void {
  if (typeof window === "undefined") return;
  const current = getTemplate();
  const updated: MarkdownTemplate = {
    ...current,
    sections: { ...current.sections, ...overrides },
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}
