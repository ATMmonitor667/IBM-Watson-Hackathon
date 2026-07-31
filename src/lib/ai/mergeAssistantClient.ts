/**
 * src/lib/ai/mergeAssistantClient.ts
 *
 * Typed client helper for POST /api/ai/merge-assistant, plus the request
 * builder that grounds the call in the author's actual scene data.
 *
 * Firdosi's UI imports `callMergeAssistant` to request merge strategies without
 * needing to know the route internals, the schema shape, or how to handle errors.
 *
 * Usage:
 *   import { buildMergeContext, callMergeAssistant } from "@/lib/ai/mergeAssistantClient";
 *
 *   const result = await callMergeAssistant(buildMergeContext(branch, canonBranch));
 *   if (result.ok) {
 *     // result.data is a fully typed MergeAssistantResponse
 *     // result.isMock says whether a model was actually called
 *   } else {
 *     // result.error describes what went wrong
 *   }
 */

import type { Branch, Scene } from "@/types/workspace";
import type { CanonContext, CanonFact, MergeAssistantResponse } from "./schemas";
import { MergeAssistantResponseSchema } from "./schemas";
import { buildCanonContext, type ContextScene } from "./contextBuilder";

/**
 * Response header the route sets to say where the body came from:
 * "watsonx" (a real model call) or "mock" (the deterministic fallback).
 *
 * Without it, a missing credential and a working integration are the same
 * HTTP 200 — which is exactly the failure you do not want to discover on
 * stage. Exported so the route and the UI cannot disagree about the spelling.
 */
export const AI_SOURCE_HEADER = "X-Storyverse-AI-Source";

// ---------------------------------------------------------------------------
// Return type — discriminated union so callers never need to access .data
// on an error path.
// ---------------------------------------------------------------------------

export type MergeAssistantResult =
  | { ok: true; data: MergeAssistantResponse; isMock: boolean }
  | { ok: false; status: number; error: string };

// ---------------------------------------------------------------------------
// Request building — workspace branches → grounded CanonContext
//
// WHY THIS LIVES HERE
//
// The merge assistant is only as good as the facts it is handed. The workspace
// `Scene` type (src/types/workspace.ts) has no `facts` field, so a caller that
// simply forwards scene titles ships `canonFacts: []` / `branchFacts: []` — the
// prompt then renders "(none)" for both and the model is asked to compare two
// timelines it knows nothing about. It will answer anyway, and it will be
// making things up.
//
// So the facts are DERIVED from the structured fields the author already fills
// in — `propsUsed` and `characters` — one fact per entity per scene, keyed by
// entity. buildCanonContext() then routes any key the branch and canon both
// claim into `branchFacts`, where the prompt shows it under
// "BRANCH-SPECIFIC FACTS (potential conflicts)" and findContradictions() can
// enumerate it. Every fact quotes a scene number and title, so a strategy that
// cites one can be checked against the board (PRD §20).
// ---------------------------------------------------------------------------

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * The canon facts a single scene establishes.
 *
 * Props and cast are kept in separate key namespaces ("prop:" / "character:")
 * because the demo data uses both for the same entity — "The Compass" is a cast
 * entry in Scene 1 and a prop in the branch — and collapsing them would report
 * a contradiction between two statements that agree.
 */
export function factsFromScene(scene: Scene): CanonFact[] {
  // lockedInScene is z.number().int().positive(); a scene numbered 0 would fail
  // CanonContextSchema at the route and turn a preview into a 400.
  if (!Number.isInteger(scene.sceneNumber) || scene.sceneNumber < 1) return [];

  const where = `Scene ${scene.sceneNumber} "${scene.title}"`;
  const at = scene.location ? ` at ${scene.location}` : "";
  const facts: CanonFact[] = [];

  for (const prop of scene.propsUsed ?? []) {
    facts.push({
      key: `prop:${slug(prop)}`,
      value: `${prop} is in play in ${where}${at}${scene.action ? ` — ${scene.action}` : ""}`,
      lockedInScene: scene.sceneNumber,
    });
  }

  for (const character of scene.characters) {
    facts.push({
      key: `character:${slug(character)}`,
      value: `${character} appears in ${where}${at}`,
      lockedInScene: scene.sceneNumber,
    });
  }

  return facts;
}

function toContextBranch(branch: Branch): {
  name: string;
  isCanon: boolean;
  scenes: ContextScene[];
} {
  return {
    name: branch.name,
    isCanon: branch.isCanon,
    scenes: branch.scenes.map((scene) => ({
      sceneNumber: scene.sceneNumber,
      title: scene.title,
      facts: factsFromScene(scene),
    })),
  };
}

/**
 * The cast canon has actually established, used when no character sheet is
 * locked. Stating that plainly beats inventing a description the model will
 * then treat as canon.
 */
function castSummary(canonBranch: Branch): string {
  const cast = [...new Set(canonBranch.scenes.flatMap((s) => s.characters))];
  return cast.length > 0
    ? `No character sheet is locked for this project yet. Cast established in canon: ${cast.join(", ")}.`
    : "No character sheet is locked for this project yet, and canon names no cast.";
}

/**
 * Builds the CanonContext for a merge preview of `branch` against `canonBranch`.
 *
 * @param characterSummary the locked character description, when one exists.
 *        Omit it and the cast established in canon is described instead.
 */
export function buildMergeContext(
  branch: Branch,
  canonBranch: Branch,
  characterSummary?: string
): CanonContext {
  return buildCanonContext(
    toContextBranch(branch),
    toContextBranch(canonBranch),
    branch.projectId,
    characterSummary?.trim() || castSummary(canonBranch)
  );
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

/**
 * Posts a CanonContext to /api/ai/merge-assistant and returns a typed result.
 *
 * - On HTTP 200 with a valid response body → { ok: true, data, isMock }
 * - On any non-200 HTTP status            → { ok: false, status, error }
 * - On a network error                    → { ok: false, status: 0, error }
 * - On a body that fails schema parsing   → { ok: false, status: 200, error }
 *
 * Designed to be called from React components or server actions.
 * Does not throw — all failure modes are encoded in the return type.
 */
export async function callMergeAssistant(
  ctx: CanonContext
): Promise<MergeAssistantResult> {
  let response: Response;

  try {
    response = await fetch("/api/ai/merge-assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ctx),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error";
    return { ok: false, status: 0, error: message };
  }

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    try {
      const errorBody = (await response.json()) as { error?: string };
      if (typeof errorBody.error === "string") {
        errorMessage = errorBody.error;
      }
    } catch {
      // ignore — use the generic status message
    }
    return { ok: false, status: response.status, error: errorMessage };
  }

  let rawBody: unknown;
  try {
    rawBody = await response.json();
  } catch {
    return {
      ok: false,
      status: response.status,
      error: "Response body was not valid JSON",
    };
  }

  const parsed = MergeAssistantResponseSchema.safeParse(rawBody);
  if (!parsed.success) {
    return {
      ok: false,
      status: response.status,
      error: "Response did not match MergeAssistantResponseSchema",
    };
  }

  // Absent header → treat as mock. A response that cannot prove a model was
  // called should not be presented as one.
  const source = response.headers.get(AI_SOURCE_HEADER);
  return { ok: true, data: parsed.data, isMock: source !== "watsonx" };
}
