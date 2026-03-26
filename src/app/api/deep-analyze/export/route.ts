import { NextRequest, NextResponse } from "next/server";
import { generateCombinedMarkdown, generateSinglePageMarkdown } from "@/lib/deep-analyzer/export-service";
import { refineAllPages } from "@/lib/deep-analyzer/refinement";
import type { CrawledPage } from "@/types/deep-analysis";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      pages,
      rootUrl = "",
      scope = "all",
      pageUrl,
      template,
    } = body as {
      pages: CrawledPage[];
      rootUrl?: string;
      scope?: "all" | "single";
      pageUrl?: string;
      template?: Record<string, boolean>;
    };

    if (!Array.isArray(pages) || pages.length === 0) {
      return NextResponse.json({ error: "No pages provided" }, { status: 400 });
    }

    let markdown: string;
    let filename: string;

    if (scope === "single" && pageUrl) {
      const page = pages.find((p) => p.url === pageUrl);
      if (!page) {
        return NextResponse.json({ error: "Page not found" }, { status: 404 });
      }
      markdown = generateSinglePageMarkdown(page, template);
      let slug = "page";
      try { slug = new URL(page.url).pathname.replace(/\//g, "_").replace(/^_/, "") || "index"; } catch {}
      filename = `${slug}.md`;
    } else {
      markdown = generateCombinedMarkdown(pages, rootUrl, template);
      let domain = "site";
      try { domain = new URL(rootUrl).hostname.replace(/\./g, "_"); } catch {}
      filename = `${domain}_report.md`;
    }

    return new Response(markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
