/**
 * src/app/api/ai/merge-assistant/route.ts
 *
 * POST /api/ai/merge-assistant
 *
 * Accepts a CanonContext, calls the configured model (or returns the deterministic
 * mock when AI_PROVIDER=mock), validates the response with Zod, and returns a
 * MergeAssistantResponse.
 *
 * The response always has previewOnly: true (enforced at the type level by
 * z.literal(true) in MergeAssistantResponseSchema).  The AI may never execute
 * a merge — it only proposes strategies for human review.
 *
 * HTTP status codes:
 *   200 — valid response (real or mock)
 *   400 — request body failed CanonContextSchema validation
 *   408 — model request timed out
 *   429 — model rate-limited
 *   502 — model returned malformed / non-schema-conformant JSON
 *   503 — local model unavailable
 */

import { NextRequest, NextResponse } from "next/server";
import { CanonContextSchema, MergeAssistantResponseSchema } from "@/lib/ai/schemas";
import { callModel } from "@/lib/ai/provider";
import { buildMergeAssistantPrompt } from "@/lib/ai/prompts/mergeAssistantPrompt";
import { MOCK_MERGE_ASSISTANT } from "@/lib/ai/mocks";
import {
  ModelUnavailableError,
  ModelMalformedResponseError,
  ModelRateLimitError,
  ModelTimeoutError,
} from "@/lib/ai/errors";

export async function POST(req: NextRequest) {
  // ------------------------------------------------------------------
  // 1. Parse and validate the request body
  // ------------------------------------------------------------------
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON" },
      { status: 400 }
    );
  }

  const contextResult = CanonContextSchema.safeParse(body);
  if (!contextResult.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: contextResult.error.flatten() },
      { status: 400 }
    );
  }

  const ctx = contextResult.data;

  // ------------------------------------------------------------------
  // 2. Attempt real AI call; fall back to mock on credential error
  // ------------------------------------------------------------------
  let responseJson: unknown;

  try {
    const prompt = buildMergeAssistantPrompt(ctx);
    const { text } = await callModel({ prompt });

    try {
      responseJson = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: "Model returned non-JSON output", raw: text },
        { status: 502 }
      );
    }
  } catch (err) {
    if (err instanceof ModelUnavailableError) {
      // Graceful fallback to deterministic mock
      responseJson = MOCK_MERGE_ASSISTANT;
    } else if (err instanceof ModelTimeoutError) {
      return NextResponse.json({ error: err.message }, { status: 408 });
    } else if (err instanceof ModelRateLimitError) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    } else if (err instanceof ModelMalformedResponseError) {
      return NextResponse.json(
        { error: err.message, raw: err.raw },
        { status: 502 }
      );
    } else {
      throw err; // unexpected — let Next.js handle it
    }
  }

  // ------------------------------------------------------------------
  // 3. Validate the response (real or mock) against the Zod schema
  //    previewOnly: z.literal(true) is enforced here — any response
  //    missing that field or setting it to false will be rejected.
  // ------------------------------------------------------------------
  const mergeResult = MergeAssistantResponseSchema.safeParse(responseJson);
  if (!mergeResult.success) {
    return NextResponse.json(
      {
        error: "Model response did not match expected schema",
        details: mergeResult.error.flatten(),
      },
      { status: 502 }
    );
  }

  return NextResponse.json(mergeResult.data, { status: 200 });
}

// Explicitly block non-POST methods
export async function GET() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
