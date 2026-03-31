import { getServiceClient } from "@/lib/supabase/server";
import type { CrawledPage, CrawlMode, CrawlStrategyPreference, QueueItem } from "@/types/deep-analysis";
import { extractDomain } from "./site-crawler";

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
  const sb = getServiceClient();
  if (!sb) {
    return { job: null, error: "Supabase client unavailable — check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables" };
  }

  const domain = extractDomain(params.rootUrl);
  const normalizedRoot = normalizeUrlSimple(params.rootUrl);
  const initialQueue: QueueItem[] = [{ url: normalizedRoot, parentUrl: null, depth: 0 }];

  const { data, error } = await sb
    .from("deep_jobs")
    .insert({
      root_url: params.rootUrl,
      domain,
      mode: params.mode,
      crawl_strategy: params.crawlStrategy ?? "fetch",
      status: "running",
      max_pages: params.maxPages,
      max_depth: params.maxDepth,
      total_discovered: 1,
      queue_json: initialQueue,
      visited_json: [],
    })
    .select()
    .single();

  if (error) {
    console.error("[JOB-SERVICE] createJob error:", error.message);
    return { job: null, error: `DB insert failed: ${error.message}` };
  }

  return { job: data as DeepJob, error: null };
}

export async function getJob(jobId: string): Promise<DeepJob | null> {
  const sb = getServiceClient();
  if (!sb) return null;

  const { data, error } = await sb
    .from("deep_jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (error) return null;
  return data as DeepJob;
}

export async function updateJob(
  jobId: string,
  updates: Partial<Pick<DeepJob, "status" | "total_discovered" | "total_processed" | "total_success" | "total_failed" | "current_url" | "queue_json" | "visited_json" | "last_error" | "completed_at">>,
): Promise<void> {
  const sb = getServiceClient();
  if (!sb) return;

  await sb
    .from("deep_jobs")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", jobId);
}

export async function savePage(
  jobId: string,
  page: CrawledPage,
): Promise<void> {
  const sb = getServiceClient();
  if (!sb) return;

  await sb.from("deep_pages").insert({
    job_id: jobId,
    url: page.url,
    parent_url: page.parentUrl,
    depth: page.depth,
    status: page.status === "success" ? "success" : "failed",
    title: page.title,
    page_type_guess: page.pageTypeGuess,
    raw_metadata: page.rawMetadata,
    raw_headings: page.rawHeadings,
    raw_links: page.rawLinks,
    raw_images: page.rawImages,
    raw_text_preview: page.rawTextPreview,
    detected_tech: page.detectedTech ?? [],
    crawl_strategy: page.crawlStrategy ?? "fetch",
    content_score: page.contentScore ?? null,
    error_message: page.error ?? null,
  });
}

export async function savePageError(
  jobId: string,
  url: string,
  parentUrl: string | null,
  depth: number,
  errorMessage: string,
): Promise<void> {
  const sb = getServiceClient();
  if (!sb) return;

  await sb.from("deep_pages").insert({
    job_id: jobId,
    url,
    parent_url: parentUrl,
    depth,
    status: "failed",
    error_message: errorMessage,
  });
}

export async function getJobPages(
  jobId: string,
  limit = 500,
  offset = 0,
): Promise<DeepPageRow[]> {
  const sb = getServiceClient();
  if (!sb) return [];

  const { data, error } = await sb
    .from("deep_pages")
    .select("*")
    .eq("job_id", jobId)
    .order("created_at", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) return [];
  return (data ?? []) as DeepPageRow[];
}

export async function getJobPageCount(jobId: string): Promise<number> {
  const sb = getServiceClient();
  if (!sb) return 0;

  const { count, error } = await sb
    .from("deep_pages")
    .select("id", { count: "exact", head: true })
    .eq("job_id", jobId);

  if (error) return 0;
  return count ?? 0;
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
    rawLinks: row.raw_links ?? [],
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

function normalizeUrlSimple(href: string): string {
  try {
    const u = new URL(href);
    u.hash = "";
    u.search = "";
    let path = u.pathname;
    if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
    u.pathname = path;
    return u.href;
  } catch {
    return href;
  }
}
