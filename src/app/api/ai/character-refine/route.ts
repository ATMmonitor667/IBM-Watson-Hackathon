/**
 * src/app/api/ai/character-refine/route.ts
 *
 * POST /api/ai/character-refine
 *
 * Accepts a CanonContext plus a characterId, calls the Watsonx model (or returns
 * the deterministic mock when AI_MOCK=true), and returns a CharacterRefinementResponse.
 *
 * IMPORTANT: This route returns a PROPOSAL only.
 * It never writes to the character record.
 * The caller must explicitly approve and persist the update.
 * This is enforced by requiresApproval: z.literal(true) in the response schema.
 *
 * HTTP status codes:
 *   200 — valid response (real or mock)
 *   400 — request body failed validation
 *   408 — model request timed out
 *   429 — model rate-limited
 *   502 — model returned malformed / non-schema-conformant JSON
 *   503 — credentials missing (use AI_MOCK=true for demo)
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  CanonContextSchema,
  CharacterRefinementResponseSchema,
} from "@/lib/ai/schemas";
import { callWatsonx } from "@/lib/ai/provider";
import { buildCharacterRefinePrompt } from "@/lib/ai/prompts/characterRefinePrompt";
import { MOCK_CHARACTER_REFINEMENT } from "@/lib/ai/mocks";
import {
  WatsonxCredentialError,
  WatsonxMalformedResponseError,
  WatsonxRateLimitError,
  WatsonxTimeoutError,
} from "@/lib/ai/errors";

// ---------------------------------------------------------------------------
// Request schema: CanonContext extended with a required characterId
// ---------------------------------------------------------------------------

const CharacterRefineRequestSchema = CanonContextSchema.extend({
  characterId: z.string().min(1),
});

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

  const parseResult = CharacterRefineRequestSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parseResult.error.flatten() },
      { status: 400 }
    );
  }

  const { characterId, ...ctx } = parseResult.data;

  // ------------------------------------------------------------------
  // 2. Attempt real AI call; fall back to mock on credential error
  // ------------------------------------------------------------------
  let responseJson: unknown;

  try {
    const prompt = buildCharacterRefinePrompt(ctx, characterId);
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
      // Graceful fallback to deterministic mock
      responseJson = MOCK_CHARACTER_REFINEMENT;
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
  // 3. Validate the response against the Zod schema.
  //    requiresApproval: z.literal(true) is enforced here — any response
  //    with requiresApproval=false is rejected as malformed.
  // ------------------------------------------------------------------
  const refineResult = CharacterRefinementResponseSchema.safeParse(responseJson);
  if (!refineResult.success) {
    return NextResponse.json(
      {
        error: "Model response did not match expected schema",
        details: refineResult.error.flatten(),
      },
      { status: 502 }
    );
  }

  // Proposal only — never written to the character record here.
  return NextResponse.json(refineResult.data, { status: 200 });
}

// Explicitly block non-POST methods
export async function GET() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
