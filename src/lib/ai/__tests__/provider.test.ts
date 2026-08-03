import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ModelMalformedResponseError,
  ModelRateLimitError,
  ModelTimeoutError,
  ModelUnavailableError,
} from "../errors";
import { callModel, getModelProvider } from "../provider";

function useOllama() {
  vi.stubEnv("AI_PROVIDER", "ollama");
  vi.stubEnv("AI_MODEL", "test-model");
  vi.stubEnv("AI_BASE_URL", "http://localhost:11434");
  vi.stubEnv("AI_REQUEST_TIMEOUT_MS", "5000");
}

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("getModelProvider", () => {
  it("defaults to offline mock mode", () => {
    expect(getModelProvider()).toBe("mock");
  });

  it("rejects unsupported providers", () => {
    vi.stubEnv("AI_PROVIDER", "cloud-service");
    expect(() => getModelProvider()).toThrow(ModelUnavailableError);
  });
});

describe("callModel", () => {
  it("signals deterministic fallback in mock mode", async () => {
    vi.stubEnv("AI_PROVIDER", "mock");
    await expect(callModel({ prompt: "Hello" })).rejects.toThrow(
      ModelUnavailableError,
    );
  });

  it("returns text from a local Ollama response", async () => {
    useOllama();
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ response: '{"summary":"ok"}' }), {
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchSpy);

    const result = await callModel({ prompt: "Review this story." });

    expect(result.text).toBe('{"summary":"ok"}');
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:11434/api/generate");
    expect(init.headers).toEqual({ "Content-Type": "application/json" });
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe("test-model");
    expect(body.prompt).toBe("Review this story.");
    expect(body.stream).toBe(false);
    expect(body.format).toBe("json");
  });

  it("maps aborts to a timeout error", async () => {
    useOllama();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(
        Object.assign(new Error("aborted"), { name: "AbortError" }),
      ),
    );

    await expect(callModel({ prompt: "Hello" })).rejects.toThrow(
      ModelTimeoutError,
    );
  });

  it("maps connection failures to an unavailable error", async () => {
    useOllama();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    await expect(callModel({ prompt: "Hello" })).rejects.toThrow(
      ModelUnavailableError,
    );
  });

  it("maps rate limits", async () => {
    useOllama();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("slow down", { status: 429 })),
    );

    await expect(callModel({ prompt: "Hello" })).rejects.toThrow(
      ModelRateLimitError,
    );
  });

  it("rejects malformed provider responses", async () => {
    useOllama();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ done: true }), { status: 200 }),
      ),
    );

    await expect(callModel({ prompt: "Hello" })).rejects.toThrow(
      ModelMalformedResponseError,
    );
  });
});
