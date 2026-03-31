export type CrawlMode = "all" | "max";

export type CrawlStrategyPreference = "fetch" | "strong";

export type CrawlStrategyUsed = "fetch" | "rendered" | "fallback-rendered";

export interface DeepAnalyzeRequest {
  url: string;
  mode: CrawlMode;
  maxPages: number;
  maxDepth: number;
  crawlStrategy?: CrawlStrategyPreference;
}

export interface DeepAnalyzeContinueRequest {
  jobId: string;
  rootUrl: string;
  domain: string;
  mode: CrawlMode;
  maxPages: number;
  maxDepth: number;
  queue: QueueItem[];
  visited: string[];
  pagesCrawled: number;
}

export interface QueueItem {
  url: string;
  parentUrl: string | null;
  depth: number;
}

export interface CrawledPageTech {
  name: string;
  category: string;
  confidence: number;
  description?: string;
  matchedSignals: string[];
}

export interface CrawledPage {
  url: string;
  parentUrl: string | null;
  depth: number;
  title: string | null;
  status: "success" | "error";
  rawMetadata: Record<string, string | null>;
  rawHeadings: { level: number; text: string }[];
  rawLinks: { href: string; text: string; isInternal: boolean }[];
  rawImages: { src: string; alt: string }[];
  rawTextPreview: string;
  pageTypeGuess: string | null;
  detectedTech?: CrawledPageTech[];
  crawlStrategy?: CrawlStrategyUsed;
  contentScore?: number;
  finalUrl?: string;
  cookieBannerHandled?: boolean;
  error?: string;
  crawledAt: string;
}

export interface DeepAnalysisJob {
  jobId: string;
  rootUrl: string;
  domain: string;
  mode: CrawlMode;
  crawlStrategy: CrawlStrategyPreference;
  maxPages: number;
  maxDepth: number;
  status: "pending" | "running" | "crawling" | "paused" | "completed" | "failed" | "error";
  pages: CrawledPage[];
  totalDiscovered: number;
  totalProcessed: number;
  totalSuccess: number;
  totalFailed: number;
  startedAt: string;
  completedAt?: string;
}

export type CrawlStreamEvent =
  | { type: "started"; jobId: string; rootUrl: string }
  | { type: "page"; page: CrawledPage }
  | { type: "discovered"; url: string; depth: number }
  | { type: "error"; url: string; message: string }
  | {
      type: "paused";
      queue: QueueItem[];
      visited: string[];
      pagesCrawled: number;
    }
  | { type: "completed"; totalPages: number; totalErrors: number };

export interface RefinedPage {
  url: string;
  markdown: string;
  refinedAt: string;
}

export interface RefineRequest {
  pages: CrawledPage[];
  template?: Partial<MarkdownTemplateSections>;
}

export interface MarkdownTemplateSections {
  title: boolean;
  url: boolean;
  pageType: boolean;
  metadataSummary: boolean;
  headingsHierarchy: boolean;
  mainText: boolean;
  keyLinks: boolean;
  imageReferences: boolean;
  technologyProfile: boolean;
}

export interface MarkdownTemplate {
  id: string;
  name: string;
  sections: MarkdownTemplateSections;
  titleFormat: "h1" | "h2";
  includeRawHtml: boolean;
}
