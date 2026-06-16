import type { CrawledPage, CrawlMode, CrawlStrategyPreference, QueueItem } from "@/types/deep-analysis";

export interface CreateJobInput {
  rootUrl: string;
  mode: CrawlMode;
  maxPages: number;
  maxDepth: number;
  crawlStrategy?: CrawlStrategyPreference;
}

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

export interface DeepJobStore {
  createJob(params: CreateJobInput): Promise<{ job: DeepJob | null; error: string | null }>;
  getJob(jobId: string): Promise<DeepJob | null>;
  updateJob(
    jobId: string,
    updates: Partial<Pick<DeepJob, "status" | "total_discovered" | "total_processed" | "total_success" | "total_failed" | "current_url" | "queue_json" | "visited_json" | "last_error" | "completed_at">>
  ): Promise<void>;
  savePage(jobId: string, page: CrawledPage): Promise<void>;
  savePageError(
    jobId: string,
    url: string,
    parentUrl: string | null,
    depth: number,
    errorMessage: string
  ): Promise<void>;
  getJobPages(jobId: string, limit?: number, offset?: number): Promise<DeepPageRow[]>;
  getJobPageCount(jobId: string): Promise<number>;
}
