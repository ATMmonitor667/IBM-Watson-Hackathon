import { describe, expect, it } from "vitest";

import { buildCharacterRefinePrompt } from "@/lib/ai/prompts/characterRefinePrompt";
import type { CanonContext } from "@/lib/ai/schemas";

const context: CanonContext = {
  projectId: "demo-1",
  branchName: "canon",
  canonFacts: [
    {
      key: "pressure_suit",
      value: "patched grey-green pressure suit",
      lockedInScene: 1,
    },
  ],
  branchFacts: [],
  sceneHistory: [],
  characterSummary: "Kael wears a patched pressure suit.",
};

describe("buildCharacterRefinePrompt", () => {
  it("includes the creator's requested refinement direction", () => {
    const prompt = buildCharacterRefinePrompt(
      context,
      "char-kael",
      "Make the compass loss visible through an empty belt holster.",
    );

    expect(prompt).toContain("CREATOR'S REFINEMENT DIRECTION");
    expect(prompt).toContain(
      "Make the compass loss visible through an empty belt holster.",
    );
    expect(prompt).toContain("pressure_suit");
    expect(prompt).toContain("requiresApproval");
  });
});
