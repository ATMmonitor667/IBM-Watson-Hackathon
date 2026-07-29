/**
 * src/app/api/ai/character-refine/route.test.ts
 *
 * Integration tests for POST /api/ai/character-refine.
 * The route handler is called directly — no real HTTP server required.
 *
 * Tests:
 *   1. AI_MOCK=true  → returns deterministic mock (Kael after compass loss)
 *   2. mock response always has requiresApproval=true (z.literal enforcement)
 *   3. Bad request body → 400
 *   4. Missing characterId → 400
 *   5. Watsonx timeout → 408
 *   6. Watsonx rate limit → 429
 *   7. Model returns non-JSON → 502
 *   8. Model returns JSON that has requiresApproval=false → 502
 *   9. Real credentials, model returns valid JSON → 200
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/ai/character-refine", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Minimal valid request body (CanonContext + characterId) */
const VALID_BODY = {
  projectId: "demo-1",
  branchName: "feature/save-the-stranger",
  canonFacts: [
    {
      key: "compass_state",
      value: "lost in Scene 4 – given to The Ferryman",
      lockedInScene: 4,
    },
  ],
  branchFacts: [],
  sceneHistory: [
    "The Surface Breaks",
    "The Market Beneath",
    "The Lighthouse Signal",
    "Below the Archive",
    "The Choice at the Gate",
  ],
  characterSummary:
    "Kael — explorer, mid-30s, worn leather coat, glowing compass on belt.",
  characterId: "char-kael-1",
};

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// 1. Mock mode → deterministic Kael proposal
// ---------------------------------------------------------------------------

describe("POST /api/ai/character-refine — mock mode", () => {
  it("returns 200 with the deterministic mock when AI_MOCK=true", async () => {
    vi.stubEnv("AI_MOCK", "true");

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(200);
  });

  // 2. requiresApproval must always be true (z.literal enforcement)
  it("mock response always has requiresApproval=true", async () => {
    vi.stubEnv("AI_MOCK", "true");

    const res = await POST(makeRequest(VALID_BODY));
    const data = await res.json();
    expect(data.requiresApproval).toBe(true);
  });

  it("mock response contains a proposedDescription", async () => {
    vi.stubEnv("AI_MOCK", "true");

    const res = await POST(makeRequest(VALID_BODY));
    const data = await res.json();
    expect(typeof data.proposedDescription).toBe("string");
    expect(data.proposedDescription.length).toBeGreaterThan(0);
  });

  it("mock response contains a proposedGenerationInstruction", async () => {
    vi.stubEnv("AI_MOCK", "true");

    const res = await POST(makeRequest(VALID_BODY));
    const data = await res.json();
    expect(typeof data.proposedGenerationInstruction).toBe("string");
    expect(data.proposedGenerationInstruction.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 3 & 4. Invalid request body → 400
// ---------------------------------------------------------------------------

describe("POST /api/ai/character-refine — validation errors", () => {
  it("returns 400 when projectId is missing", async () => {
    vi.stubEnv("AI_MOCK", "true");

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { projectId, ...noId } = VALID_BODY;
    const res = await POST(makeRequest(noId));
    expect(res.status).toBe(400);
  });

  it("returns 400 when characterId is missing", async () => {
    vi.stubEnv("AI_MOCK", "true");

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { characterId, ...noCharId } = VALID_BODY;
    const res = await POST(makeRequest(noCharId));
    expect(res.status).toBe(400);
  });

  it("returns 400 when characterId is an empty string", async () => {
    vi.stubEnv("AI_MOCK", "true");

    const res = await POST(makeRequest({ ...VALID_BODY, characterId: "" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when the body is not JSON", async () => {
    vi.stubEnv("AI_MOCK", "true");

    const req = new NextRequest("http://localhost/api/ai/character-refine", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: "not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// 5. Watsonx timeout → 408
// ---------------------------------------------------------------------------

describe("POST /api/ai/character-refine — timeout", () => {
  it("returns 408 when the provider times out", async () => {
    vi.stubEnv("AI_MOCK", "false");
    vi.stubEnv("WATSONX_API_KEY", "key");
    vi.stubEnv("WATSONX_PROJECT_ID", "proj");
    vi.stubEnv("WATSONX_URL", "https://example.com");
    vi.stubEnv("AI_REQUEST_TIMEOUT_MS", "100");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(
        Object.assign(new Error("aborted"), { name: "AbortError" })
      )
    );

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(408);
  });
});

// ---------------------------------------------------------------------------
// 6. Rate limit → 429
// ---------------------------------------------------------------------------

describe("POST /api/ai/character-refine — rate limit", () => {
  it("returns 429 when the Watsonx API rate-limits the request", async () => {
    vi.stubEnv("AI_MOCK", "false");
    vi.stubEnv("WATSONX_API_KEY", "key");
    vi.stubEnv("WATSONX_PROJECT_ID", "proj");
    vi.stubEnv("WATSONX_URL", "https://example.com");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("Too Many Requests", { status: 429 }))
    );

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(429);
  });
});

// ---------------------------------------------------------------------------
// 7 & 8. Malformed model output → 502
// ---------------------------------------------------------------------------

describe("POST /api/ai/character-refine — malformed model output", () => {
  it("returns 502 when the model returns plain text instead of JSON", async () => {
    vi.stubEnv("AI_MOCK", "false");
    vi.stubEnv("WATSONX_API_KEY", "key");
    vi.stubEnv("WATSONX_PROJECT_ID", "proj");
    vi.stubEnv("WATSONX_URL", "https://example.com");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ results: [{ generated_text: "I cannot help with that." }] }),
          { status: 200 }
        )
      )
    );

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(502);
  });

  // 8. requiresApproval=false is rejected by z.literal(true)
  it("returns 502 when model JSON has requiresApproval=false", async () => {
    vi.stubEnv("AI_MOCK", "false");
    vi.stubEnv("WATSONX_API_KEY", "key");
    vi.stubEnv("WATSONX_PROJECT_ID", "proj");
    vi.stubEnv("WATSONX_URL", "https://example.com");

    const badResponse = JSON.stringify({
      results: [
        {
          generated_text: JSON.stringify({
            characterId: "char-kael-1",
            proposedDescription: "Kael updated.",
            proposedGenerationInstruction: "Full body Kael.",
            changeRationale: "Compass removed.",
            // z.literal(true) will reject this
            requiresApproval: false,
          }),
        },
      ],
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(badResponse, { status: 200 }))
    );

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(502);
  });
});

// ---------------------------------------------------------------------------
// 9. Real credentials, valid model response → 200
// ---------------------------------------------------------------------------

describe("POST /api/ai/character-refine — successful real call", () => {
  it("returns 200 with parsed schema when model returns valid JSON", async () => {
    vi.stubEnv("AI_MOCK", "false");
    vi.stubEnv("WATSONX_API_KEY", "key");
    vi.stubEnv("WATSONX_PROJECT_ID", "proj");
    vi.stubEnv("WATSONX_URL", "https://example.com");

    const validResponse = {
      characterId: "char-kael-1",
      proposedDescription:
        "Kael — explorer, mid-30s. Worn leather coat. Empty belt holster.",
      proposedGenerationInstruction:
        "Full-body Kael. No compass. Empty holster. Flooded city. Graphic-novel style.",
      changeRationale: "Compass removed following canon lock at Scene 4.",
      requiresApproval: true as const,
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            results: [{ generated_text: JSON.stringify(validResponse) }],
          }),
          { status: 200 }
        )
      )
    );

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.requiresApproval).toBe(true);
    expect(data.characterId).toBe("char-kael-1");
  });
});
