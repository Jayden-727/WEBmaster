import { NextRequest } from "next/server";
import { getJob, updateJob, savePage, savePageError } from "@/lib/deep-analyzer/job-service";
import { runBatch } from "@/lib/deep-analyzer/batch-runner";
import { extractPathPrefix } from "@/lib/deep-analyzer/site-crawler";

export const maxDuration = 60;

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const job = await getJob(id);
  if (!job) {
    return Response.json({ error: "Job not found" }, { status: 404 });
  }

  if (job.status === "completed" || job.status === "failed") {
    return Response.json({
      status: job.status,
      message: "Job already finished",
      totalProcessed: job.total_processed,
    });
  }

  const queue = Array.isArray(job.queue_json) ? [...job.queue_json] : [];
  const visited = new Set<string>(Array.isArray(job.visited_json) ? job.visited_json : []);

  const allowedPathPrefix = extractPathPrefix(job.root_url);
  const effectiveLimit = job.mode === "max" ? 10_000 : job.max_pages;

  if (queue.length === 0 || job.total_processed >= effectiveLimit) {
    await updateJob(id, {
      status: "completed",
      completed_at: new Date().toISOString(),
    });
    return Response.json({ status: "completed", totalProcessed: job.total_processed });
  }

  await updateJob(id, { status: "running" });

  const result = await runBatch({
    jobId: id,
    rootDomain: job.domain,
    allowedPathPrefix,
    mode: job.mode as "all" | "max",
    maxPages: job.max_pages,
    maxDepth: job.max_depth,
    queue,
    visited,
    pagesCrawled: job.total_processed,
    deadlineMs: 50_000,
    onPage: async (page) => {
      await savePage(id, page);
    },
    onError: async (url, parentUrl, depth, message) => {
      await savePageError(id, url, parentUrl, depth, message);
    },
  });

  const newTotalProcessed = job.total_processed + result.pagesProcessed;
  const newTotalSuccess = job.total_success + result.pagesSuccess;
  const newTotalFailed = job.total_failed + result.pagesFailed;
  const newTotalDiscovered = job.total_discovered + result.newDiscovered;

  const isComplete =
    result.remainingQueue.length === 0 || newTotalProcessed >= effectiveLimit;

  await updateJob(id, {
    status: isComplete ? "completed" : "paused",
    total_discovered: newTotalDiscovered,
    total_processed: newTotalProcessed,
    total_success: newTotalSuccess,
    total_failed: newTotalFailed,
    current_url: result.lastProcessedUrl,
    queue_json: result.remainingQueue,
    visited_json: [...result.visited],
    last_error: result.lastError,
    ...(isComplete ? { completed_at: new Date().toISOString() } : {}),
  });

  return Response.json({
    status: isComplete ? "completed" : "running",
    batchProcessed: result.pagesProcessed,
    totalProcessed: newTotalProcessed,
    totalDiscovered: newTotalDiscovered,
    totalSuccess: newTotalSuccess,
    totalFailed: newTotalFailed,
    queueRemaining: result.remainingQueue.length,
  });
}
