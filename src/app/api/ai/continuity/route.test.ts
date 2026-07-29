/**
 * src/app/api/ai/continuity/route.test.ts
 *
 * Integration tests for POST /api/ai/continuity.
 * The route handler is called directly — no real HTTP server required.
 *
 * Tests:
 *   1. AI_MOCK=true  → returns deterministic mock with compass contradiction
 *   2. Bad request body → 400
 *   3. Watsonx timeout → 408
 *   4. Watsonx rate limit → 429
 *   5. Model returns non-JSON → 502
 *   6. Model returns JSON that fails ContinuityReviewResponseSchema → 502
 *   7. Real credentials present, model returns valid JSON → 200
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/ai/continuity", {
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
// 1. Mock mode → deterministic compass contradiction
// ---------------------------------------------------------------------------

describe("POST /api/ai/continuity — mock mode", () => {
  it("returns 200 with the deterministic mock when AI_MOCK=true", async () => {
    vi.stubEnv("AI_MOCK", "true");

    const res = await POST(makeRequest(VALID_CONTEXT));
    expect(res.status).toBe(200);
  });

  it("mock response includes a critical compass finding", async () => {
    vi.stubEnv("AI_MOCK", "true");

    const res = await POST(makeRequest(VALID_CONTEXT));
    const data = await res.json();

    expect(data.findings).toBeInstanceOf(Array);
    const critical = data.findings.filter(
      (f: { severity: string }) => f.severity === "critical"
    );
    expect(critical.length).toBeGreaterThanOrEqual(1);
    expect(critical[0].affectedScene).toBe(5);
  });

  it("mock response satisfies requiresHumanReview=true", async () => {
    vi.stubEnv("AI_MOCK", "true");

    const res = await POST(makeRequest(VALID_CONTEXT));
    const data = await res.json();
    expect(data.requiresHumanReview).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 2. Invalid request body → 400
// ---------------------------------------------------------------------------

describe("POST /api/ai/continuity — validation errors", () => {
  it("returns 400 when projectId is missing", async () => {
    vi.stubEnv("AI_MOCK", "true");

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { projectId, ...noId } = VALID_CONTEXT;
    const res = await POST(makeRequest(noId));
    expect(res.status).toBe(400);
  });

  it("returns 400 when canonFacts contains an entry with empty key", async () => {
    vi.stubEnv("AI_MOCK", "true");

    const res = await POST(
      makeRequest({
        ...VALID_CONTEXT,
        canonFacts: [{ key: "", value: "something", lockedInScene: 1 }],
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when the body is not JSON", async () => {
    vi.stubEnv("AI_MOCK", "true");

    const req = new NextRequest("http://localhost/api/ai/continuity", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: "not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// 3. Watsonx timeout → 408
// ---------------------------------------------------------------------------

describe("POST /api/ai/continuity — timeout", () => {
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
// 4. Rate limit → 429
// ---------------------------------------------------------------------------

describe("POST /api/ai/continuity — rate limit", () => {
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
// 5. Model returns non-JSON → 502
// ---------------------------------------------------------------------------

describe("POST /api/ai/continuity — malformed model output", () => {
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

  // 6. Model returns JSON but it doesn't match ContinuityReviewResponseSchema → 502
  it("returns 502 when model JSON does not match ContinuityReviewResponseSchema", async () => {
    vi.stubEnv("AI_MOCK", "false");
    vi.stubEnv("WATSONX_API_KEY", "key");
    vi.stubEnv("WATSONX_PROJECT_ID", "proj");
    vi.stubEnv("WATSONX_URL", "https://example.com");

    const badResponse = JSON.stringify({
      results: [
        {
          generated_text: JSON.stringify({
            branchName: "test",
            // reviewedAt missing → schema violation
            findings: [],
            summary: "ok",
            requiresHumanReview: false,
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
// 7. Real credentials, valid model response → 200
// ---------------------------------------------------------------------------

describe("POST /api/ai/continuity — successful real call", () => {
  it("returns 200 with parsed schema when model returns valid JSON", async () => {
    vi.stubEnv("AI_MOCK", "false");
    vi.stubEnv("WATSONX_API_KEY", "key");
    vi.stubEnv("WATSONX_PROJECT_ID", "proj");
    vi.stubEnv("WATSONX_URL", "https://example.com");

    const validResponse = {
      branchName: "feature/save-the-stranger",
      reviewedAt: "2026-07-24T12:00:00.000Z",
      findings: [
        {
          severity: "critical",
          title: "Compass used after loss",
          canonEvidence: "Scene 4 canon fact: compass_state = lost.",
          affectedScene: 5,
          explanation: "Compass used in Scene 5 despite being lost in Scene 4.",
          suggestedFix: "Remove compass from Scene 5.",
        },
      ],
      summary: "One critical continuity error.",
      requiresHumanReview: true,
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
    expect(data.findings[0].severity).toBe("critical");
    expect(data.requiresHumanReview).toBe(true);
  });
});
