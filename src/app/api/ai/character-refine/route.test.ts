import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ModelTimeoutError, ModelUnavailableError } from "@/lib/ai/errors";
import { callModel } from "@/lib/ai/provider";
import { POST } from "./route";

vi.mock("@/lib/ai/provider", () => ({ callModel: vi.fn() }));

const mockedCallModel = vi.mocked(callModel);
const validRequest = {
  projectId: "demo-1",
  branchName: "main",
  canonFacts: [{ key: "coat", value: "weathered", lockedInScene: 1 }],
  branchFacts: [],
  sceneHistory: ["The Arrival"],
  characterSummary: "Kael is an explorer in a worn coat.",
  characterId: "character-kael",
  refinementPrompt: "Make the coat look rain-soaked.",
};

function request(body: unknown) {
  return new NextRequest("http://localhost/api/ai/character-refine", {
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

describe("POST /api/ai/character-refine", () => {
  it("returns a deterministic proposal that requires approval", async () => {
    const response = await POST(request(validRequest));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.characterId).toBe(validRequest.characterId);
    expect(data.requiresApproval).toBe(true);
  });

  it("rejects an empty refinement prompt", async () => {
    const response = await POST(
      request({ ...validRequest, refinementPrompt: "" }),
    );
    expect(response.status).toBe(400);
  });

  it("returns 408 when the local model times out", async () => {
    mockedCallModel.mockRejectedValueOnce(new ModelTimeoutError(100));
    const response = await POST(request(validRequest));
    expect(response.status).toBe(408);
  });

  it("validates and returns local model output", async () => {
    mockedCallModel.mockResolvedValueOnce({
      text: JSON.stringify({
        characterId: validRequest.characterId,
        proposedDescription: "Kael wears a rain-soaked weathered coat.",
        proposedGenerationInstruction: "Keep the wet coat and established silhouette.",
        changeRationale: "Applies the creator request without changing identity.",
        requiresApproval: true,
      }),
    });

    const response = await POST(request(validRequest));
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.requiresApproval).toBe(true);
  });
});
