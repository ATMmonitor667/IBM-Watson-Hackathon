import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ModelTimeoutError, ModelUnavailableError } from "@/lib/ai/errors";
import { callModel } from "@/lib/ai/provider";
import { POST } from "./route";

vi.mock("@/lib/ai/provider", () => ({ callModel: vi.fn() }));

const mockedCallModel = vi.mocked(callModel);
const validContext = {
  projectId: "demo-1",
  branchName: "what-if/save-the-stranger",
  canonFacts: [{ key: "compass", value: "given away", lockedInScene: 4 }],
  branchFacts: [{ key: "compass", value: "used again", lockedInScene: 5 }],
  sceneHistory: ["The Choice", "The Consequence"],
  characterSummary: "Kael is an explorer in a worn coat.",
};

function request(body: unknown) {
  return new NextRequest("http://localhost/api/ai/continuity", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mockedCallModel.mockReset();
  mockedCallModel.mockRejectedValue(
    new ModelUnavailableError("Deterministic mode"),
  );
});

describe("POST /api/ai/continuity", () => {
  it("returns the deterministic review when no model is configured", async () => {
    const response = await POST(request(validContext));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.requiresHumanReview).toBe(true);
    expect(data.findings.length).toBeGreaterThan(0);
  });

  it("rejects invalid input", async () => {
    const response = await POST(request({ branchName: "missing-project" }));
    expect(response.status).toBe(400);
  });

  it("returns 408 when the local model times out", async () => {
    mockedCallModel.mockRejectedValueOnce(new ModelTimeoutError(100));
    const response = await POST(request(validContext));
    expect(response.status).toBe(408);
  });

  it("validates and returns local model output", async () => {
    mockedCallModel.mockResolvedValueOnce({
      text: JSON.stringify({
        branchName: validContext.branchName,
        reviewedAt: "2026-08-02T12:00:00.000Z",
        findings: [],
        summary: "No conflicts found.",
        requiresHumanReview: false,
      }),
    });

    const response = await POST(request(validContext));
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.summary).toBe("No conflicts found.");
  });
});
