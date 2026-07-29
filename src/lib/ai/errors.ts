/**
 * src/lib/ai/errors.ts
 *
 * Typed error classes for every failure mode in the Watsonx provider.
 * Catch these in API routes to return the correct HTTP status codes.
 */

/** HTTP 408 / network timeout waiting for a model response */
export class WatsonxTimeoutError extends Error {
  readonly statusCode = 408;
  constructor(timeoutMs: number) {
    super(`Watsonx request timed out after ${timeoutMs} ms`);
    this.name = "WatsonxTimeoutError";
  }
}

/** HTTP 429 returned by the Watsonx API — caller should retry with back-off */
export class WatsonxRateLimitError extends Error {
  readonly statusCode = 429;
  constructor(retryAfterSeconds?: number) {
    const hint =
      retryAfterSeconds !== undefined
        ? ` (retry after ${retryAfterSeconds}s)`
        : "";
    super(`Watsonx rate limit exceeded${hint}`);
    this.name = "WatsonxRateLimitError";
  }
}

/**
 * WATSONX_API_KEY or WATSONX_PROJECT_ID is missing from the environment.
 * Results in HTTP 503 from our routes — the service is intentionally unavailable.
 */
export class WatsonxCredentialError extends Error {
  readonly statusCode = 503;
  constructor(missingVars: string[]) {
    super(
      `Watsonx credentials missing: ${missingVars.join(", ")}. ` +
        "Set AI_MOCK=true or provide real credentials."
    );
    this.name = "WatsonxCredentialError";
  }
}

/**
 * The model returned a non-JSON body or a body that did not satisfy the
 * expected Zod schema. Results in HTTP 502 from our routes.
 */
export class WatsonxMalformedResponseError extends Error {
  readonly statusCode = 502;
  readonly raw: string;
  constructor(raw: string, zodMessage?: string) {
    const hint = zodMessage ? ` — ${zodMessage}` : "";
    super(`Watsonx response could not be parsed as valid JSON${hint}`);
    this.name = "WatsonxMalformedResponseError";
    this.raw = raw;
  }
}
