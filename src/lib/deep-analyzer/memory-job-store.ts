import type { DeepJobStore, CreateJobInput, DeepJob, DeepPageRow } from "./job-store";
import type { CrawledPage, QueueItem } from "@/types/deep-analysis";
import { extractDomain } from "./site-crawler";
import crypto from "crypto";

const globalForMemoryStore = global as unknown as {
  memoryJobs?: Map<string, DeepJob>;
  memoryPages?: Map<string, DeepPageRow[]>;
};

const memoryJobs = globalForMemoryStore.memoryJobs || new Map<string, DeepJob>();
const memoryPages = globalForMemoryStore.memoryPages || new Map<string, DeepPageRow[]>();

if (process.env.NODE_ENV !== "production") {
  globalForMemoryStore.memoryJobs = memoryJobs;
  globalForMemoryStore.memoryPages = memoryPages;
}

class MemoryDeepJobStoreImpl implements DeepJobStore {
  async createJob(params: CreateJobInput): Promise<{ job: DeepJob | null; error: string | null }> {
    const domain = extractDomain(params.rootUrl);
    const normalizedRoot = this.normalizeUrlSimple(params.rootUrl);
    const initialQueue: QueueItem[] = [{ url: normalizedRoot, parentUrl: null, depth: 0 }];

    const jobId = crypto.randomUUID();
    const now = new Date().toISOString();

    const job: DeepJob = {
      id: jobId,
      root_url: params.rootUrl,
      domain,
      mode: params.mode,
      crawl_strategy: params.crawlStrategy ?? "fetch",
      status: "running",
      max_pages: params.maxPages,
      max_depth: params.maxDepth,
      total_discovered: 1,
      total_processed: 0,
      total_success: 0,
      total_failed: 0,
      current_url: null,
      queue_json: initialQueue,
      visited_json: [],
      last_error: null,
      started_at: now,
      completed_at: null,
      updated_at: now,
    };

    memoryJobs.set(jobId, job);
    memoryPages.set(jobId, []);

    console.log(`[MEMORY-JOB-STORE] Created in-memory job: ${jobId} for ${params.rootUrl}`);
    return { job, error: null };
  }

  async getJob(jobId: string): Promise<DeepJob | null> {
    return memoryJobs.get(jobId) || null;
  }

  async updateJob(
    jobId: string,
    updates: Partial<Pick<DeepJob, "status" | "total_discovered" | "total_processed" | "total_success" | "total_failed" | "current_url" | "queue_json" | "visited_json" | "last_error" | "completed_at">>
  ): Promise<void> {
    const job = memoryJobs.get(jobId);
    if (!job) return;

    const updatedJob = {
      ...job,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    memoryJobs.set(jobId, updatedJob);
  }

  async savePage(jobId: string, page: CrawledPage): Promise<void> {
    const jobPages = memoryPages.get(jobId) || [];
    const now = new Date().toISOString();

    const pageRow: DeepPageRow = {
      id: crypto.randomUUID(),
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
      created_at: now,
      updated_at: now,
    };

    jobPages.push(pageRow);
    memoryPages.set(jobId, jobPages);
  }

  async savePageError(
    jobId: string,
    url: string,
    parentUrl: string | null,
    depth: number,
    errorMessage: string
  ): Promise<void> {
    const jobPages = memoryPages.get(jobId) || [];
    const now = new Date().toISOString();

    const pageRow: DeepPageRow = {
      id: crypto.randomUUID(),
      job_id: jobId,
      url,
      parent_url: parentUrl,
      depth,
      status: "failed",
      title: null,
      page_type_guess: null,
      raw_metadata: {},
      raw_headings: [],
      raw_links: [],
      raw_images: [],
      raw_text_preview: null,
      detected_tech: [],
      crawl_strategy: null,
      content_score: null,
      error_message: errorMessage,
      created_at: now,
      updated_at: now,
    };

    jobPages.push(pageRow);
    memoryPages.set(jobId, jobPages);
  }

  async getJobPages(jobId: string, limit = 500, offset = 0): Promise<DeepPageRow[]> {
    const jobPages = memoryPages.get(jobId) || [];
    return jobPages.slice(offset, offset + limit);
  }

  async getJobPageCount(jobId: string): Promise<number> {
    const jobPages = memoryPages.get(jobId) || [];
    return jobPages.length;
  }

  private normalizeUrlSimple(href: string): string {
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
}

export const memoryDeepJobStore = new MemoryDeepJobStoreImpl();
