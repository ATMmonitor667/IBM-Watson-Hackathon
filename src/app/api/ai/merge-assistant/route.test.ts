/**
 * src/app/api/ai/merge-assistant/route.test.ts
 *
 * Integration tests for POST /api/ai/merge-assistant.
 * The route handler is called directly — no real HTTP server required.
 *
 * Tests:
 *   1. AI_MOCK=true  → returns deterministic mock with compass conflict
 *   2. mock response has previewOnly === true (z.literal enforcement)
 *   3. Bad request body → 400
 *   4. Watsonx timeout → 408
 *   5. Watsonx rate limit → 429
 *   6. Model returns non-JSON → 502
 *   7. Model returns JSON that fails MergeAssistantResponseSchema (previewOnly=false) → 502
 *   8. Real credentials present, model returns valid JSON → 200
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/ai/merge-assistant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Minimal valid CanonContext for request body */
const VALID_CONTEXT = {
  projectId: "demo-1",
  branchName: "feature/save-the-stranger",
  canonFacts: [
    {
      key: "compass_state",
      value: "lost in Scene 4 – given to The Ferryman",
      lockedInScene: 4,
    },
  ],
  branchFacts: [
    {
      key: "compass_state",
      value: "in Kael's hand in Scene 5",
      lockedInScene: 5,
    },
  ],
  sceneHistory: [
    "The Surface Breaks",
    "The Market Beneath",
    "The Lighthouse Signal",
    "Below the Archive",
    "The Choice at the Gate",
  ],
  characterSummary: "Kael — explorer, mid-30s, worn leather coat.",
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
// 1. Mock mode → deterministic compass conflict
// ---------------------------------------------------------------------------

describe("POST /api/ai/merge-assistant — mock mode", () => {
  it("returns 200 with the deterministic mock when AI_MOCK=true", async () => {
    vi.stubEnv("AI_MOCK", "true");

    const res = await POST(makeRequest(VALID_CONTEXT));
    expect(res.status).toBe(200);
  });

  // 2. previewOnly must always be true (z.literal enforcement)
  it("mock response always has previewOnly=true", async () => {
    vi.stubEnv("AI_MOCK", "true");

    const res = await POST(makeRequest(VALID_CONTEXT));
    const data = await res.json();
    expect(data.previewOnly).toBe(true);
  });

  it("mock response includes at least one true conflict", async () => {
    vi.stubEnv("AI_MOCK", "true");

    const res = await POST(makeRequest(VALID_CONTEXT));
    const data = await res.json();
    expect(data.trueConflicts).toBeInstanceOf(Array);
    expect(data.trueConflicts.length).toBeGreaterThanOrEqual(1);
  });

  it("mock response includes 2 or 3 strategies", async () => {
    vi.stubEnv("AI_MOCK", "true");

    const res = await POST(makeRequest(VALID_CONTEXT));
    const data = await res.json();
    expect(data.strategies.length).toBeGreaterThanOrEqual(2);
    expect(data.strategies.length).toBeLessThanOrEqual(3);
  });
});

// ---------------------------------------------------------------------------
// 3. Invalid request body → 400
// ---------------------------------------------------------------------------

describe("POST /api/ai/merge-assistant — validation errors", () => {
  it("returns 400 when projectId is missing", async () => {
    vi.stubEnv("AI_MOCK", "true");

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { projectId, ...noId } = VALID_CONTEXT;
    const res = await POST(makeRequest(noId));
    expect(res.status).toBe(400);
  });

  it("returns 400 when branchName is empty", async () => {
    vi.stubEnv("AI_MOCK", "true");

    const res = await POST(makeRequest({ ...VALID_CONTEXT, branchName: "" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when the body is not JSON", async () => {
    vi.stubEnv("AI_MOCK", "true");

    const req = new NextRequest("http://localhost/api/ai/merge-assistant", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: "not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// 4. Watsonx timeout → 408
// ---------------------------------------------------------------------------

describe("POST /api/ai/merge-assistant — timeout", () => {
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

    const res = await POST(makeRequest(VALID_CONTEXT));
    expect(res.status).toBe(408);
  });
});

// ---------------------------------------------------------------------------
// 5. Rate limit → 429
// ---------------------------------------------------------------------------

describe("POST /api/ai/merge-assistant — rate limit", () => {
  it("returns 429 when the Watsonx API rate-limits the request", async () => {
    vi.stubEnv("AI_MOCK", "false");
    vi.stubEnv("WATSONX_API_KEY", "key");
    vi.stubEnv("WATSONX_PROJECT_ID", "proj");
    vi.stubEnv("WATSONX_URL", "https://example.com");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("Too Many Requests", { status: 429 }))
    );

    const res = await POST(makeRequest(VALID_CONTEXT));
    expect(res.status).toBe(429);
  });
});

// ---------------------------------------------------------------------------
// 6. Model returns non-JSON → 502
// ---------------------------------------------------------------------------

describe("POST /api/ai/merge-assistant — malformed model output", () => {
  it("returns 502 when the model returns plain text instead of JSON", async () => {
    vi.stubEnv("AI_MOCK", "false");
    vi.stubEnv("WATSONX_API_KEY", "key");
    vi.stubEnv("WATSONX_PROJECT_ID", "proj");
    vi.stubEnv("WATSONX_URL", "https://example.com");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ results: [{ generated_text: "Sorry, I cannot help." }] }),
          { status: 200 }
        )
      )
    );

    const res = await POST(makeRequest(VALID_CONTEXT));
    expect(res.status).toBe(502);
  });

  // 7. Model returns JSON but previewOnly=false → rejected by z.literal(true)
  it("returns 502 when model JSON has previewOnly=false (z.literal violation)", async () => {
    vi.stubEnv("AI_MOCK", "false");
    vi.stubEnv("WATSONX_API_KEY", "key");
    vi.stubEnv("WATSONX_PROJECT_ID", "proj");
    vi.stubEnv("WATSONX_URL", "https://example.com");

    const badResponse = JSON.stringify({
      results: [
        {
          generated_text: JSON.stringify({
            branchName: "feature/save-the-stranger",
            branchSummary: "Branch summary.",
            compatibleChanges: [],
            trueConflicts: [],
            strategies: [
              {
                id: "s1",
                label: "Strategy 1",
                description: "Desc 1",
                tradeoffs: "None",
                includedSceneIds: [],
              },
              {
                id: "s2",
                label: "Strategy 2",
                description: "Desc 2",
                tradeoffs: "None",
                includedSceneIds: [],
              },
            ],
            // z.literal(true) will reject this
            previewOnly: false,
          }),
        },
      ],
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(badResponse, { status: 200 }))
    );

    const res = await POST(makeRequest(VALID_CONTEXT));
    expect(res.status).toBe(502);
  });
});

