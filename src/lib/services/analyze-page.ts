import { runFullLighthouseAnalysis } from "@/lib/lighthouse/run-lighthouse";
import { extractContent } from "@/lib/parser/content";
import { extractLinksAndImages } from "@/lib/parser/links-images";
import { extractMetadata } from "@/lib/parser/metadata";
import { detectStack } from "@/lib/stack-detection/detect-stack";
import { detectStructure } from "@/lib/structure-detection/detect-structure";
import { persistAnalysis } from "@/lib/services/persist-analysis";
import {
  AnalyzeRequest,
  AnalyzeApiResponse,
  MetadataAnalysis,
  StackSignalResult,
  StructureSignalResult,
  LinkAnalysis,
  ImageAnalysis,
  LighthouseMetrics,
  LighthouseInsightCard,
  SectionError,
} from "@/types/analysis";

const FETCH_TIMEOUT_MS = 30_000;

function makeError(section: string, message: string, detail?: string, fallbackUsed?: string): SectionError {
  return { section, message, detail, fallbackUsed, timestamp: new Date().toISOString() };
}

function runStep<T>(label: string, fn: () => T): { data: T | null; error: SectionError | null } {
  try {
    console.log(`[ANALYZE] step:start ${label}`);
    const start = Date.now();
    const data = fn();
    console.log(`[ANALYZE] step:done  ${label} (${Date.now() - start}ms)`);
    return { data, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error(`[ANALYZE] step:FAIL ${label}:`, msg);
    return { data: null, error: makeError(label, msg, stack) };
  }
}

async function runAsyncStep<T>(label: string, fn: () => Promise<T>): Promise<{ data: T | null; error: SectionError | null }> {
  try {
    console.log(`[ANALYZE] step:start ${label}`);
    const start = Date.now();
    const data = await fn();
    console.log(`[ANALYZE] step:done  ${label} (${Date.now() - start}ms)`);
    return { data, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error(`[ANALYZE] step:FAIL ${label}:`, msg);
    return { data: null, error: makeError(label, msg, stack) };
  }
}

const emptyMetadata: MetadataAnalysis = {
  title: null, description: null, canonical: null,
  ogTitle: null, ogDescription: null, ogImage: null,
  robots: null, language: null, charset: null, jsonLd: [],
};

const emptyLighthouse: LighthouseMetrics = {
  performanceScore: null, accessibilityScore: null,
  bestPracticesScore: null, seoScore: null,
  lcp: null, cls: null, inp: null, fcp: null, tbt: null,
  rawJson: null,
};

export async function analyzePage(input: AnalyzeRequest): Promise<AnalyzeApiResponse> {
  const analysisId = crypto.randomUUID();
  const errors: SectionError[] = [];
  const warnings: string[] = [];

  console.log(`[ANALYZE] ===== START analysisId=${analysisId} url=${input.url} mode=${input.mode} =====`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  const htmlResult = await runAsyncStep("crawler", async () => {
    const res = await fetch(input.url, {
      headers: { "User-Agent": "PageIntelBot/0.1 (+https://pageintel.local)" },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    return res.text();
  });
  clearTimeout(timeout);

  if (htmlResult.error) errors.push(htmlResult.error);

  const rawHtml = htmlResult.data ?? "";

  if (!rawHtml) {
    console.log(`[ANALYZE] ===== ABORT — no HTML fetched =====`);
    return {
      success: false, analysisId, url: input.url, title: null, mode: input.mode, persisted: false,
      data: {
        metadata: emptyMetadata, content: { cleanText: "", markdownText: "" },
        stack: [], structure: [], links: [], images: [],
        lighthouse: emptyLighthouse, lighthouseInsights: [],
      },
      errors, warnings: ["HTML fetch failed — all downstream steps skipped"],
    };
  }

  const metaR = runStep("metadata", () => extractMetadata(rawHtml));
  if (metaR.error) errors.push(metaR.error);
  const metadata = metaR.data ?? emptyMetadata;

  const contentR = runStep("content", () => extractContent(rawHtml));
  if (contentR.error) errors.push(contentR.error);
  const content = contentR.data ?? { cleanText: "", markdownText: "" };

  const liR = runStep("links", () => extractLinksAndImages(rawHtml, input.url));
  if (liR.error) errors.push(liR.error);
  const links: LinkAnalysis[] = liR.data?.links ?? [];
  const images: ImageAnalysis[] = liR.data?.images ?? [];

  const stackR = runStep("stack", () => detectStack(rawHtml));
  if (stackR.error) errors.push(stackR.error);
  const stack: StackSignalResult[] = stackR.data ?? [];

  const structR = runStep("structure", () => detectStructure(rawHtml));
  if (structR.error) errors.push(structR.error);
  const structure: StructureSignalResult[] = structR.data ?? [];

  const lhR = await runAsyncStep("lighthouse", () => runFullLighthouseAnalysis(input.url));
  if (lhR.error) {
    lhR.error.fallbackUsed = "Scores unavailable — both local Lighthouse and PageSpeed API failed";
    errors.push(lhR.error);
  }
  const lighthouse = lhR.data?.metrics ?? emptyLighthouse;
  const lighthouseInsights: LighthouseInsightCard[] = lhR.data?.insights ?? [];

  if (lhR.data?.source === "pagespeed-api") {
    warnings.push("Lighthouse scores provided by PageSpeed Insights API (local Chrome was unavailable)");
  }

  if (input.mode === "rendered") {
    warnings.push("Rendered DOM mode is not yet implemented — used source HTML instead");
  }

  console.log(`[ANALYZE] pipeline complete — title=${metadata.title}, stack=${stack.length}, links=${links.length}, images=${images.length}, errors=${errors.length}`);

  const persisted = await persistAnalysis({
    analysisId, url: input.url, mode: input.mode, title: metadata.title,
    rawHtml, renderedHtml: null, metadata, content, stack, structure, links, images, lighthouse,
  });

  if (!persisted) {
    warnings.push("Database persistence skipped (Supabase not configured or save failed)");
  }

  const response: AnalyzeApiResponse = {
    success: true, analysisId, url: input.url, title: metadata.title, mode: input.mode, persisted,
    data: { metadata, content: { cleanText: content.cleanText, markdownText: content.markdownText }, stack, structure, links, images, lighthouse, lighthouseInsights },
    errors, warnings,
  };

  console.log(`[ANALYZE] ===== END analysisId=${analysisId} persisted=${persisted} =====`);
  return response;
}
