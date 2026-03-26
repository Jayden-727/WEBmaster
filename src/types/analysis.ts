export type AnalyzeMode = "source" | "rendered";
export type AnalysisStatus = "pending" | "running" | "completed" | "failed";

export interface AnalyzeRequest {
  url: string;
  mode: AnalyzeMode;
}

export interface MetadataAnalysis {
  title: string | null;
  description: string | null;
  canonical: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  robots: string | null;
  language: string | null;
  charset: string | null;
  jsonLd: unknown[];
}

export type StackCategory =
  | "ecommerce"
  | "cms"
  | "framework"
  | "jsLibrary"
  | "analytics"
  | "marketing"
  | "widgets"
  | "cdn"
  | "hosting"
  | "search"
  | "security"
  | "fonts"
  | "media"
  | "other";

export interface StackSignalResult {
  category: StackCategory;
  detectedTool: string;
  confidence: number;
  matchedSignals: string[];
  description?: string;
}

export interface StructureSignalResult {
  componentName:
    | "header"
    | "footer"
    | "hero"
    | "cta_button"
    | "form"
    | "faq"
    | "tabs"
    | "product_gallery"
    | "reviews"
    | "related_products"
    | "newsletter";
  detectedCount: number;
  confidence: number;
  matchedPatterns: string[];
}

export interface LinkAnalysis {
  href: string;
  text: string;
  isInternal: boolean;
}

export interface ImageAnalysis {
  src: string;
  alt: string;
  isLazy: boolean;
  filename: string;
}

export interface LighthouseMetrics {
  performanceScore: number | null;
  accessibilityScore: number | null;
  bestPracticesScore: number | null;
  seoScore: number | null;
  lcp: number | null;
  cls: number | null;
  inp: number | null;
  fcp: number | null;
  tbt: number | null;
  rawJson: unknown | null;
}

export interface LighthouseInsightCard {
  title: string;
  severity: "low" | "medium" | "high";
  description: string;
}

export interface SectionError {
  section: string;
  message: string;
  detail?: string;
  fallbackUsed?: string;
  timestamp: string;
}

export interface AnalysisResponseData {
  metadata: MetadataAnalysis;
  content: { cleanText: string; markdownText: string };
  stack: StackSignalResult[];
  structure: StructureSignalResult[];
  links: LinkAnalysis[];
  images: ImageAnalysis[];
  lighthouse: LighthouseMetrics;
  lighthouseInsights: LighthouseInsightCard[];
}

export interface AnalyzeApiResponse {
  success: boolean;
  analysisId: string;
  url: string;
  title: string | null;
  mode: AnalyzeMode;
  persisted: boolean;
  data: AnalysisResponseData;
  errors: SectionError[];
  warnings: string[];
}
