export type PageType =
  | "homepage"
  | "category"
  | "product"
  | "article"
  | "policy"
  | "contact"
  | "search"
  | "login"
  | "other";

interface DetectionInput {
  url: string;
  title: string | null;
  headings: { level: number; text: string }[];
  textPreview: string;
}

const URL_PATTERNS: [RegExp, PageType][] = [
  [/\/(contact|kontakt|contato)/i, "contact"],
  [/\/(login|signin|sign-in|register|signup|sign-up|auth)/i, "login"],
  [/\/(search|suche|busca|recherche)/i, "search"],
  [/\/(privacy|terms|tos|imprint|impressum|legal|disclaimer|cookie|gdpr|policy|policies)/i, "policy"],
  [/\/(blog|article|post|news|journal|magazine|story|stories)\//i, "article"],
  [/\/(blog|articles|posts|news)$/i, "category"],
  [/\/(category|categories|collection|collections|shop|store|products|catalog)\/?$/i, "category"],
  [/\/(category|collections?|shop)\/.+/i, "category"],
  [/\/products?\/.+/i, "product"],
  [/\/p\/[^/]+/i, "product"],
  [/\/item\/[^/]+/i, "product"],
  [/\/dp\/[A-Z0-9]+/i, "product"],
];

const TITLE_KEYWORDS: [RegExp, PageType][] = [
  [/\b(cart|checkout|payment|order)\b/i, "other"],
  [/\b(contact|get in touch|reach us)\b/i, "contact"],
  [/\b(privacy|terms of|cookie policy|legal)\b/i, "policy"],
  [/\b(login|sign in|register|create account)\b/i, "login"],
  [/\b(search results|search for)\b/i, "search"],
];

export function detectPageType(input: DetectionInput): PageType {
  const { url, title } = input;

  try {
    const pathname = new URL(url).pathname;
    if (pathname === "/" || pathname === "") return "homepage";
  } catch {}

  for (const [pattern, type] of URL_PATTERNS) {
    if (pattern.test(url)) return type;
  }

  if (title) {
    for (const [pattern, type] of TITLE_KEYWORDS) {
      if (pattern.test(title)) return type;
    }
  }

  try {
    const pathname = new URL(url).pathname;
    const segments = pathname.split("/").filter(Boolean);

    if (segments.length === 1) return "category";
    if (segments.length >= 3) return "article";

    if (/\d{4}\/\d{2}/.test(pathname)) return "article";
  } catch {}

  return "other";
}
