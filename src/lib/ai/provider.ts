import {
  ModelMalformedResponseError,
  ModelRateLimitError,
  ModelTimeoutError,
  ModelUnavailableError,
} from "./errors";

export interface ModelCallOptions {
  prompt: string;
  modelId?: string;
  maxNewTokens?: number;
  temperature?: number;
}

export interface ModelCallResult {
  text: string;
}

const DEFAULT_BASE_URL = "http://127.0.0.1:11434";
const DEFAULT_MODEL_ID = "llama3.2:3b";
const DEFAULT_MAX_TOKENS = 1024;
const DEFAULT_TEMPERATURE = 0;

export function getModelProvider(): "mock" | "ollama" {
  const provider = process.env.AI_PROVIDER?.trim().toLowerCase() || "mock";

  if (provider === "mock" || provider === "ollama") {
    return provider;
  }

  throw new ModelUnavailableError(
    `Unsupported AI_PROVIDER "${provider}". Use "mock" or "ollama".`,
  );
}

export async function callModel(
  options: ModelCallOptions,
): Promise<ModelCallResult> {
  const provider = getModelProvider();

  if (provider === "mock") {
    throw new ModelUnavailableError(
      "AI_PROVIDER=mock uses deterministic local responses.",
    );
  }

  const baseUrl = (process.env.AI_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(
    /\/$/,
    "",
  );
  const modelId = options.modelId ?? process.env.AI_MODEL?.trim() ?? DEFAULT_MODEL_ID;
  const timeoutMs = Number(process.env.AI_REQUEST_TIMEOUT_MS) || 15_000;
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: modelId,
        prompt: options.prompt,
        stream: false,
        format: "json",
        options: {
          num_predict: options.maxNewTokens ?? DEFAULT_MAX_TOKENS,
          temperature: options.temperature ?? DEFAULT_TEMPERATURE,
        },
      }),
      signal: controller.signal,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new ModelTimeoutError(timeoutMs);
    }

    throw new ModelUnavailableError(
      `Could not reach the local model at ${baseUrl}. Start Ollama or use AI_PROVIDER=mock.`,
    );
  } finally {
    clearTimeout(timeoutHandle);
  }

  if (response.status === 429) {
    const retryAfter = response.headers.get("Retry-After");
    throw new ModelRateLimitError(
      retryAfter !== null ? Number(retryAfter) : undefined,
    );
  }

  const rawBody = await response.text();

  if (!response.ok) {
    throw new ModelMalformedResponseError(
      rawBody,
      `HTTP ${response.status} from local model provider`,
    );
  }

  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    throw new ModelMalformedResponseError(rawBody, "top-level JSON parse failed");
  }

  const text = (json as { response?: unknown }).response;
  if (typeof text !== "string") {
    throw new ModelMalformedResponseError(
      rawBody,
      "response missing or not a string",
    );
  }

  return { text };
}
