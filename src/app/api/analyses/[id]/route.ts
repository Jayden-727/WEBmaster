import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_: Request, context: RouteContext) {
  const { id } = await context.params;
  const supabase = getServiceClient();

  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const [
    analysisRes,
    metadataRes,
    contentRes,
    stackRes,
    structureRes,
    linksRes,
    imagesRes,
    lighthouseRes,
  ] = await Promise.all([
    supabase.from("analyses").select("*").eq("id", id).single(),
    supabase.from("analysis_metadata").select("*").eq("analysis_id", id).single(),
    supabase.from("analysis_content").select("*").eq("analysis_id", id).single(),
    supabase.from("analysis_stack").select("*").eq("analysis_id", id),
    supabase.from("analysis_structure").select("*").eq("analysis_id", id),
    supabase.from("analysis_links").select("*").eq("analysis_id", id),
    supabase.from("analysis_images").select("*").eq("analysis_id", id),
    supabase.from("analysis_lighthouse").select("*").eq("analysis_id", id).single(),
  ]);

  if (analysisRes.error) {
    console.error(`[API /analyses/${id}] not found:`, analysisRes.error.message);
    return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
  }

  const analysis = analysisRes.data;

  return NextResponse.json({
    success: true,
    analysisId: analysis.id,
    url: analysis.url,
    title: analysis.title,
    mode: analysis.mode,
    status: analysis.status,
    createdAt: analysis.created_at,
    data: {
      metadata: metadataRes.data
        ? {
            title: metadataRes.data.title,
            description: metadataRes.data.description,
            canonical: metadataRes.data.canonical,
            ogTitle: metadataRes.data.og_title,
            ogDescription: metadataRes.data.og_description,
            ogImage: metadataRes.data.og_image,
            robots: metadataRes.data.robots,
            language: metadataRes.data.language,
            charset: metadataRes.data.charset,
            jsonLd: metadataRes.data.json_ld ?? [],
          }
        : null,
      content: contentRes.data
        ? {
            cleanText: contentRes.data.clean_text ?? "",
            markdownText: contentRes.data.markdown_text ?? "",
          }
        : null,
      stack: (stackRes.data ?? []).map((s) => ({
        category: s.category,
        detectedTool: s.detected_tool,
        confidence: s.confidence,
        matchedSignals: s.matched_signals_json ?? [],
      })),
      structure: (structureRes.data ?? []).map((s) => ({
        componentName: s.component_name,
        detectedCount: s.detected_count,
        confidence: s.confidence,
        matchedPatterns: s.matched_patterns_json ?? [],
      })),
      links: (linksRes.data ?? []).map((l) => ({
        href: l.href,
        text: l.text,
        isInternal: l.is_internal,
      })),
      images: (imagesRes.data ?? []).map((i) => ({
        src: i.src,
        alt: i.alt,
        isLazy: i.is_lazy,
        filename: i.filename,
      })),
      lighthouse: lighthouseRes.data
        ? {
            performanceScore: lighthouseRes.data.performance_score,
            accessibilityScore: lighthouseRes.data.accessibility_score,
            bestPracticesScore: lighthouseRes.data.best_practices_score,
            seoScore: lighthouseRes.data.seo_score,
            lcp: lighthouseRes.data.lcp,
            cls: lighthouseRes.data.cls,
            inp: lighthouseRes.data.inp,
            fcp: lighthouseRes.data.fcp,
            tbt: lighthouseRes.data.tbt,
          }
        : null,
    },
  });
}
