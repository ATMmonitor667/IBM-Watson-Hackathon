/**
 * src/lib/ai/mergeAssistantClient.ts
 *
 * Typed client helper for POST /api/ai/merge-assistant.
 *
 * Firdosi's UI imports `callMergeAssistant` to request merge strategies without
 * needing to know the route internals, the schema shape, or how to handle errors.
 *
 * Usage:
 *   import { callMergeAssistant } from "@/lib/ai/mergeAssistantClient";
 *
 *   const result = await callMergeAssistant(canonContext);
 *   if (result.ok) {
 *     // result.data is a fully typed MergeAssistantResponse
 *   } else {
 *     // result.error describes what went wrong
 *   }
 */

import type { CanonContext, MergeAssistantResponse } from "./schemas";
import { MergeAssistantResponseSchema } from "./schemas";

// ---------------------------------------------------------------------------
// Return type — discriminated union so callers never need to access .data
// on an error path.
// ---------------------------------------------------------------------------

export type MergeAssistantResult =
  | { ok: true; data: MergeAssistantResponse }
  | { ok: false; status: number; error: string };

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

/**
 * Posts a CanonContext to /api/ai/merge-assistant and returns a typed result.
 *
 * - On HTTP 200 with a valid response body → { ok: true, data }
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

  return { ok: true, data: parsed.data };
}
