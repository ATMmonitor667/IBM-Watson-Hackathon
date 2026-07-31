/**
 * src/lib/ai/__tests__/continuityPrompt.test.ts
 *
 * Tests for buildContinuityPrompt():
 *   - All canon facts appear in the output
 *   - Branch facts appear separately
 *   - The scene history is included
 *   - The JSON format instruction is present
 */

import { describe, it, expect } from "vitest";
import { buildContinuityPrompt } from "../prompts/continuityPrompt";
import type { CanonContext } from "../schemas";

const BASE_CTX: CanonContext = {
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

describe("buildContinuityPrompt", () => {
  it("includes the canon compass_state fact", () => {
    const prompt = buildContinuityPrompt(BASE_CTX);
    expect(prompt).toContain("compass_state");
    expect(prompt).toContain("lost in Scene 4 – given to The Ferryman");
  });

  it("includes the branch compass_state contradiction", () => {
    const prompt = buildContinuityPrompt(BASE_CTX);
    expect(prompt).toContain("in Kael's hand in Scene 5");
  });

  it("includes the scene history", () => {
    const prompt = buildContinuityPrompt(BASE_CTX);
    expect(prompt).toContain("The Surface Breaks");
    expect(prompt).toContain("Below the Archive");
  });

  it("includes the branch name", () => {
    const prompt = buildContinuityPrompt(BASE_CTX);
    expect(prompt).toContain("feature/save-the-stranger");
  });

  it("includes the character summary", () => {
    const prompt = buildContinuityPrompt(BASE_CTX);
    expect(prompt).toContain("Kael — explorer");
  });

  it("contains the JSON response format instruction", () => {
    const prompt = buildContinuityPrompt(BASE_CTX);
    expect(prompt).toContain('"branchName"');
    expect(prompt).toContain('"findings"');
    expect(prompt).toContain('"requiresHumanReview"');
  });

  it("shows (none) when branchFacts is empty", () => {
    const ctx: CanonContext = { ...BASE_CTX, branchFacts: [] };
    const prompt = buildContinuityPrompt(ctx);
    expect(prompt).toContain("(none)");
  });

  it("labels canon scene number in the fact line", () => {
    const prompt = buildContinuityPrompt(BASE_CTX);
    expect(prompt).toContain("[scene 4]");
  });
});

// ---------------------------------------------------------------------------
// Rule findings — the model explains, it does not find (issue #8 / D3)
// ---------------------------------------------------------------------------

const CTX_WITH_FINDINGS: CanonContext = {
  ...BASE_CTX,
  ruleFindings: [
    {
      id: "rule-prop-scene-alt-2b-the-compass",
      rule: "prop_without_holder",
      severity: "high",
      title: "The Compass is used after it leaves this timeline",
      affectedScene: 7,
      evidence: [
        "The Drowned Engine Room — propsUsed: [The Compass, Engine controls]",
        '"The compass slips off Kael\'s belt" — established in "The Hidden Tunnel" (Scene 6)',
      ],
    },
  ],
};

describe("buildContinuityPrompt — with computed findings", () => {
  it("hands the model the contradiction instead of asking it to look", () => {
    const prompt = buildContinuityPrompt(CTX_WITH_FINDINGS);

    expect(prompt).toContain("CONTRADICTIONS ALREADY DETECTED BY THE RULE ENGINE");
    expect(prompt).toContain("explain the contradictions listed below");
    expect(prompt).toContain("Do NOT re-detect them");
  });

  it("includes each finding's title, severity, scene and evidence", () => {
    const prompt = buildContinuityPrompt(CTX_WITH_FINDINGS);

    expect(prompt).toContain("The Compass is used after it leaves this timeline");
    expect(prompt).toContain("[high]");
    expect(prompt).toContain("scene 7");
    expect(prompt).toContain("propsUsed: [The Compass, Engine controls]");
    expect(prompt).toContain("The Hidden Tunnel");
  });

  it("forbids inventing evidence the engine did not supply", () => {
    const prompt = buildContinuityPrompt(CTX_WITH_FINDINGS);
    expect(prompt).toContain("do NOT invent additional evidence");
  });

  it("falls back to open-ended detection when the engine found nothing", () => {
    const prompt = buildContinuityPrompt(BASE_CTX);

    expect(prompt).toContain("identify any continuity errors");
    expect(prompt).not.toContain("CONTRADICTIONS ALREADY DETECTED");
  });
});
