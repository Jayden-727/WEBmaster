import { NextRequest } from "next/server";
import { z } from "zod";
import { crawlSite } from "@/lib/deep-analyzer/site-crawler";

const schema = z.object({
  rootUrl: z.string().min(1),
  maxPages: z.number().int().min(1).max(50),
  maxDepth: z.number().int().min(1).max(5),
  queue: z.array(
    z.object({
      url: z.string(),
      parentUrl: z.string().nullable(),
      depth: z.number(),
    }),
  ),
  visited: z.array(z.string()),
  pagesCrawled: z.number().int().min(0),
});

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.parse(body);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of crawlSite({
            rootUrl: parsed.rootUrl,
            maxPages: parsed.maxPages,
            maxDepth: parsed.maxDepth,
            initialQueue: parsed.queue,
            initialVisited: parsed.visited,
            initialPagesCrawled: parsed.pagesCrawled,
          })) {
            controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          controller.enqueue(
            encoder.encode(
              JSON.stringify({ type: "error", url: parsed.rootUrl, message: msg }) + "\n",
            ),
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-cache",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 400 });
  }
}
