/**
 * src/lib/ai/__tests__/schemas.test.ts
 *
 * Validates that the Zod schemas cover the exact demo scenario:
 *   – The explorer's compass is canon-locked as "lost in Scene 4"
 *   – A branch scene that uses the compass after Scene 4 must be representable
 *     in the schema so the continuity inspector can catch it.
 */

import { describe, it, expect } from "vitest";
import {
  CanonContextSchema,
  ContinuityFindingSchema,
  ContinuityReviewResponseSchema,
  MergeStrategySchema,
  MergeAssistantResponseSchema,
  CharacterRefinementResponseSchema,
  PanelGenerationRequestSchema,
} from "../schemas";

// ---------------------------------------------------------------------------
// Shared demo fixtures
// ---------------------------------------------------------------------------

const COMPASS_CANON_FACT = {
  key: "compass_state",
  value: "lost in Scene 4 – given to The Ferryman",
  lockedInScene: 4,
};

const baseContext = {
  projectId: "demo-1",
  branchName: "canon",
  canonFacts: [COMPASS_CANON_FACT],
  branchFacts: [],
  sceneHistory: [
    "The Surface Breaks",
    "The Market Beneath",
    "The Lighthouse Signal",
    "Below the Archive",
    "The Choice at the Gate",
  ],
  characterSummary:
    "Kael — explorer, mid-30s, worn leather coat, carries the glowing compass (until Scene 4).",
};

// ---------------------------------------------------------------------------
// CanonContext
// ---------------------------------------------------------------------------

describe("CanonContextSchema", () => {
  it("parses a valid canon context", () => {
    const result = CanonContextSchema.safeParse(baseContext);
    expect(result.success).toBe(true);
  });

  it("rejects a context with no projectId", () => {
    const result = CanonContextSchema.safeParse({ ...baseContext, projectId: "" });
    expect(result.success).toBe(false);
  });

  it("represents the compass demo scenario — branch fact cannot replace a canon fact", () => {
    // A branch may add a branchFact that contradicts canon, but the schema
    // keeps them in separate arrays so the inspector can detect the conflict.
    const branchContext = {
      ...baseContext,
      branchName: "feature/save-the-stranger",
      canonFacts: [COMPASS_CANON_FACT], // canon unchanged
      branchFacts: [
        {
          key: "compass_state",          // same key as canon — detectable by inspector
          value: "in Kael's hand in Scene 5", // contradicts canon
          lockedInScene: 5,
        },
      ],
    };
    const result = CanonContextSchema.safeParse(branchContext);
    expect(result.success).toBe(true);
    if (!result.success) return;
    // Canon fact must survive unmodified
    expect(result.data.canonFacts[0].value).toContain("lost in Scene 4");
    // Branch fact is separately tracked
    expect(result.data.branchFacts[0].value).toContain("Scene 5");
  });
});

// ---------------------------------------------------------------------------
// ContinuityFinding — the compass contradiction
// ---------------------------------------------------------------------------

