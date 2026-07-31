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
 *   9. Fallback describes the branch that was actually requested (not a
 *      hardcoded one) and reports its real fact collisions
 *  10. Provenance header says whether a model was called
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

// ---------------------------------------------------------------------------
// 9. The fallback must describe the branch that was actually requested
// ---------------------------------------------------------------------------

describe("POST /api/ai/merge-assistant — fallback is about the requested branch", () => {
  /** The context the workspace actually sends: a branch with its own name. */
  const TUNNEL_CONTEXT = {
    ...VALID_CONTEXT,
    branchName: "The Tunnel Route",
    branchFacts: [
      {
        key: "prop:the-compass",
        value: 'The Compass is in play in Scene 6 "The Hidden Tunnel"',
        lockedInScene: 6,
      },
    ],
    sceneHistory: [...VALID_CONTEXT.sceneHistory, "[branch] The Hidden Tunnel"],
  };

  it("echoes the requested branch name rather than a hardcoded one", async () => {
    vi.stubEnv("AI_MOCK", "true");

    const res = await POST(makeRequest(TUNNEL_CONTEXT));
    const data = await res.json();

    // The bug: a panel headed "The Tunnel Route" describing
    // "feature/save-the-stranger" and scenes that do not exist.
    expect(data.branchName).toBe("The Tunnel Route");
    expect(JSON.stringify(data)).not.toContain("feature/save-the-stranger");
  });

  it("names the branch's own added scenes", async () => {
    vi.stubEnv("AI_MOCK", "true");

    const res = await POST(makeRequest(TUNNEL_CONTEXT));
    const data = await res.json();

    expect(JSON.stringify(data.compatibleChanges)).toContain("The Hidden Tunnel");
  });

  it("reports the fact collision between branch and canon as a true conflict", async () => {
    vi.stubEnv("AI_MOCK", "true");

    const res = await POST(
      makeRequest({
        ...TUNNEL_CONTEXT,
        canonFacts: [
          {
            key: "prop:the-compass",
            value: 'The Compass is in play in Scene 1 "The Surface Breaks"',
            lockedInScene: 1,
          },
        ],
      }),
    );
    const data = await res.json();

    expect(data.trueConflicts.length).toBeGreaterThanOrEqual(1);
    expect(data.trueConflicts[0]).toContain("prop:the-compass");
  });

  it("labels itself as a non-model response in the summary", async () => {
    vi.stubEnv("AI_MOCK", "true");

    const res = await POST(makeRequest(TUNNEL_CONTEXT));
    const data = await res.json();

    // Honest even if the provenance header is lost in transit.
    expect(data.branchSummary).toMatch(/no model call/i);
  });

  it("gives every strategy a non-empty trade-off", async () => {
    vi.stubEnv("AI_MOCK", "true");

    const res = await POST(makeRequest(TUNNEL_CONTEXT));
    const data = await res.json();

    for (const strategy of data.strategies) {
      expect(strategy.tradeoffs.length).toBeGreaterThan(0);
      expect(strategy.description.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// 10. Provenance — a 200 must say whether a model was called
// ---------------------------------------------------------------------------

describe("POST /api/ai/merge-assistant — provenance header", () => {
  it("marks the credential fallback as mock", async () => {
    vi.stubEnv("AI_MOCK", "true");

    const res = await POST(makeRequest(VALID_CONTEXT));
    expect(res.headers.get("X-Storyverse-AI-Source")).toBe("mock");
  });

  it("marks a real model response as watsonx", async () => {
    vi.stubEnv("AI_MOCK", "false");
    vi.stubEnv("WATSONX_API_KEY", "key");
    vi.stubEnv("WATSONX_PROJECT_ID", "proj");
    vi.stubEnv("WATSONX_URL", "https://example.com");

    const validResponse = {
      branchName: "The Tunnel Route",
      branchSummary: "Branch takes the aqueduct instead of the lighthouse.",
      compatibleChanges: ["Adds The Hidden Tunnel"],
      trueConflicts: [],
      strategies: [
        {
          id: "accept-branch",
          label: "Accept as written",
          description: "Merge every branch scene unchanged.",
          tradeoffs: "Fastest. No fact conflicts detected.",
          includedSceneIds: ["The Hidden Tunnel"],
        },
        {
          id: "scene-by-scene",
          label: "Merge scene by scene",
          description: "Bring scenes in one at a time.",
          tradeoffs: "Cheaper to undo. Slower.",
          includedSceneIds: ["The Hidden Tunnel"],
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
    expect(res.headers.get("X-Storyverse-AI-Source")).toBe("watsonx");
  });
});
