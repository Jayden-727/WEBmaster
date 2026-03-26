import { NextRequest } from "next/server";
import { z } from "zod";
import { createJob } from "@/lib/deep-analyzer/job-service";
import { isValidHttpUrl } from "@/lib/utils/url";

const schema = z.object({
  url: z.string().min(1),
  mode: z.enum(["all", "max"]).default("all"),
  maxPages: z.number().int().min(1).max(10000).default(25),
  maxDepth: z.number().int().min(1).max(20).default(3),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.parse(body);

    if (!isValidHttpUrl(parsed.url)) {
      return Response.json({ error: "Invalid URL" }, { status: 400 });
    }

    const result = await createJob({
      rootUrl: parsed.url,
      mode: parsed.mode,
      maxPages: parsed.maxPages,
      maxDepth: parsed.maxDepth,
    });

    if (!result.job) {
      return Response.json(
        { error: result.error ?? "Failed to create job (unknown error)" },
        { status: 503 },
      );
    }

    return Response.json({ jobId: result.job.id, status: result.job.status });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 400 });
  }
}
