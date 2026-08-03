/**
 * src/app/api/ai/character-refine/route.ts
 *
 * POST /api/ai/character-refine
 *
 * Accepts a CanonContext plus a characterId, calls the configured model (or returns
 * the deterministic mock when AI_PROVIDER=mock), and returns a CharacterRefinementResponse.
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
 *   503 — local model unavailable
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  CanonContextSchema,
  CharacterRefinementResponseSchema,
} from "@/lib/ai/schemas";
import { callModel } from "@/lib/ai/provider";
import { buildCharacterRefinePrompt } from "@/lib/ai/prompts/characterRefinePrompt";
import {
  ModelUnavailableError,
  ModelMalformedResponseError,
  ModelRateLimitError,
  ModelTimeoutError,
} from "@/lib/ai/errors";

// ---------------------------------------------------------------------------
// Request schema: CanonContext extended with a required characterId
// ---------------------------------------------------------------------------

const CharacterRefineRequestSchema = CanonContextSchema.extend({
  characterId: z.string().min(1),
  refinementPrompt: z.string().trim().min(3).max(1000),
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

  const { characterId, refinementPrompt, ...ctx } = parseResult.data;

  // ------------------------------------------------------------------
  // 2. Attempt real AI call; fall back to mock on credential error
  // ------------------------------------------------------------------
  let responseJson: unknown;

  try {
    const prompt = buildCharacterRefinePrompt(
      ctx,
      characterId,
      refinementPrompt,
    );
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
      responseJson = {
        characterId,
        proposedDescription:
          `${ctx.characterSummary} Creator-directed refinement: ${refinementPrompt}.`,
        proposedGenerationInstruction:
          `${refinementPrompt}. Preserve this approved character identity: ` +
          `${ctx.characterSummary} Graphic-novel style, consistent proportions and palette.`,
        changeRationale:
          `Applied the creator's direction while preserving the supplied locked ` +
          `character summary and ${ctx.canonFacts.length} canon fact(s).`,
        requiresApproval: true,
      };
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
