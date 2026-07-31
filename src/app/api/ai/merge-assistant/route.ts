/**
 * src/app/api/ai/merge-assistant/route.ts
 *
 * POST /api/ai/merge-assistant
 *
 * Accepts a CanonContext, calls the Watsonx model (or returns the deterministic
 * mock when AI_MOCK=true), validates the response with Zod, and returns a
 * MergeAssistantResponse.
 *
 * The response always has previewOnly: true (enforced at the type level by
 * z.literal(true) in MergeAssistantResponseSchema).  The AI may never execute
 * a merge — it only proposes strategies for human review.
 *
 * HTTP status codes:
 *   200 — valid response (real or mock; see the X-Storyverse-AI-Source header)
 *   400 — request body failed CanonContextSchema validation
 *   408 — model request timed out
 *   429 — model rate-limited
 *   502 — model returned malformed / non-schema-conformant JSON
 *   503 — credentials missing (use AI_MOCK=true for demo)
 */

import { NextRequest, NextResponse } from "next/server";
import { CanonContextSchema, MergeAssistantResponseSchema } from "@/lib/ai/schemas";
import { callWatsonx } from "@/lib/ai/provider";
import { buildMergeAssistantPrompt } from "@/lib/ai/prompts/mergeAssistantPrompt";
import { mockMergeAssistantFor } from "@/lib/ai/mocks";
import { AI_SOURCE_HEADER } from "@/lib/ai/mergeAssistantClient";
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
  let responseJson: unknown;
  // Which of the two produced the body. Returned as a response header so the
  // UI can label a fallback as a fallback — at HTTP 200 with no flag, a missing
  // credential and a working watsonx integration are indistinguishable.
  let usedMock = false;

  try {
    const prompt = buildMergeAssistantPrompt(ctx);
    const { text } = await callWatsonx({ prompt });

    try {
      responseJson = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: "Model returned non-JSON output", raw: text },
        { status: 502 }
      );
    }
  } catch (err) {
    if (err instanceof WatsonxCredentialError) {
      // Graceful fallback to the deterministic preview, computed from THIS
      // request's context so it describes the branch the author clicked.
      responseJson = mockMergeAssistantFor(ctx);
      usedMock = true;
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

  return NextResponse.json(mergeResult.data, {
    status: 200,
    headers: { [AI_SOURCE_HEADER]: usedMock ? "mock" : "watsonx" },
  });
}

// Explicitly block non-POST methods
export async function GET() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
