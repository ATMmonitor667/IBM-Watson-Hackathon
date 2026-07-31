import { describe, expect, it } from "vitest";

import {
  continuityFlagsFor,
  lineageOf,
  mentions,
  projectVocabulary,
  reviewBranch,
  withComputedFlags,
} from "@/lib/ai/continuityRules";
import { DEMO_BRANCHES } from "@/lib/mock/demoBranches";
import { DEMO_BRANCH_REVIEW } from "@/lib/mock/demoReview";
import type { Branch, Scene } from "@/types/workspace";

const CANON = DEMO_BRANCHES.find((b) => b.isCanon)!;
const TUNNEL = DEMO_BRANCHES.find((b) => b.id === "branch-tunnel")!;

/**
 * Issue #8 / D3. The point of these tests is that the findings are COMPUTED:
 * every assertion below is about output derived from scene fields, and none of
 * the demo data contains a written-out finding any more.
 *
 * The negative assertions matter as much as the positive ones. An engine that
 * flags everything is as useless as one that flags nothing.
 */

describe("entity matching", () => {
  it("matches a cast entry against dialogue without its article", () => {
    expect(mentions("watching the compass spin", "The Compass")).toBe(true);
    expect(mentions("The Ferryman spread his hands", "The Ferryman")).toBe(true);
  });

  it("matches the plural — 'Compasses don't point up'", () => {
    expect(mentions("Compasses don't point up.", "The Compass")).toBe(true);
  });

  it("does not match a substring of a longer word", () => {
    // "Mira" must not match "miracle", or every scene flags every character.
    expect(mentions("It was a miracle they surfaced.", "Mira")).toBe(false);
    expect(mentions("The archives were dry.", "The Archivist")).toBe(false);
  });

  it("is case insensitive", () => {
    expect(mentions("KAEL stared at the needle", "Kael")).toBe(true);
  });
});

describe("lineage", () => {
  it("canon's lineage is its own scenes, in order", () => {
    const lineage = lineageOf(CANON, DEMO_BRANCHES);
    expect(lineage.map((s) => s.id)).toEqual([
      "scene-demo-1",
      "scene-demo-2",
      "scene-demo-3",
      "scene-demo-4",
      "scene-demo-5",
    ]);
  });

  it("a branch inherits canon only up to its divergence point", () => {
    const lineage = lineageOf(TUNNEL, DEMO_BRANCHES);

    // Diverges at scene-demo-2, so scenes 3-5 of canon are NOT on this timeline.
    expect(lineage.map((s) => s.id)).toEqual([
      "scene-demo-1",
      "scene-demo-2",
      "scene-alt-2a",
      "scene-alt-2b",
    ]);
    expect(lineage.map((s) => s.id)).not.toContain("scene-demo-4");
  });
});

describe("rule 1 — the cast list and the dialogue disagree", () => {
  it("finds the compass driving Scene 3 while absent from its cast", () => {
    const findings = reviewBranch(CANON, DEMO_BRANCHES).filter(
      (f) => f.rule === "unlisted_entity",
    );

    expect(findings).toHaveLength(1);
    const [finding] = findings;

    expect(finding.sceneId).toBe("scene-demo-3");
    expect(finding.entity).toBe("The Compass");
    expect(finding.severity).toBe("medium");
  });

  it("cites the quote and the cast list as evidence, not prose", () => {
    const [finding] = reviewBranch(CANON, DEMO_BRANCHES).filter(
      (f) => f.rule === "unlisted_entity",
    );

    expect(finding.evidence.join(" ")).toContain("Compasses don't point up");
    expect(finding.evidence.join(" ")).toContain("characters: [Kael, Mira]");
    expect(finding.suggestedFix).not.toBe("");
  });

  it("does not flag Scene 1, where the compass IS in the cast", () => {
    const flagged = reviewBranch(CANON, DEMO_BRANCHES).map((f) => f.sceneId);
    expect(flagged).not.toContain("scene-demo-1");
  });

  it("does not flag Scene 5, where the Ferryman speaks and is listed", () => {
    const flagged = reviewBranch(CANON, DEMO_BRANCHES).map((f) => f.sceneId);
    expect(flagged).not.toContain("scene-demo-5");
  });
});

