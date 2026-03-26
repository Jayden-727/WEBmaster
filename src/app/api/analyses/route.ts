import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = getServiceClient();

  if (!supabase) {
    return NextResponse.json({ items: [], error: "Database not configured" });
  }

  const { data, error } = await supabase
    .from("analyses")
    .select("id, url, mode, status, title, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("[API /analyses] query error:", error.message);
    return NextResponse.json({ items: [], error: error.message });
  }

  const items = (data ?? []).map((row) => ({
    id: row.id,
    url: row.url,
    title: row.title,
    mode: row.mode,
    status: row.status,
    createdAt: row.created_at,
  }));

  return NextResponse.json({ items });
}
