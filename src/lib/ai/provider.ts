/**
 * src/lib/ai/provider.ts
 *
 * Single entry-point for all Watsonx model calls.
 *
 * When AI_MOCK=true (or when credentials are absent) the function throws
 * WatsonxCredentialError — callers decide whether to substitute a mock.
 * This keeps the provider honest: it never silently falls back internally.
 *
 * Usage:
 *   const raw = await callWatsonx({ prompt, modelId });
 *   // parse raw with the appropriate Zod schema
 */

import {
  WatsonxCredentialError,
  WatsonxMalformedResponseError,
  WatsonxRateLimitError,
  WatsonxTimeoutError,
} from "./errors";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WatsonxCallOptions {
  /** The full prompt string to send to the model */
  prompt: string;
  /** Watsonx model ID, e.g. "ibm/granite-13b-instruct-v2" */
  modelId?: string;
  /** Maximum tokens to generate (default: 1024) */
  maxNewTokens?: number;
  /** Temperature — 0 for deterministic output (default: 0) */
  temperature?: number;
}

export interface WatsonxCallResult {
  /** Raw text returned by the model (may be partial JSON) */
  text: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_MODEL_ID = "ibm/granite-13b-instruct-v2";
const DEFAULT_MAX_TOKENS = 1024;
const DEFAULT_TEMPERATURE = 0;

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------

/**
 * Calls the IBM Watsonx text-generation API and returns the raw model text.
 *
 * Throws typed errors for every failure path:
 *   - WatsonxCredentialError  — missing env vars or AI_MOCK=true
 *   - WatsonxTimeoutError     — request exceeded AI_REQUEST_TIMEOUT_MS
 *   - WatsonxRateLimitError   — API returned HTTP 429
 *   - WatsonxMalformedResponseError — response body was not valid JSON
 *
 * Does NOT parse or validate the model output against a Zod schema.
 * That is the caller's responsibility (typically an API route).
 */
export async function callWatsonx(
  options: WatsonxCallOptions
): Promise<WatsonxCallResult> {
  // ------------------------------------------------------------------
  // Guard: mock mode or missing credentials
  // ------------------------------------------------------------------
  const isMock = process.env.AI_MOCK === "true";
  const apiKey = process.env.WATSONX_API_KEY?.trim();
  const projectId = process.env.WATSONX_PROJECT_ID?.trim();
  const baseUrl = process.env.WATSONX_URL?.trim();

  const missing: string[] = [];
  if (!apiKey) missing.push("WATSONX_API_KEY");
  if (!projectId) missing.push("WATSONX_PROJECT_ID");
  if (!baseUrl) missing.push("WATSONX_URL");

  if (isMock || missing.length > 0) {
    throw new WatsonxCredentialError(
      isMock ? ["AI_MOCK=true — real calls disabled"] : missing
    );
  }

  // ------------------------------------------------------------------
  // Build request
  // ------------------------------------------------------------------
  const modelId = options.modelId ?? DEFAULT_MODEL_ID;
  const timeoutMs =
    Number(process.env.AI_REQUEST_TIMEOUT_MS) || 15_000;

  const requestBody = {
    model_id: modelId,
    input: options.prompt,
    parameters: {
      max_new_tokens: options.maxNewTokens ?? DEFAULT_MAX_TOKENS,
      temperature: options.temperature ?? DEFAULT_TEMPERATURE,
    },
    project_id: projectId,
  };

  // ------------------------------------------------------------------
  // Fetch with timeout
  // ------------------------------------------------------------------
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(
      `${baseUrl}/ml/v1/text/generation?version=2023-05-29`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      }
    );
  } catch (err: unknown) {
    clearTimeout(timeoutHandle);
    // AbortController fires a DOMException with name "AbortError"
    if (err instanceof Error && err.name === "AbortError") {
      throw new WatsonxTimeoutError(timeoutMs);
    }
    throw err;
  } finally {
    clearTimeout(timeoutHandle);
  }

  // ------------------------------------------------------------------
  // HTTP-level errors
  // ------------------------------------------------------------------
  if (response.status === 429) {
    const retryAfter = response.headers.get("Retry-After");
    throw new WatsonxRateLimitError(
      retryAfter !== null ? Number(retryAfter) : undefined
    );
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "(unreadable)");
    throw new WatsonxMalformedResponseError(
      body,
      `HTTP ${response.status} from Watsonx API`
    );
  }

  // ------------------------------------------------------------------
  // Parse JSON envelope
  // ------------------------------------------------------------------
  let json: unknown;
  const rawBody = await response.text();
  try {
    json = JSON.parse(rawBody);
  } catch {
    throw new WatsonxMalformedResponseError(rawBody, "top-level JSON parse failed");
  }

  // Watsonx text generation responses nest the output under results[0].generated_text
  const text =
    (json as { results?: { generated_text?: string }[] })?.results?.[0]
      ?.generated_text;

  if (typeof text !== "string") {
    throw new WatsonxMalformedResponseError(
      rawBody,
      "results[0].generated_text missing or not a string"
    );
  }

  return { text };
}
