/**
 * src/lib/ai/__tests__/provider.test.ts
 *
 * Tests every failure path of callWatsonx():
 *   1. AI_MOCK=true  → WatsonxCredentialError
 *   2. Missing env vars → WatsonxCredentialError
 *   3. Timeout (AbortError) → WatsonxTimeoutError
 *   4. HTTP 429 → WatsonxRateLimitError  (with and without Retry-After)
 *   5. Non-JSON body → WatsonxMalformedResponseError
 *   6. Missing results[0].generated_text → WatsonxMalformedResponseError
 *   7. Happy path → returns { text }
 *
 * No real network requests are made. fetch is stubbed with vi.stubGlobal.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  WatsonxCredentialError,
  WatsonxMalformedResponseError,
  WatsonxRateLimitError,
  WatsonxTimeoutError,
} from "../errors";
import { callWatsonx } from "../provider";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal env that makes the provider think credentials are present */
function setRealEnv() {
  vi.stubEnv("AI_MOCK", "false");
  vi.stubEnv("WATSONX_API_KEY", "test-api-key");
  vi.stubEnv("WATSONX_PROJECT_ID", "test-project-id");
  vi.stubEnv("WATSONX_URL", "https://us-south.ml.cloud.ibm.com");
  vi.stubEnv("AI_REQUEST_TIMEOUT_MS", "5000");
}

/** Make fetch return a successful Watsonx envelope */
function stubFetchOk(generatedText: string) {
  const body = JSON.stringify({
    results: [{ generated_text: generatedText }],
  });
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(body, { status: 200, headers: { "Content-Type": "application/json" } })
    )
  );
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// 1. AI_MOCK=true → WatsonxCredentialError
// ---------------------------------------------------------------------------

describe("callWatsonx — mock mode", () => {
  it("throws WatsonxCredentialError when AI_MOCK=true", async () => {
    vi.stubEnv("AI_MOCK", "true");
    vi.stubEnv("WATSONX_API_KEY", "real-key");
    vi.stubEnv("WATSONX_PROJECT_ID", "real-project");
    vi.stubEnv("WATSONX_URL", "https://example.com");

    await expect(callWatsonx({ prompt: "Hello" })).rejects.toThrow(
      WatsonxCredentialError
    );
  });
});

// ---------------------------------------------------------------------------
// 2. Missing credentials → WatsonxCredentialError
// ---------------------------------------------------------------------------

describe("callWatsonx — missing credentials", () => {
  it("throws when WATSONX_API_KEY is absent", async () => {
    vi.stubEnv("AI_MOCK", "false");
    vi.stubEnv("WATSONX_PROJECT_ID", "proj");
    vi.stubEnv("WATSONX_URL", "https://example.com");
    // WATSONX_API_KEY deliberately unset

    await expect(callWatsonx({ prompt: "Hello" })).rejects.toThrow(
      WatsonxCredentialError
    );
  });

  it("throws when WATSONX_PROJECT_ID is absent", async () => {
    vi.stubEnv("AI_MOCK", "false");
    vi.stubEnv("WATSONX_API_KEY", "key");
    vi.stubEnv("WATSONX_URL", "https://example.com");

    await expect(callWatsonx({ prompt: "Hello" })).rejects.toThrow(
      WatsonxCredentialError
    );
  });

  it("throws when WATSONX_URL is absent", async () => {
    vi.stubEnv("AI_MOCK", "false");
    vi.stubEnv("WATSONX_API_KEY", "key");
    vi.stubEnv("WATSONX_PROJECT_ID", "proj");

    await expect(callWatsonx({ prompt: "Hello" })).rejects.toThrow(
      WatsonxCredentialError
    );
  });

  it("message includes the name of every missing variable", async () => {
    vi.stubEnv("AI_MOCK", "false");
    // All three missing

    const error = await callWatsonx({ prompt: "Hello" }).catch((e) => e);
    expect(error).toBeInstanceOf(WatsonxCredentialError);
    expect(error.message).toContain("WATSONX_API_KEY");
    expect(error.message).toContain("WATSONX_PROJECT_ID");
    expect(error.message).toContain("WATSONX_URL");
  });
});

// ---------------------------------------------------------------------------
// 3. Timeout → WatsonxTimeoutError
// ---------------------------------------------------------------------------

