import type { CrawledPage, CrawlMode, CrawlStrategyPreference, QueueItem } from "@/types/deep-analysis";
import { getDeepJobStore } from "./get-job-store";

export interface DeepJob {
  id: string;
  root_url: string;
  domain: string;
  mode: CrawlMode;
  crawl_strategy: CrawlStrategyPreference;
  status: "pending" | "running" | "paused" | "completed" | "failed";
  max_pages: number;
  max_depth: number;
  total_discovered: number;
  total_processed: number;
  total_success: number;
  total_failed: number;
  current_url: string | null;
  queue_json: QueueItem[];
  visited_json: string[];
  last_error: string | null;
  started_at: string;
  completed_at: string | null;
  updated_at: string;
}

export interface DeepPageRow {
  id: string;
  job_id: string;
  url: string;
  parent_url: string | null;
  depth: number;
  status: "queued" | "crawling" | "success" | "failed";
  title: string | null;
  page_type_guess: string | null;
  raw_metadata: Record<string, string | null>;
  raw_headings: { level: number; text: string }[];
  raw_links: { href: string; text: string; isInternal: boolean }[];
  raw_images: { src: string; alt: string }[];
  raw_text_preview: string | null;
  detected_tech: unknown[];
  crawl_strategy: string | null;
  content_score: number | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export async function createJob(params: {
  rootUrl: string;
  mode: CrawlMode;
  maxPages: number;
  maxDepth: number;
  crawlStrategy?: CrawlStrategyPreference;
}): Promise<{ job: DeepJob | null; error: string | null }> {
  return getDeepJobStore().createJob(params);
}

export async function getJob(jobId: string): Promise<DeepJob | null> {
  return getDeepJobStore().getJob(jobId);
}

export async function updateJob(
  jobId: string,
  updates: Partial<Pick<DeepJob, "status" | "total_discovered" | "total_processed" | "total_success" | "total_failed" | "current_url" | "queue_json" | "visited_json" | "last_error" | "completed_at">>,
): Promise<void> {
  return getDeepJobStore().updateJob(jobId, updates);
}

export async function savePage(
  jobId: string,
  page: CrawledPage,
): Promise<void> {
  return getDeepJobStore().savePage(jobId, page);
}

export async function savePageError(
  jobId: string,
  url: string,
  parentUrl: string | null,
  depth: number,
  errorMessage: string,
): Promise<void> {
  return getDeepJobStore().savePageError(jobId, url, parentUrl, depth, errorMessage);
}

export async function getJobPages(
  jobId: string,
  limit = 500,
  offset = 0,
): Promise<DeepPageRow[]> {
  return getDeepJobStore().getJobPages(jobId, limit, offset);
}

export async function getJobPageCount(jobId: string): Promise<number> {
  return getDeepJobStore().getJobPageCount(jobId);
}

export function pageRowToCrawledPage(row: DeepPageRow): CrawledPage {
  return {
    url: row.url,
    parentUrl: row.parent_url,
    depth: row.depth,
    title: row.title,
    status: row.status === "success" ? "success" : "error",
    rawMetadata: row.raw_metadata ?? {},
    rawHeadings: row.raw_headings ?? [],
    rawLinks: (row.raw_links ?? []).map((l: any) => ({
      href: l.href,
      text: l.text,
      isInternal: l.isInternal ?? l.is_internal ?? false,
      isPriority: l.isPriority ?? l.is_priority ?? false,
      source: l.source,
      priority: l.priority,
      skipReason: l.skipReason ?? l.skip_reason ?? null,
    })),
    rawImages: row.raw_images ?? [],
    rawTextPreview: row.raw_text_preview ?? "",
    pageTypeGuess: row.page_type_guess,
    detectedTech: (row.detected_tech ?? []) as CrawledPage["detectedTech"],
    crawlStrategy: (row.crawl_strategy as CrawledPage["crawlStrategy"]) ?? undefined,
    contentScore: row.content_score ?? undefined,
    error: row.error_message ?? undefined,
    crawledAt: row.created_at,
  };
}
