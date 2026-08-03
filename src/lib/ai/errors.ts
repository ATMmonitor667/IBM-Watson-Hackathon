export class ModelTimeoutError extends Error {
  readonly statusCode = 408;

  constructor(timeoutMs: number) {
    super(`Model request timed out after ${timeoutMs} ms`);
    this.name = "ModelTimeoutError";
  }
}

export class ModelRateLimitError extends Error {
  readonly statusCode = 429;

  constructor(retryAfterSeconds?: number) {
    const hint =
      retryAfterSeconds !== undefined
        ? ` (retry after ${retryAfterSeconds}s)`
        : "";
    super(`Model rate limit exceeded${hint}`);
    this.name = "ModelRateLimitError";
  }
}

export class ModelUnavailableError extends Error {
  readonly statusCode = 503;

  constructor(message: string) {
    super(message);
    this.name = "ModelUnavailableError";
  }
}

export class ModelMalformedResponseError extends Error {
  readonly statusCode = 502;
  readonly raw: string;

  constructor(raw: string, detail?: string) {
    const hint = detail ? ` — ${detail}` : "";
    super(`Model response could not be parsed as valid JSON${hint}`);
    this.name = "ModelMalformedResponseError";
    this.raw = raw;
  }
}
