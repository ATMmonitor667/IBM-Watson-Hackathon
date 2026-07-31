import { describe, expect, it } from "vitest";

import { mockContinuityReviewFor } from "@/lib/ai/mocks";
import type { CanonContext } from "@/lib/ai/schemas";

/**
 * AUDIT FINDING H2 — the deterministic fallback may only describe what it was
 * asked about.
 *
 * MOCK_CONTINUITY_REVIEW was a constant naming a branch ("feature/save-the-
 * stranger") and scenes that do not exist in the demo data, returned verbatim
 * by the route. On stage that meant a panel headed "The Tunnel Route" could
 * describe a different branch entirely. It is now a function of the request.
 */

const BASE: CanonContext = {
  projectId: "demo-1",
  branchName: "The Tunnel Route",
  canonFacts: [
    { key: "compass_state", value: "in Kael's possession", lockedInScene: 1 },
  ],
  branchFacts: [],
  sceneHistory: ["The Surface Breaks", "The Hidden Tunnel"],
  characterSummary: "Kael — explorer.",
};

describe("the fallback echoes the branch it was asked about", () => {
  it("never renames the branch", () => {
    const review = mockContinuityReviewFor({ ...BASE, branchName: "Rahat's Detour" });

    expect(review.branchName).toBe("Rahat's Detour");
    expect(JSON.stringify(review)).not.toContain("save-the-stranger");
  });
});

describe("with rule-engine findings, it restates them and nothing else", () => {
  const ctx: CanonContext = {
    ...BASE,
    ruleFindings: [
      {
        id: "rule-prop-scene-alt-2b-the-compass",
        rule: "prop_without_holder",
        severity: "high",
        title: "The Compass is used after it leaves this timeline",
        affectedScene: 7,
        evidence: ["propsUsed: [The Compass, Engine controls]", "taken by the current"],
      },
    ],
  };

  it("carries the engine's title, scene and evidence through untouched", () => {
    const [finding] = mockContinuityReviewFor(ctx).findings;

    expect(finding.title).toBe("The Compass is used after it leaves this timeline");
    expect(finding.affectedScene).toBe(7);
    expect(finding.canonEvidence).toContain("propsUsed: [The Compass, Engine controls]");
    expect(finding.severity).toBe("critical"); // high -> critical
  });

  it("does not pretend the model wrote the explanation", () => {
    const [finding] = mockContinuityReviewFor(ctx).findings;

    expect(finding.explanation).toContain("language model was not called");
    expect(finding.suggestedFix).toContain("Nothing has been applied");
  });

  it("reports a clean branch as clean when the engine found nothing", () => {
    // `ruleFindings: []` means the engine ran and found nothing. Inventing a
    // compass contradiction here is precisely the bug.
    const review = mockContinuityReviewFor({ ...BASE, ruleFindings: [] });

    expect(review.findings).toEqual([]);
    expect(review.requiresHumanReview).toBe(false);
    expect(review.summary).toContain("No contradictions detected");
  });
});

describe("without rule findings, it derives them from the request's own facts", () => {
  it("reports a canon/branch fact collision with both values", () => {
    const review = mockContinuityReviewFor({
      ...BASE,
      branchFacts: [
        { key: "compass_state", value: "no longer on this timeline", lockedInScene: 6 },
      ],
    });

    expect(review.findings).toHaveLength(1);
    const [finding] = review.findings;
    expect(finding.affectedScene).toBe(6);
    expect(finding.canonEvidence).toContain("in Kael's possession");
    expect(finding.explanation).toContain("no longer on this timeline");
    expect(review.requiresHumanReview).toBe(true);
  });

  it("finds nothing when the branch does not touch a canon fact", () => {
    expect(mockContinuityReviewFor(BASE).findings).toEqual([]);
  });
});
