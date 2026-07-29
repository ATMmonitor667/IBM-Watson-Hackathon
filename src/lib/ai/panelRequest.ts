/**
 * src/lib/ai/panelRequest.ts
 *
 * Builds a PanelGenerationRequest for the image pipeline and exposes a
 * deterministic fallback that returns a prepared asset plus the full context
 * object — so the demo can show what would have been sent without making a
 * real image API call.
 *
 * This module is pure — no I/O, no network calls.
 */

import type { CanonContext, PanelGenerationRequest } from "./schemas";
import { PanelGenerationRequestSchema } from "./schemas";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** The inputs needed to build a panel generation request */
export interface BuildPanelRequestInput {
  projectId: string;
  sceneId: string;
  sceneDescription: string;
  styleInstruction: string;
  ctx: CanonContext;
}

/** What the fallback returns: the prepared asset URL and the full request object */
export interface PanelFallbackResult {
  /** URL of the prepared (pre-generated) demo asset */
  assetUrl: string;
  /** The full request that would have been sent to the image model */
  request: PanelGenerationRequest;
}

// ---------------------------------------------------------------------------
// Prepared fallback asset — used when the image pipeline is unavailable
// ---------------------------------------------------------------------------

/**
 * The URL of the demo panel image shown when the real image model is not called.
 * Swap this for any publicly accessible demo image or a local /public path.
 */
const FALLBACK_ASSET_URL =
  "/demo/panel-kael-scene5-fallback.png" as const;

// ---------------------------------------------------------------------------
// buildPanelRequest
// ---------------------------------------------------------------------------

/**
 * Constructs a validated PanelGenerationRequest from the inputs.
 *
 * Throws a ZodError if the assembled object does not satisfy
 * PanelGenerationRequestSchema — this surfaces mismatches early rather than
 * letting bad requests reach the image service.
 *
 * @param input - Scene, project, and style details.
 * @returns     A fully validated PanelGenerationRequest.
 */
export function buildPanelRequest(
  input: BuildPanelRequestInput
): PanelGenerationRequest {
  const raw = {
    projectId: input.projectId,
    sceneId: input.sceneId,
    lockedCharacterDescription: input.ctx.characterSummary,
    canonFacts: input.ctx.canonFacts,
    sceneDescription: input.sceneDescription,
    styleInstruction: input.styleInstruction,
    useFallback: false,
  };

  // Parse through Zod to apply defaults (useFallback has .default(false))
  // and surface any structural issues immediately.
  return PanelGenerationRequestSchema.parse(raw);
}

// ---------------------------------------------------------------------------
// getPanelFallback
// ---------------------------------------------------------------------------

/**
 * Returns a deterministic fallback result for demo and test purposes.
 *
 * The fallback builds the full request that *would* have been sent to the
 * image model (with useFallback: true so downstream consumers can distinguish
 * it from a real request), then returns it alongside the prepared asset URL.
 *
 * This allows the demo UI to show:
 *   - The exact prompt / context that would have been used
 *   - A pre-generated image representing what the model would produce
 *
 * @param input - Same inputs as buildPanelRequest.
 * @returns     The fallback asset URL and the full context request object.
 */
export function getPanelFallback(
  input: BuildPanelRequestInput
): PanelFallbackResult {
  const request = PanelGenerationRequestSchema.parse({
    projectId: input.projectId,
    sceneId: input.sceneId,
    lockedCharacterDescription: input.ctx.characterSummary,
    canonFacts: input.ctx.canonFacts,
    sceneDescription: input.sceneDescription,
    styleInstruction: input.styleInstruction,
    useFallback: true,
  });

  return {
    assetUrl: FALLBACK_ASSET_URL,
    request,
  };
}
