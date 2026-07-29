/**
 * src/lib/ai/__tests__/contextBuilder.test.ts
 *
 * Tests for buildCanonContext() and findContradictions().
 *
 * Key invariant under test:
 *   A branch can NEVER silently overwrite a canon fact.
 *   Specifically: "compass_state" is locked in canon at Scene 4 as
 *   "lost in Scene 4 – given to The Ferryman". If the branch claims
 *   the compass is present in Scene 5, the builder must keep the canon
 *   value intact and surface the branch value in branchFacts.
 */

import { describe, it, expect } from "vitest";
import { buildCanonContext, findContradictions } from "../contextBuilder";
import type { ContextBranch } from "../contextBuilder";

// ---------------------------------------------------------------------------
// Shared demo fixtures — mirrors the flooded-city story
// ---------------------------------------------------------------------------

const CHARACTER_SUMMARY =
  "Kael — explorer, mid-30s, worn leather coat, carries the glowing compass (until Scene 4).";

/** Canon branch: five scenes, compass locked as lost at Scene 4 */
const CANON_BRANCH: ContextBranch = {
  name: "canon",
  isCanon: true,
  scenes: [
    {
      sceneNumber: 1,
      title: "The Surface Breaks",
      facts: [
        {
          key: "compass_state",
          value: "in Kael's possession",
          lockedInScene: 1,
        },
      ],
    },
    { sceneNumber: 2, title: "The Market Beneath", facts: [] },
    {
      sceneNumber: 3,
      title: "The Lighthouse Signal",
      facts: [{ key: "compass_state", value: "pointing upward anomaly", lockedInScene: 3 }],
    },
    {
      sceneNumber: 4,
      title: "Below the Archive",
      facts: [
        {
          key: "compass_state",
          value: "lost in Scene 4 – given to The Ferryman",
          lockedInScene: 4,
        },
      ],
    },
    {
      sceneNumber: 5,
      title: "The Choice at the Gate",
      facts: [],
    },
  ],
};

/** Branch that contradicts canon by using the compass in Scene 5 */
const BRANCH_WITH_COMPASS_CONTRADICTION: ContextBranch = {
  name: "feature/save-the-stranger",
  isCanon: false,
  scenes: [
    {
      sceneNumber: 5,
      title: "The Choice at the Gate – Stranger Saved",
      facts: [
        {
          key: "compass_state",
          value: "in Kael's hand in Scene 5", // contradicts canon
          lockedInScene: 5,
        },
      ],
    },
  ],
};

