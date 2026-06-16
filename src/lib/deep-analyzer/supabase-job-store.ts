import { getServiceClient } from "@/lib/supabase/server";
import type { DeepJobStore, CreateJobInput, DeepJob, DeepPageRow } from "./job-store";
import type { CrawledPage, QueueItem } from "@/types/deep-analysis";
import { extractDomain } from "./site-crawler";

class SupabaseDeepJobStore implements DeepJobStore {
  async createJob(params: CreateJobInput): Promise<{ job: DeepJob | null; error: string | null }> {
    const sb = getServiceClient();
    if (!sb) {
      return { job: null, error: "Supabase client unavailable — check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables" };
    }

    const domain = extractDomain(params.rootUrl);
    const normalizedRoot = this.normalizeUrlSimple(params.rootUrl);
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
      console.error("[SUPABASE-JOB-STORE] createJob error:", error.message);
      return { job: null, error: `DB insert failed: ${error.message}` };
    }

    return { job: data as DeepJob, error: null };
  }

  async getJob(jobId: string): Promise<DeepJob | null> {
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

  async updateJob(
    jobId: string,
    updates: Partial<Pick<DeepJob, "status" | "total_discovered" | "total_processed" | "total_success" | "total_failed" | "current_url" | "queue_json" | "visited_json" | "last_error" | "completed_at">>
  ): Promise<void> {
    const sb = getServiceClient();
    if (!sb) return;

    await sb
      .from("deep_jobs")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", jobId);
  }

  async savePage(jobId: string, page: CrawledPage): Promise<void> {
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

  async savePageError(
    jobId: string,
    url: string,
    parentUrl: string | null,
    depth: number,
    errorMessage: string
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

  async getJobPages(jobId: string, limit = 500, offset = 0): Promise<DeepPageRow[]> {
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

  async getJobPageCount(jobId: string): Promise<number> {
    const sb = getServiceClient();
    if (!sb) return 0;

    const { count, error } = await sb
      .from("deep_pages")
      .select("id", { count: "exact", head: true })
      .eq("job_id", jobId);

    if (error) return 0;
    return count ?? 0;
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

export function createSupabaseDeepJobStore(): DeepJobStore {
  return new SupabaseDeepJobStore();
}