describe("callWatsonx — timeout", () => {
  it("throws WatsonxTimeoutError when fetch aborts", async () => {
    setRealEnv();

    // Simulate AbortError
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(
        Object.assign(new Error("The operation was aborted"), { name: "AbortError" })
      )
    );

    await expect(callWatsonx({ prompt: "Hello" })).rejects.toThrow(
      WatsonxTimeoutError
    );
  });

  it("WatsonxTimeoutError message mentions the timeout duration", async () => {
    setRealEnv();
    vi.stubEnv("AI_REQUEST_TIMEOUT_MS", "3000");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(
        Object.assign(new Error("aborted"), { name: "AbortError" })
      )
    );

    const err = await callWatsonx({ prompt: "Hello" }).catch((e) => e);
    expect(err.message).toContain("3000");
  });
});

// ---------------------------------------------------------------------------
// 4. HTTP 429 → WatsonxRateLimitError
// ---------------------------------------------------------------------------

describe("callWatsonx — rate limit", () => {
  it("throws WatsonxRateLimitError on HTTP 429", async () => {
    setRealEnv();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("Too Many Requests", { status: 429 }))
    );

    await expect(callWatsonx({ prompt: "Hello" })).rejects.toThrow(
      WatsonxRateLimitError
    );
  });

  it("includes retry-after seconds when the header is present", async () => {
    setRealEnv();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("Too Many Requests", {
          status: 429,
          headers: { "Retry-After": "60" },
        })
      )
    );

    const err = await callWatsonx({ prompt: "Hello" }).catch((e) => e);
    expect(err).toBeInstanceOf(WatsonxRateLimitError);
    expect(err.message).toContain("60");
  });
});

// ---------------------------------------------------------------------------
// 5. Non-JSON body → WatsonxMalformedResponseError
// ---------------------------------------------------------------------------

describe("callWatsonx — malformed response", () => {
  it("throws WatsonxMalformedResponseError when body is plain text", async () => {
    setRealEnv();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("Internal Server Error", { status: 200 })
      )
    );

    await expect(callWatsonx({ prompt: "Hello" })).rejects.toThrow(
      WatsonxMalformedResponseError
    );
  });

  it("throws WatsonxMalformedResponseError when results[0].generated_text is absent", async () => {
    setRealEnv();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ results: [] }), { status: 200 })
      )
    );

    await expect(callWatsonx({ prompt: "Hello" })).rejects.toThrow(
      WatsonxMalformedResponseError
    );
  });

  it("raw body is preserved on the error instance", async () => {
    setRealEnv();
    const weirdBody = "not json at all";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(weirdBody, { status: 200 }))
    );

    const err = await callWatsonx({ prompt: "Hello" }).catch((e) => e);
    expect(err).toBeInstanceOf(WatsonxMalformedResponseError);
    expect(err.raw).toBe(weirdBody);
  });
});

// ---------------------------------------------------------------------------
// 6. Happy path
// ---------------------------------------------------------------------------

describe("callWatsonx — success", () => {
  it("returns the generated text on a clean response", async () => {
    setRealEnv();
    stubFetchOk("The compass spun in Kael's hand.");

    const result = await callWatsonx({ prompt: "Continue the scene." });
    expect(result.text).toBe("The compass spun in Kael's hand.");
  });

  it("sends the prompt and model id in the request body", async () => {
    setRealEnv();
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ results: [{ generated_text: "ok" }] }),
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchSpy);

    await callWatsonx({
      prompt: "Describe Scene 5.",
      modelId: "ibm/granite-13b-instruct-v2",
    });

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.input).toBe("Describe Scene 5.");
    expect(body.model_id).toBe("ibm/granite-13b-instruct-v2");
  });
});

// ---------------------------------------------------------------------------
// 7. Error status codes
// ---------------------------------------------------------------------------

describe("error statusCode properties", () => {
  it("WatsonxCredentialError.statusCode is 503", () => {
    expect(new WatsonxCredentialError(["X"]).statusCode).toBe(503);
  });
  it("WatsonxTimeoutError.statusCode is 408", () => {
    expect(new WatsonxTimeoutError(5000).statusCode).toBe(408);
  });
  it("WatsonxRateLimitError.statusCode is 429", () => {
    expect(new WatsonxRateLimitError().statusCode).toBe(429);
  });
  it("WatsonxMalformedResponseError.statusCode is 502", () => {
    expect(new WatsonxMalformedResponseError("bad").statusCode).toBe(502);
  });
});