/** Clean branch that introduces a new fact and does not touch compass */
const CLEAN_BRANCH: ContextBranch = {
  name: "feature/new-character",
  isCanon: false,
  scenes: [
    {
      sceneNumber: 5,
      title: "The Choice – New Ally",
      facts: [
        {
          key: "new_character_mira_role",
          value: "ally who holds the gate key",
          lockedInScene: 5,
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Core invariant: compass cannot be silently overwritten
// ---------------------------------------------------------------------------

describe("buildCanonContext — compass contradiction invariant", () => {
  it("preserves the canon compass_state even when the branch overrides it", () => {
    const ctx = buildCanonContext(
      BRANCH_WITH_COMPASS_CONTRADICTION,
      CANON_BRANCH,
      "demo-1",
      CHARACTER_SUMMARY
    );

    const canonCompass = ctx.canonFacts.find((f) => f.key === "compass_state");
    expect(canonCompass).toBeDefined();
    expect(canonCompass!.value).toBe("lost in Scene 4 – given to The Ferryman");
  });

  it("places the contradicting branch value in branchFacts, not canonFacts", () => {
    const ctx = buildCanonContext(
      BRANCH_WITH_COMPASS_CONTRADICTION,
      CANON_BRANCH,
      "demo-1",
      CHARACTER_SUMMARY
    );

    const branchCompass = ctx.branchFacts.find((f) => f.key === "compass_state");
    expect(branchCompass).toBeDefined();
    expect(branchCompass!.value).toBe("in Kael's hand in Scene 5");
  });

  it("the same key never appears in both canonFacts and branchFacts with the same value", () => {
    const ctx = buildCanonContext(
      BRANCH_WITH_COMPASS_CONTRADICTION,
      CANON_BRANCH,
      "demo-1",
      CHARACTER_SUMMARY
    );

    const canonValues = new Map(ctx.canonFacts.map((f) => [f.key, f.value]));
    for (const bf of ctx.branchFacts) {
      const cv = canonValues.get(bf.key);
      if (cv !== undefined) {
        // If the same key exists in both, the values MUST differ (contradiction present)
        expect(bf.value).not.toBe(cv);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// findContradictions detects the compass conflict
// ---------------------------------------------------------------------------

describe("findContradictions — compass demo scenario", () => {
  it("returns one contradiction for the compass branch", () => {
    const ctx = buildCanonContext(
      BRANCH_WITH_COMPASS_CONTRADICTION,
      CANON_BRANCH,
      "demo-1",
      CHARACTER_SUMMARY
    );
    const contradictions = findContradictions(ctx);
    expect(contradictions).toHaveLength(1);
  });

  it("the contradiction identifies compass_state as the conflicting key", () => {
    const ctx = buildCanonContext(
      BRANCH_WITH_COMPASS_CONTRADICTION,
      CANON_BRANCH,
      "demo-1",
      CHARACTER_SUMMARY
    );
    const contradictions = findContradictions(ctx);
    expect(contradictions[0].key).toBe("compass_state");
    expect(contradictions[0].canonLockedInScene).toBe(4);
    expect(contradictions[0].branchLockedInScene).toBe(5);
  });

  it("returns zero contradictions for a clean branch", () => {
    const ctx = buildCanonContext(CLEAN_BRANCH, CANON_BRANCH, "demo-1", CHARACTER_SUMMARY);
    const contradictions = findContradictions(ctx);
    expect(contradictions).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Scene history composition
// ---------------------------------------------------------------------------

describe("buildCanonContext — scene history", () => {
  it("includes all canon scene titles in order", () => {
    const ctx = buildCanonContext(
      CLEAN_BRANCH,
      CANON_BRANCH,
      "demo-1",
      CHARACTER_SUMMARY
    );
    expect(ctx.sceneHistory[0]).toBe("The Surface Breaks");
    expect(ctx.sceneHistory[1]).toBe("The Market Beneath");
    expect(ctx.sceneHistory[3]).toBe("Below the Archive");
  });

  it("marks branch-only scenes with the [branch] prefix", () => {
    const branchWithNewScene: ContextBranch = {
      name: "feature/extra",
      isCanon: false,
      scenes: [
        { sceneNumber: 6, title: "The Aftermath", facts: [] },
      ],
    };
    const ctx = buildCanonContext(
      branchWithNewScene,
      CANON_BRANCH,
      "demo-1",
      CHARACTER_SUMMARY
    );
    const branchEntry = ctx.sceneHistory.find((s) => s.includes("The Aftermath"));
    expect(branchEntry).toBe("[branch] The Aftermath");
  });

  it("does not duplicate a scene title when the branch re-uses a canon scene number", () => {
    const ctx = buildCanonContext(
      BRANCH_WITH_COMPASS_CONTRADICTION,
      CANON_BRANCH,
      "demo-1",
      CHARACTER_SUMMARY
    );
    // Scene 5 exists in canon; branch replaces it — history should not show it twice
    const count = ctx.sceneHistory.filter((s) =>
      s.includes("The Choice at the Gate")
    ).length;
    expect(count).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Metadata fields
// ---------------------------------------------------------------------------

describe("buildCanonContext — metadata", () => {
  it("sets projectId and branchName correctly", () => {
    const ctx = buildCanonContext(
      CLEAN_BRANCH,
      CANON_BRANCH,
      "demo-1",
      CHARACTER_SUMMARY
    );
    expect(ctx.projectId).toBe("demo-1");
    expect(ctx.branchName).toBe("feature/new-character");
  });

  it("sets characterSummary to the supplied value", () => {
    const ctx = buildCanonContext(
      CLEAN_BRANCH,
      CANON_BRANCH,
      "demo-1",
      CHARACTER_SUMMARY
    );
    expect(ctx.characterSummary).toBe(CHARACTER_SUMMARY);
  });

  it("new branch-only facts also appear in branchFacts", () => {
    const ctx = buildCanonContext(
      CLEAN_BRANCH,
      CANON_BRANCH,
      "demo-1",
      CHARACTER_SUMMARY
    );
    const newFact = ctx.branchFacts.find(
      (f) => f.key === "new_character_mira_role"
    );
    expect(newFact).toBeDefined();
    expect(newFact!.value).toContain("ally");
  });
});

// ---------------------------------------------------------------------------
// Canon branch passed as subject of its own context (self-review)
// ---------------------------------------------------------------------------

describe("buildCanonContext — canon branch as subject", () => {
  it("produces empty branchFacts when building context for the canon branch itself", () => {
    const ctx = buildCanonContext(
      CANON_BRANCH,
      CANON_BRANCH,
      "demo-1",
      CHARACTER_SUMMARY
    );
    expect(ctx.branchFacts).toHaveLength(0);
  });

  it("last writer wins within canon — compass_state ends as 'lost in Scene 4'", () => {
    const ctx = buildCanonContext(
      CANON_BRANCH,
      CANON_BRANCH,
      "demo-1",
      CHARACTER_SUMMARY
    );
    const compass = ctx.canonFacts.find((f) => f.key === "compass_state");
    expect(compass!.value).toBe("lost in Scene 4 – given to The Ferryman");
    expect(compass!.lockedInScene).toBe(4);
  });
});