// ---------------------------------------------------------------------------
// 8. Real credentials, valid model response → 200
// ---------------------------------------------------------------------------

describe("POST /api/ai/merge-assistant — successful real call", () => {
  it("returns 200 with parsed schema when model returns valid JSON", async () => {
    vi.stubEnv("AI_MOCK", "false");
    vi.stubEnv("WATSONX_API_KEY", "key");
    vi.stubEnv("WATSONX_PROJECT_ID", "proj");
    vi.stubEnv("WATSONX_URL", "https://example.com");

    const validResponse = {
      branchName: "feature/save-the-stranger",
      branchSummary: "Branch introduces a save-the-stranger outcome.",
      compatibleChanges: ["Modified Scene 5 dialogue"],
      trueConflicts: ["Compass used after Scene 4 loss"],
      strategies: [
        {
          id: "remove-compass",
          label: "Remove compass from Scene 5",
          description: "Accept all changes except compass use.",
          tradeoffs: "Simplest merge. Loses the visual callback.",
          includedSceneIds: ["scene-branch-5-modified"],
        },
        {
          id: "compass-return",
          label: "Add compass-return beat",
          description: "Insert a scene where The Ferryman returns the compass.",
          tradeoffs: "Preserves symbolism. Requires one extra scene.",
          includedSceneIds: ["scene-branch-4b-return", "scene-branch-5-modified"],
        },
      ],
      previewOnly: true as const,
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

    const res = await POST(makeRequest(VALID_CONTEXT));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.previewOnly).toBe(true);
    expect(data.strategies.length).toBeGreaterThanOrEqual(2);
  });
});
