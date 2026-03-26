import { NextRequest, NextResponse } from "next/server";
import { refineAllPages } from "@/lib/deep-analyzer/refinement";
import type { CrawledPage } from "@/types/deep-analysis";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const pages: CrawledPage[] = body.pages;
    const template = body.template ?? undefined;

    if (!Array.isArray(pages) || pages.length === 0) {
      return NextResponse.json({ error: "No pages provided" }, { status: 400 });
    }

    const refined = refineAllPages(pages, template);

    return NextResponse.json({ pages: refined });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
