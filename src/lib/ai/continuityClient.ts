/**
 * src/lib/ai/continuityClient.ts
 *
 * Typed client helper for POST /api/ai/continuity.
 *
 * Mirrors mergeAssistantClient.ts: the caller passes a CanonContext and gets a
 * discriminated union back, so there is no error path on which `.data` can be
 * read and no throw to forget to catch.
 *
 * The review surface (issue #12 / D4) uses this for the NARRATIVE layer only.
 * The findings themselves are computed by src/lib/ai/continuityRules.ts before
 * this is ever called, so every failure encoded below degrades the review from
 * "explained" to "computed but not written up" — never to "not checked".
 */

import type { CanonContext, ContinuityReviewResponse } from "./schemas";
import { ContinuityReviewResponseSchema } from "./schemas";

export type ContinuityReviewResult =
  | { ok: true; data: ContinuityReviewResponse }
  | { ok: false; status: number; error: string };

/**
 * Posts a CanonContext to /api/ai/continuity and returns a typed result.
 *
 * - HTTP 200 with a valid body  → { ok: true, data }
 * - any non-200 status          → { ok: false, status, error }
 * - network error               → { ok: false, status: 0, error }
 * - body that fails the schema  → { ok: false, status: 200, error }
 */
export async function callContinuityReview(
  ctx: CanonContext,
): Promise<ContinuityReviewResult> {
  let response: Response;

  try {
    response = await fetch("/api/ai/continuity", {
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
      if (typeof errorBody.error === "string") errorMessage = errorBody.error;
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

  const parsed = ContinuityReviewResponseSchema.safeParse(rawBody);
  if (!parsed.success) {
    return {
      ok: false,
      status: response.status,
      error: "Response did not match ContinuityReviewResponseSchema",
    };
  }

  return { ok: true, data: parsed.data };
}