describe("ContinuityFindingSchema", () => {
  const compassFinding = {
    severity: "critical" as const,
    title: "Impossible object use after disposal — compass",
    canonEvidence:
      "Scene 4 'Below the Archive': Kael gives the compass to The Ferryman. " +
      "Canon fact key=compass_state locked at scene 4.",
    affectedScene: 5,
    explanation:
      "Scene 5 in branch 'feature/save-the-stranger' shows Kael using the glowing " +
      "compass to navigate, but the compass was irrevocably given away in Scene 4. " +
      "This is a direct contradiction of the locked canon fact.",
    suggestedFix:
      "Either remove the compass use from Scene 5, have The Ferryman return it with " +
      "narrative justification, or establish in the branch that Kael has a second compass.",
  };

  it("parses the demo compass contradiction finding", () => {
    const result = ContinuityFindingSchema.safeParse(compassFinding);
    expect(result.success).toBe(true);
  });

  it("rejects a finding with invalid severity", () => {
    const result = ContinuityFindingSchema.safeParse({
      ...compassFinding,
      severity: "blocker",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a finding with no explanation", () => {
    const result = ContinuityFindingSchema.safeParse({
      ...compassFinding,
      explanation: "",
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ContinuityReviewResponse
// ---------------------------------------------------------------------------

describe("ContinuityReviewResponseSchema", () => {
  const validReview = {
    branchName: "feature/save-the-stranger",
    reviewedAt: "2026-07-24T12:00:00.000Z",
    findings: [
      {
        severity: "critical",
        title: "Impossible object use after disposal — compass",
        canonEvidence: "Scene 4: compass given to The Ferryman (canon fact locked).",
        affectedScene: 5,
        explanation: "Branch uses compass in Scene 5 after it was lost in Scene 4.",
        suggestedFix: "Remove compass use or add a return narrative.",
      },
    ],
    summary:
      "1 critical continuity error found. The compass contradiction must be resolved before merging.",
    requiresHumanReview: true,
  };

  it("parses a valid review response containing the compass contradiction", () => {
    const result = ContinuityReviewResponseSchema.safeParse(validReview);
    expect(result.success).toBe(true);
  });

  it("captures at least one critical finding in the demo scenario", () => {
    const result = ContinuityReviewResponseSchema.safeParse(validReview);
    if (!result.success) throw new Error("Parse failed");
    const critical = result.data.findings.filter((f) => f.severity === "critical");
    expect(critical.length).toBeGreaterThanOrEqual(1);
    expect(critical[0].affectedScene).toBe(5);
  });

  it("rejects a review with a non-datetime reviewedAt", () => {
    const result = ContinuityReviewResponseSchema.safeParse({
      ...validReview,
      reviewedAt: "not-a-date",
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// MergeStrategy
// ---------------------------------------------------------------------------

describe("MergeStrategySchema", () => {
  it("parses a valid merge strategy", () => {
    const strategy = {
      id: "strategy-keep-canon",
      label: "Keep canon compass state",
      description:
        "Discard the branch's Scene 5 compass use. Merge all other branch changes.",
      tradeoffs:
        "Loses the visual 'compass pointing home' beat, but preserves story logic.",
      includedSceneIds: ["scene-branch-1", "scene-branch-2"],
    };
    const result = MergeStrategySchema.safeParse(strategy);
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// MergeAssistantResponse
// ---------------------------------------------------------------------------

describe("MergeAssistantResponseSchema", () => {
  const validMerge = {
    branchName: "feature/save-the-stranger",
    branchSummary:
      "Branch adds a 'save the stranger' outcome to Scene 5 and introduces a new ending. " +
      "Contains one critical continuity conflict (compass).",
    compatibleChanges: [
      "New dialogue for The Ferryman in Scene 5",
      "Additional emotional beat: Hope",
    ],
    trueConflicts: [
      "Compass use in Scene 5 contradicts canon fact locked at Scene 4",
    ],
    strategies: [
      {
        id: "keep-canon",
        label: "Keep canon compass state",
        description: "Merge everything except compass use.",
        tradeoffs: "Loses the symbolic compass moment.",
        includedSceneIds: ["scene-branch-1"],
      },
      {
        id: "return-compass",
        label: "Add compass return narrative",
        description: "Insert a short beat where The Ferryman returns the compass.",
        tradeoffs: "Requires extra scene editing but preserves both story threads.",
        includedSceneIds: ["scene-branch-1", "scene-branch-compass-return"],
      },
    ],
    previewOnly: true as const,
  };

  it("parses a valid merge assistant response", () => {
    const result = MergeAssistantResponseSchema.safeParse(validMerge);
    expect(result.success).toBe(true);
  });

  it("rejects a response where previewOnly is false", () => {
    const result = MergeAssistantResponseSchema.safeParse({
      ...validMerge,
      previewOnly: false,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a response with fewer than 2 strategies", () => {
    const result = MergeAssistantResponseSchema.safeParse({
      ...validMerge,
      strategies: [validMerge.strategies[0]],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a response with more than 3 strategies", () => {
    const extra = { ...validMerge.strategies[0], id: "extra" };
    const result = MergeAssistantResponseSchema.safeParse({
      ...validMerge,
      strategies: [...validMerge.strategies, extra, extra],
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// CharacterRefinementResponse
// ---------------------------------------------------------------------------

describe("CharacterRefinementResponseSchema", () => {
  it("parses a valid character refinement response", () => {
    const result = CharacterRefinementResponseSchema.safeParse({
      characterId: "char-kael-1",
      proposedDescription:
        "Kael — explorer, mid-30s, worn leather coat, no compass (lost). Eyes show exhaustion.",
      proposedGenerationInstruction:
        "Full-body portrait. Worn brown leather coat. Empty belt holster where compass was. " +
        "Muted blues and greens. Graphic-novel ink style.",
      changeRationale:
        "Compass removed from description following Scene 4 canon lock.",
      requiresApproval: true as const,
    });
    expect(result.success).toBe(true);
  });

  it("rejects when requiresApproval is false", () => {
    const result = CharacterRefinementResponseSchema.safeParse({
      characterId: "char-kael-1",
      proposedDescription: "Updated Kael description",
      proposedGenerationInstruction: "Instruction",
      changeRationale: "Testing",
      requiresApproval: false,
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// PanelGenerationRequest
// ---------------------------------------------------------------------------

describe("PanelGenerationRequestSchema", () => {
  it("parses a valid panel generation request using canon context", () => {
    const result = PanelGenerationRequestSchema.safeParse({
      projectId: "demo-1",
      sceneId: "scene-demo-5",
      lockedCharacterDescription:
        "Kael — explorer, mid-30s, worn leather coat. No compass.",
      canonFacts: [COMPASS_CANON_FACT],
      sceneDescription:
        "Kael stands at the Northern Flood Gate, hand on the wheel, deciding.",
      styleInstruction: "graphic novel, high-contrast ink, muted blues",
      useFallback: false,
    });
    expect(result.success).toBe(true);
  });

  it("defaults useFallback to false when omitted", () => {
    const result = PanelGenerationRequestSchema.safeParse({
      projectId: "demo-1",
      sceneId: "scene-demo-5",
      lockedCharacterDescription: "Kael description",
      canonFacts: [],
      sceneDescription: "Scene description",
      styleInstruction: "graphic novel",
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.useFallback).toBe(false);
  });
});
