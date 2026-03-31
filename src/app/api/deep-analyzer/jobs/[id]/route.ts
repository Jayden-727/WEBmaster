import { NextRequest } from "next/server";
import { getJob, getJobPages, pageRowToCrawledPage } from "@/lib/deep-analyzer/job-service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const job = await getJob(id);
  if (!job) {
    return Response.json({ error: "Job not found" }, { status: 404 });
  }

  const pageRows = await getJobPages(id, 2000);
  const pages = pageRows.map(pageRowToCrawledPage);

  return Response.json({
    jobId: job.id,
    rootUrl: job.root_url,
    domain: job.domain,
    mode: job.mode,
    crawlStrategy: job.crawl_strategy ?? "fetch",
    status: job.status,
    maxPages: job.max_pages,
    maxDepth: job.max_depth,
    totalDiscovered: job.total_discovered,
    totalProcessed: job.total_processed,
    totalSuccess: job.total_success,
    totalFailed: job.total_failed,
    currentUrl: job.current_url,
    lastError: job.last_error,
    queueLength: Array.isArray(job.queue_json) ? job.queue_json.length : 0,
    pages,
    startedAt: job.started_at,
    completedAt: job.completed_at,
    updatedAt: job.updated_at,
  });
}
