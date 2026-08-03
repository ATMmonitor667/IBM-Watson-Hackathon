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
  canonFacts: [{ key: "compass", value: "kept", lockedInScene: 3 }],
  branchFacts: [{ key: "compass", value: "given away", lockedInScene: 4 }],
  sceneHistory: ["The Choice", "The Consequence"],
  characterSummary: "Kael is an explorer in a worn coat.",
};

function request(body: unknown) {
  return new NextRequest("http://localhost/api/ai/merge-assistant", {
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

describe("POST /api/ai/merge-assistant", () => {
  it("returns deterministic preview-only strategies", async () => {
    const response = await POST(request(validContext));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.previewOnly).toBe(true);
    expect(data.strategies.length).toBeGreaterThan(0);
  });

  it("rejects invalid input", async () => {
    const response = await POST(request({ projectId: "incomplete" }));
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
        branchSummary: "The branch changes who holds the compass.",
        compatibleChanges: ["Keep the revised rescue scene."],
        trueConflicts: ["Compass ownership differs."],
        strategies: [
          {
            id: "strategy-1",
            label: "Merge the rescue",
            description: "Keep the rescue and remove later compass use.",
            tradeoffs: "Later scenes need revision.",
            includedSceneIds: ["scene-4"],
          },
          {
            id: "strategy-2",
            label: "Keep canon",
            description: "Leave the compass timeline unchanged.",
            tradeoffs: "The rescue branch stays separate.",
            includedSceneIds: [],
          },
        ],
        previewOnly: true,
      }),
    });

    const response = await POST(request(validContext));
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.previewOnly).toBe(true);
  });
});