describe("rule 2 — an entity appears on a timeline that never introduced it", () => {
  it("finds the Archivist on the tunnel branch", () => {
    const findings = reviewBranch(TUNNEL, DEMO_BRANCHES).filter(
      (f) => f.rule === "unestablished_on_branch",
    );

    expect(findings).toHaveLength(1);
    const [finding] = findings;

    expect(finding.sceneId).toBe("scene-alt-2b");
    expect(finding.entity).toBe("The Archivist");
    expect(finding.severity).toBe("high");
  });

  it("explains the divergence concretely — which scene, and when", () => {
    const [finding] = reviewBranch(TUNNEL, DEMO_BRANCHES).filter(
      (f) => f.rule === "unestablished_on_branch",
    );

    // Canon introduces the Archivist in Scene 4; the branch diverged at Scene 2.
    expect(finding.message).toContain("Scene 4");
    expect(finding.message).toContain("Scene 2");
    expect(finding.evidence.join(" ")).toContain("Below the Archive");
    expect(finding.evidence.join(" ")).toContain("The Market Beneath");
  });

  it("is silent on canon — canon has no divergence point", () => {
    const findings = reviewBranch(CANON, DEMO_BRANCHES).filter(
      (f) => f.rule === "unestablished_on_branch",
    );
    expect(findings).toEqual([]);
  });

  it("does not flag Kael or Mira, who were both established before the fork", () => {
    const entities = reviewBranch(TUNNEL, DEMO_BRANCHES).map((f) => f.entity);
    expect(entities).not.toContain("Kael");
    expect(entities).not.toContain("Mira");
  });

  it("flags an entity once, not in every later scene", () => {
    const extraScene: Scene = {
      ...TUNNEL.scenes[1],
      id: "scene-alt-2c",
      sceneNumber: 8,
      title: "After the Engine Room",
      order: 3,
      parentId: "scene-alt-2b",
    };
    const branch: Branch = { ...TUNNEL, scenes: [...TUNNEL.scenes, extraScene] };
    const branches = DEMO_BRANCHES.map((b) =>
      b.id === TUNNEL.id ? branch : b,
    );

    const archivist = reviewBranch(branch, branches).filter(
      (f) => f.entity === "The Archivist",
    );
    expect(archivist).toHaveLength(1);
    expect(archivist[0].sceneId).toBe("scene-alt-2b");
  });
});

