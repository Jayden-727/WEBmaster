import { getServiceClient } from "@/lib/supabase/server";

export interface HistoryItem {
  id: string;
  type: "single" | "deep";
  url: string;
  domain: string;
  title: string | null;
  mode: string;
  crawlStrategy: string | null;
  status: string;
  totalPages: number;
  totalSuccess: number;
  totalFailed: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  resumable: boolean;
}

export async function GET() {
  const sb = getServiceClient();
  if (!sb) {
    return Response.json({ items: [], error: "Database not configured" });
  }

  const items: HistoryItem[] = [];

  const [singleRes, deepRes] = await Promise.all([
    sb.from("analyses")
      .select("id, url, mode, status, title, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(100),
    sb.from("deep_jobs")
      .select("id, root_url, domain, mode, crawl_strategy, status, total_discovered, total_processed, total_success, total_failed, started_at, completed_at, updated_at")
      .order("started_at", { ascending: false })
      .limit(100),
  ]);

  if (singleRes.data) {
    for (const row of singleRes.data) {
      let domain = "";
      try { domain = new URL(row.url).hostname; } catch {}
      items.push({
        id: row.id,
        type: "single",
        url: row.url,
        domain,
        title: row.title ?? null,
        mode: row.mode ?? "source",
        crawlStrategy: null,
        status: row.status ?? "completed",
        totalPages: 1,
        totalSuccess: row.status === "completed" ? 1 : 0,
        totalFailed: row.status === "failed" ? 1 : 0,
        createdAt: row.created_at,
        updatedAt: row.updated_at ?? row.created_at,
        completedAt: row.status === "completed" ? row.updated_at ?? row.created_at : null,
        resumable: false,
      });
    }
  }

  if (deepRes.data) {
    for (const row of deepRes.data) {
      const isResumable =
        (row.status === "running" || row.status === "paused") &&
        row.total_processed < row.total_discovered;
      items.push({
        id: row.id,
        type: "deep",
        url: row.root_url,
        domain: row.domain ?? "",
        title: null,
        mode: row.mode ?? "all",
        crawlStrategy: row.crawl_strategy ?? "fetch",
        status: row.status,
        totalPages: row.total_discovered ?? 0,
        totalSuccess: row.total_success ?? 0,
        totalFailed: row.total_failed ?? 0,
        createdAt: row.started_at,
        updatedAt: row.updated_at ?? row.started_at,
        completedAt: row.completed_at ?? null,
        resumable: isResumable,
      });
    }
  }

  if (singleRes.error) console.error("[HISTORY] analyses error:", singleRes.error.message);
  if (deepRes.error) console.error("[HISTORY] deep_jobs error:", deepRes.error.message);

  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return Response.json({ items });
}
