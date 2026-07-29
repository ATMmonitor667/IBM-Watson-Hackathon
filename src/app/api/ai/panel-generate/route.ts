/**
 * src/app/api/ai/panel-generate/route.ts
 *
 * POST /api/ai/panel-generate
 *
 * Accepts a PanelGenerationRequest body, validates it, then either:
 *   - Returns a deterministic fallback (AI_MOCK=true or useFallback:true)
 *   - Calls the image pipeline with the locked context (future integration)
 *
 * HTTP status codes:
 *   200 — { assetUrl, request, isFallback }
 *   400 — request body failed PanelGenerationRequestSchema validation
 */

import { NextRequest, NextResponse } from "next/server";
import { PanelGenerationRequestSchema } from "@/lib/ai/schemas";
import { getPanelFallback, buildPanelRequest } from "@/lib/ai/panelRequest";

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
      { status: 400 },
    );
  }

  const parsed = PanelGenerationRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const panelReq = parsed.data;

  // ------------------------------------------------------------------
  // 2. Use fallback when AI_MOCK=true or the caller explicitly asked for it
  // ------------------------------------------------------------------
  const useMock = process.env.AI_MOCK === "true";

  if (useMock || panelReq.useFallback) {
    const fallbackInput = {
      projectId: panelReq.projectId,
      sceneId: panelReq.sceneId,
      sceneDescription: panelReq.sceneDescription,
      styleInstruction: panelReq.styleInstruction,
      ctx: {
        projectId: panelReq.projectId,
        branchName: "canon",
        canonFacts: panelReq.canonFacts,
        branchFacts: [],
        sceneHistory: [],
        characterSummary: panelReq.lockedCharacterDescription,
      },
    };

    const result = getPanelFallback(fallbackInput);

    return NextResponse.json(
      {
        assetUrl: result.assetUrl,
        request: result.request,
        isFallback: true,
      },
      { status: 200 },
    );
  }

  // ------------------------------------------------------------------
  // 3. Live image generation (placeholder — swap in real pipeline)
  // ------------------------------------------------------------------
  // Build the validated request to show what would be sent:
  const liveReq = buildPanelRequest({
    projectId: panelReq.projectId,
    sceneId: panelReq.sceneId,
    sceneDescription: panelReq.sceneDescription,
    styleInstruction: panelReq.styleInstruction,
    ctx: {
      projectId: panelReq.projectId,
      branchName: "canon",
      canonFacts: panelReq.canonFacts,
      branchFacts: [],
      sceneHistory: [],
      characterSummary: panelReq.lockedCharacterDescription,
    },
  });

  // TODO: replace with real image model call
  // const imageUrl = await callImagePipeline(liveReq);
  // For now, fall back to the prepared asset and flag it honestly.
  const fallback = getPanelFallback({
    projectId: liveReq.projectId,
    sceneId: liveReq.sceneId,
    sceneDescription: liveReq.sceneDescription,
    styleInstruction: liveReq.styleInstruction,
    ctx: {
      projectId: liveReq.projectId,
      branchName: "canon",
      canonFacts: liveReq.canonFacts,
      branchFacts: [],
      sceneHistory: [],
      characterSummary: liveReq.lockedCharacterDescription,
    },
  });

  return NextResponse.json(
    {
      assetUrl: fallback.assetUrl,
      request: fallback.request,
      isFallback: true,
    },
    { status: 200 },
  );
}

// Explicitly block non-POST methods
export async function GET() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
