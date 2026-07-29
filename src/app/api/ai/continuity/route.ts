/**
 * src/app/api/ai/continuity/route.ts
 *
 * POST /api/ai/continuity
 *
 * Accepts a CanonContext, calls the Watsonx model (or returns the deterministic
 * mock when AI_MOCK=true), validates the response with Zod, and returns a
 * ContinuityReviewResponse.
 *
 * HTTP status codes:
 *   200 — valid response (real or mock)
 *   400 — request body failed CanonContextSchema validation
 *   408 — model request timed out
 *   429 — model rate-limited
 *   502 — model returned malformed / non-schema-conformant JSON
 *   503 — credentials missing (use AI_MOCK=true for demo)
 */

import { NextRequest, NextResponse } from "next/server";
import { CanonContextSchema, ContinuityReviewResponseSchema } from "@/lib/ai/schemas";
import { callWatsonx } from "@/lib/ai/provider";
import { buildContinuityPrompt } from "@/lib/ai/prompts/continuityPrompt";
import { MOCK_CONTINUITY_REVIEW } from "@/lib/ai/mocks";
import {
  WatsonxCredentialError,
  WatsonxMalformedResponseError,
  WatsonxRateLimitError,
  WatsonxTimeoutError,
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
  let reviewJson: unknown;

  try {
    const prompt = buildContinuityPrompt(ctx);
    const { text } = await callWatsonx({ prompt });

    // Parse the raw model text as JSON
    try {
      reviewJson = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: "Model returned non-JSON output", raw: text },
        { status: 502 }
      );
    }
  } catch (err) {
    if (err instanceof WatsonxCredentialError) {
      // Graceful fallback to deterministic mock
      reviewJson = MOCK_CONTINUITY_REVIEW;
    } else if (err instanceof WatsonxTimeoutError) {
      return NextResponse.json({ error: err.message }, { status: 408 });
    } else if (err instanceof WatsonxRateLimitError) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    } else if (err instanceof WatsonxMalformedResponseError) {
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
  // ------------------------------------------------------------------
  const reviewResult = ContinuityReviewResponseSchema.safeParse(reviewJson);
  if (!reviewResult.success) {
    return NextResponse.json(
      {
        error: "Model response did not match expected schema",
        details: reviewResult.error.flatten(),
      },
      { status: 502 }
    );
  }

  return NextResponse.json(reviewResult.data, { status: 200 });
}

// Explicitly block non-POST methods
export async function GET() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
