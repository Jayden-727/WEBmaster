import { getServiceClient } from "@/lib/supabase/server";
import {
  MetadataAnalysis,
  StackSignalResult,
  StructureSignalResult,
  LinkAnalysis,
  ImageAnalysis,
  LighthouseMetrics,
  AnalyzeMode,
} from "@/types/analysis";

interface PersistInput {
  analysisId: string;
  url: string;
  mode: AnalyzeMode;
  title: string | null;
  rawHtml: string;
  renderedHtml: string | null;
  metadata: MetadataAnalysis;
  content: { cleanText: string; markdownText: string };
  stack: StackSignalResult[];
  structure: StructureSignalResult[];
  links: LinkAnalysis[];
  images: ImageAnalysis[];
  lighthouse: LighthouseMetrics;
}

export async function persistAnalysis(input: PersistInput): Promise<boolean> {
  const supabase = getServiceClient();
  if (!supabase) {
    console.warn("[PERSIST] Supabase client not available — skipping DB save");
    return false;
  }

  try {
    console.log(`[PERSIST] saving analysis ${input.analysisId}`);

    const { error: analysisErr } = await supabase.from("analyses").insert({
      id: input.analysisId,
      user_id: "00000000-0000-0000-0000-000000000000",
      url: input.url,
      mode: input.mode,
      status: "completed",
      title: input.title,
    });
    if (analysisErr) throw new Error(`analyses insert: ${analysisErr.message}`);

    const { error: metaErr } = await supabase.from("analysis_metadata").insert({
      analysis_id: input.analysisId,
      title: input.metadata.title,
      description: input.metadata.description,
      canonical: input.metadata.canonical,
      og_title: input.metadata.ogTitle,
      og_description: input.metadata.ogDescription,
      og_image: input.metadata.ogImage,
      robots: input.metadata.robots,
      language: input.metadata.language,
      charset: input.metadata.charset,
      json_ld: input.metadata.jsonLd,
    });
    if (metaErr) throw new Error(`analysis_metadata insert: ${metaErr.message}`);

    const { error: contentErr } = await supabase.from("analysis_content").insert({
      analysis_id: input.analysisId,
      raw_html: input.rawHtml,
      rendered_html: input.renderedHtml,
      clean_text: input.content.cleanText,
      markdown_text: input.content.markdownText,
    });
    if (contentErr) throw new Error(`analysis_content insert: ${contentErr.message}`);

    if (input.stack.length > 0) {
      const { error: stackErr } = await supabase.from("analysis_stack").insert(
        input.stack.map((s) => ({
          analysis_id: input.analysisId,
          category: s.category,
          detected_tool: s.detectedTool,
          confidence: s.confidence,
          matched_signals_json: s.matchedSignals,
        }))
      );
      if (stackErr) throw new Error(`analysis_stack insert: ${stackErr.message}`);
    }

    if (input.structure.length > 0) {
      const { error: structErr } = await supabase.from("analysis_structure").insert(
        input.structure.map((s) => ({
          analysis_id: input.analysisId,
          component_name: s.componentName,
          detected_count: s.detectedCount,
          confidence: s.confidence,
          matched_patterns_json: s.matchedPatterns,
        }))
      );
      if (structErr) throw new Error(`analysis_structure insert: ${structErr.message}`);
    }

    if (input.links.length > 0) {
      const { error: linksErr } = await supabase.from("analysis_links").insert(
        input.links.map((l) => ({
          analysis_id: input.analysisId,
          href: l.href,
          text: l.text,
          is_internal: l.isInternal,
        }))
      );
      if (linksErr) throw new Error(`analysis_links insert: ${linksErr.message}`);
    }

    if (input.images.length > 0) {
      const { error: imagesErr } = await supabase.from("analysis_images").insert(
        input.images.map((i) => ({
          analysis_id: input.analysisId,
          src: i.src,
          alt: i.alt,
          is_lazy: i.isLazy,
          filename: i.filename,
        }))
      );
      if (imagesErr) throw new Error(`analysis_images insert: ${imagesErr.message}`);
    }

    const { error: lhErr } = await supabase.from("analysis_lighthouse").insert({
      analysis_id: input.analysisId,
      performance_score: input.lighthouse.performanceScore,
      accessibility_score: input.lighthouse.accessibilityScore,
      best_practices_score: input.lighthouse.bestPracticesScore,
      seo_score: input.lighthouse.seoScore,
      lcp: input.lighthouse.lcp,
      cls: input.lighthouse.cls,
      inp: input.lighthouse.inp,
      fcp: input.lighthouse.fcp,
      tbt: input.lighthouse.tbt,
      raw_json: input.lighthouse.rawJson,
    });
    if (lhErr) throw new Error(`analysis_lighthouse insert: ${lhErr.message}`);

    console.log(`[PERSIST] analysis ${input.analysisId} saved successfully`);
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[PERSIST] FAILED to save analysis ${input.analysisId}:`, msg);
    return false;
  }
}