describe("rule 3 — prop possession across a timeline", () => {
  /**
   * The acceptance criterion for issue #8, stated twice: the engine PRODUCES
   * the compass contradiction on the branch, and produces nothing on canon.
   * Neither assertion is against a stub — both call reviewBranch over the real
   * demo fixtures, which contain no written-out findings at all.
   */

  it("FIRES ON THE BRANCH: the tunnel route uses the compass after losing it", () => {
    const findings = reviewBranch(TUNNEL, DEMO_BRANCHES).filter(
      (f) => f.rule === "prop_without_holder",
    );

    expect(findings).toHaveLength(1);
    const [finding] = findings;

    expect(finding.sceneId).toBe("scene-alt-2b");
    expect(finding.entity).toBe("The Compass");
    expect(finding.severity).toBe("high");
    // The engine names the scene that took the prop away, not a generic warning.
    expect(finding.message).toContain("The Hidden Tunnel");
  });

  it("IS SILENT ON CANON: canon never separates the compass from Kael", () => {
    const findings = reviewBranch(CANON, DEMO_BRANCHES).filter(
      (f) => f.rule === "prop_without_holder",
    );
    expect(findings).toEqual([]);
  });

  it("the silence on canon is earned — canon really does carry the compass", () => {
    // If this drifts, the "silent on canon" assertion above becomes vacuous:
    // it would pass because the rule never had anything to evaluate.
    const carrying = CANON.scenes.filter(
      (s) => (s.propsUsed ?? []).includes("The Compass") && s.characters.includes("Kael"),
    );
    expect(carrying.length).toBe(CANON.scenes.length);

    const establishes = CANON.scenes.flatMap((s) => s.propEvents ?? []);
    expect(establishes).toContainEqual(
      expect.objectContaining({ prop: "The Compass", holder: "Kael" }),
    );
  });

  it("cites the propsUsed list and the authored beat as evidence", () => {
    const [finding] = reviewBranch(TUNNEL, DEMO_BRANCHES).filter(
      (f) => f.rule === "prop_without_holder",
    );

    const evidence = finding.evidence.join(" ");
    expect(evidence).toContain("propsUsed: [The Compass, Engine controls]");
    expect(evidence).toContain("aqueduct current");
    expect(finding.suggestedFix).toContain("The Compass");
  });

  it("does not flag the scene where the prop actually changes hands", () => {
    // The Hidden Tunnel both uses the compass and loses it. Possession is read
    // as the state entering the scene, so the scene is not at odds with itself.
    const flagged = reviewBranch(TUNNEL, DEMO_BRANCHES)
      .filter((f) => f.rule === "prop_without_holder")
      .map((f) => f.sceneId);
    expect(flagged).not.toContain("scene-alt-2a");
  });

  it("flags a prop whose holder is simply absent, not only a lost one", () => {
    // The other half of possession tracking: the prop still exists, but the
    // person carrying it is not in the scene.
    const [first, second] = TUNNEL.scenes;
    const branch: Branch = {
      ...TUNNEL,
      scenes: [
        {
          ...first,
          propEvents: [
            {
              prop: "The Compass",
              holder: "The Ferryman",
              note: "Kael presses the compass into the Ferryman's hands as payment.",
            },
          ],
        },
        second,
      ],
    };
    const branches = DEMO_BRANCHES.map((b) => (b.id === TUNNEL.id ? branch : b));

    const [finding] = reviewBranch(branch, branches).filter(
      (f) => f.rule === "prop_without_holder",
    );

    expect(finding.sceneId).toBe("scene-alt-2b");
    expect(finding.message).toContain("The Ferryman");
    expect(finding.evidence.join(" ")).toContain("The Ferryman is absent");
  });

  it("says nothing when the holder is in the scene", () => {
    const [first, second] = TUNNEL.scenes;
    const branch: Branch = {
      ...TUNNEL,
      scenes: [
        {
          ...first,
          propEvents: [
            {
              prop: "The Compass",
              holder: "Mira",
              note: "Kael hands Mira the compass at the tunnel mouth.",
            },
          ],
        },
        second, // Mira is in the engine room, so the compass can be too.
      ],
    };
    const branches = DEMO_BRANCHES.map((b) => (b.id === TUNNEL.id ? branch : b));

    expect(
      reviewBranch(branch, branches).filter((f) => f.rule === "prop_without_holder"),
    ).toEqual([]);
  });

  it("reports a broken prop once, not in every scene after it", () => {
    const [, second] = TUNNEL.scenes;
    const third: Scene = {
      ...second,
      id: "scene-alt-2c",
      sceneNumber: 8,
      title: "Still Carrying It",
      order: 3,
      parentId: "scene-alt-2b",
      characters: ["Kael", "Mira"],
    };
    const branch: Branch = { ...TUNNEL, scenes: [...TUNNEL.scenes, third] };
    const branches = DEMO_BRANCHES.map((b) => (b.id === TUNNEL.id ? branch : b));

    const compass = reviewBranch(branch, branches).filter(
      (f) => f.rule === "prop_without_holder",
    );
    expect(compass).toHaveLength(1);
    expect(compass[0].sceneId).toBe("scene-alt-2b");
  });

  it("ignores a prop the timeline never made a possession claim about", () => {
    // "Engine controls" has no propEvent anywhere. Props appearing for the
    // first time is ordinary authoring, not a contradiction.
    const entities = reviewBranch(TUNNEL, DEMO_BRANCHES)
      .filter((f) => f.rule === "prop_without_holder")
      .map((f) => f.entity);
    expect(entities).not.toContain("Engine controls");
    expect(entities).not.toContain("Aqueduct map");
  });
});

