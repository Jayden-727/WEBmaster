import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { analyzePage } from "@/lib/services/analyze-page";
import { isValidHttpUrl } from "@/lib/utils/url";

const schema = z.object({
  url: z.string().min(1),
  mode: z.enum(["source", "rendered"]),
});

export async function POST(request: NextRequest) {
  console.log("[API /analyze] POST received");

  try {
    const body = schema.parse(await request.json());
    console.log("[API /analyze] validated input:", body.url, body.mode);

    if (!isValidHttpUrl(body.url)) {
      console.warn("[API /analyze] rejected — invalid URL:", body.url);
      return NextResponse.json(
        { success: false, error: "Invalid URL — must start with http:// or https://" },
        { status: 400 }
      );
    }

    const result = await analyzePage(body);

    console.log(`[API /analyze] done — analysisId=${result.analysisId} success=${result.success} errors=${result.errors.length}`);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[API /analyze] unhandled error:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
