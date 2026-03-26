import { NextRequest } from "next/server";
import { z } from "zod";
import { crawlSite } from "@/lib/deep-analyzer/site-crawler";
import { isValidHttpUrl } from "@/lib/utils/url";

const schema = z.object({
  url: z.string().min(1),
  maxPages: z.number().int().min(1).max(50).default(10),
  maxDepth: z.number().int().min(1).max(5).default(3),
});

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.parse(body);

    if (!isValidHttpUrl(parsed.url)) {
      return Response.json({ error: "Invalid URL" }, { status: 400 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of crawlSite({
            rootUrl: parsed.url,
            maxPages: parsed.maxPages,
            maxDepth: parsed.maxDepth,
          })) {
            controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          controller.enqueue(
            encoder.encode(
              JSON.stringify({ type: "error", url: parsed.url, message: msg }) + "\n",
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