describe("ordering and output shape", () => {
  it("puts the most severe finding first", () => {
    const findings = reviewBranch(TUNNEL, DEMO_BRANCHES);
    expect(findings[0].severity).toBe("high");
  });

  it("produces deterministic ids — same input, same output", () => {
    const a = reviewBranch(TUNNEL, DEMO_BRANCHES).map((f) => f.id);
    const b = reviewBranch(TUNNEL, DEMO_BRANCHES).map((f) => f.id);
    expect(a).toEqual(b);
    expect(a).toEqual([
      "rule-unestablished-scene-alt-2b-the-archivist",
      "rule-prop-scene-alt-2b-the-compass",
    ]);
  });

  it("collects the project's entity vocabulary from both timelines", () => {
    const vocabulary = projectVocabulary(DEMO_BRANCHES);
    expect(vocabulary).toContain("The Compass");
    expect(vocabulary).toContain("The Archivist");
    expect(vocabulary).toContain("Kael");
  });
});

describe("continuityFlagsFor / withComputedFlags", () => {
  it("gives each flagged scene one line, keyed by scene id", () => {
    const flags = continuityFlagsFor(CANON, DEMO_BRANCHES);
    expect(Object.keys(flags)).toEqual(["scene-demo-3"]);
    expect(flags["scene-demo-3"]).toContain("The Compass");
  });

  it("applies flags without mutating the source scenes", () => {
    const flags = continuityFlagsFor(CANON, DEMO_BRANCHES);
    const annotated = withComputedFlags(CANON.scenes, flags);

    const scene3 = annotated.find((s) => s.id === "scene-demo-3")!;
    expect(scene3.continuityFlag).toContain("The Compass");

    // The originals are untouched.
    const original = CANON.scenes.find((s) => s.id === "scene-demo-3")!;
    expect(original.continuityFlag).toBeUndefined();
  });

  it("leaves unflagged scenes alone", () => {
    const flags = continuityFlagsFor(CANON, DEMO_BRANCHES);
    const annotated = withComputedFlags(CANON.scenes, flags);
    expect(
      annotated.find((s) => s.id === "scene-demo-1")!.continuityFlag,
    ).toBeUndefined();
  });
});

describe("the branch review is fed by the engine", () => {
  it("DEMO_BRANCH_REVIEW's findings match what the engine computes", () => {
    const computed = reviewBranch(TUNNEL, DEMO_BRANCHES);

    expect(DEMO_BRANCH_REVIEW.branchId).toBe(TUNNEL.id);
    expect(DEMO_BRANCH_REVIEW.findings.map((f) => f.id)).toEqual(
      computed.map((f) => f.id),
    );
    expect(DEMO_BRANCH_REVIEW.findings.map((f) => f.affectedSceneId)).toEqual(
      computed.map((f) => f.sceneId),
    );
  });

  it("carries the engine's evidence through to the reviewer", () => {
    const [finding] = DEMO_BRANCH_REVIEW.findings;
    expect(finding.evidence).toContain("Below the Archive");
    expect(finding.explanation).toContain("The Archivist");
    expect(finding.suggestedFix).not.toBe("");
  });

  it("still offers hand-written merge strategies — that is the assistant's job", () => {
    // The engine finds contradictions; it does not decide what a team should do
    // about them. Strategies becoming real is issue #25 (D5).
    expect(DEMO_BRANCH_REVIEW.strategies.length).toBeGreaterThanOrEqual(2);
    for (const strategy of DEMO_BRANCH_REVIEW.strategies) {
      expect(strategy.tradeoffs).not.toBe("");
    }
  });

  it("every scene id named by a strategy is a real scene on the branch", () => {
    const branchSceneIds = new Set(TUNNEL.scenes.map((s) => s.id));
    for (const strategy of DEMO_BRANCH_REVIEW.strategies) {
      for (const id of [
        ...strategy.compatibleSceneIds,
        ...strategy.conflictingSceneIds,
      ]) {
        expect(branchSceneIds.has(id)).toBe(true);
      }
    }
  });
});

describe("the demo data no longer carries written-out findings", () => {
  it("no scene ships with a hardcoded continuityFlag", () => {
    // This is the whole point of issue #8. If someone re-adds a hand-written
    // flag, the engine is no longer the source of truth and this fails.
    const hardcoded = DEMO_BRANCHES.flatMap((b) => b.scenes)
      .filter((s) => s.continuityFlag !== undefined)
      .map((s) => s.id);

    expect(hardcoded).toEqual([]);
  });
});
