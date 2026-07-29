import { describe, expect, it } from "vitest";

import { findContinuityIssues } from "@/lib/ai/rules";
import {
  CANON_BRANCH_ID,
  CHARACTERS,
  PROJECT,
  WHATIF_BRANCH_ID,
} from "@/lib/demo/fixtures";
import { getBranchScenes, getWorldFacts } from "@/lib/db/queries";
import { ContinuityFindingSchema } from "@/lib/types/schemas";

async function runOn(branchId: string) {
  const [scenes, facts] = await Promise.all([
    getBranchScenes(branchId),
    getWorldFacts(PROJECT.id, branchId),
  ]);

  return findContinuityIssues({
    scenes,
    canonFacts: facts.canon,
    branchFacts: facts.branch,
    characters: CHARACTERS,
  });
}

/**
 * Plan §10, test 2 — and the single most important test in the project. Both
 * halves matter equally: an engine that fires on canon is as broken as one
 * that misses the what-if.
 */
describe("the continuity rule engine", () => {
  it("finds the compass contradiction on the what-if timeline", async () => {
    const findings = await runOn(WHATIF_BRANCH_ID);

    expect(findings).toHaveLength(1);
    const [finding] = findings;

    expect(finding.kind).toBe("prop_state");
    expect(finding.severity).toBe("high");
    expect(finding.affected_scene_id).toBe("scene-wf-s4");
    expect(finding.source).toBe("rule");
    expect(finding.broken_fact.subject).toBe("brass compass");
  });

  it("cites the scene that gave the compass away and the scene that reuses it", async () => {
    const [finding] = await runOn(WHATIF_BRANCH_ID);
    const cited = finding.evidence.map((e) => e.scene_id);

    expect(cited).toContain("scene-wf-s3");
    expect(cited).toContain("scene-wf-s4");
    expect(finding.evidence.some((e) => e.quote_or_field.includes("props_used")))
      .toBe(true);
  });

  it("names the holder and the scene in plain language", async () => {
    const [finding] = await runOn(WHATIF_BRANCH_ID);

    expect(finding.explanation).toContain("S4");
    expect(finding.explanation).toContain("brass compass");
    expect(finding.explanation).toContain("The stranger");
    expect(finding.suggested_fix).not.toBe("");
  });

  it("stays silent on canon", async () => {
    await expect(runOn(CANON_BRANCH_ID)).resolves.toEqual([]);
  });

  it("does not flag S5, where the compass and its holder are both present", async () => {
    const findings = await runOn(WHATIF_BRANCH_ID);
    // The stranger carries the compass into S5 and is in the scene, so the
    // prop is legitimately there. An engine that flags this is over-eager.
    expect(findings.map((f) => f.affected_scene_id)).not.toContain(
      "scene-wf-s5",
    );
  });

  it("emits schema-valid findings", async () => {
    for (const finding of await runOn(WHATIF_BRANCH_ID)) {
      expect(() => ContinuityFindingSchema.parse(finding)).not.toThrow();
    }
  });
});

describe("rule engine edge cases", () => {
  it("returns nothing when there are no facts to reason from", async () => {
    const scenes = await getBranchScenes(WHATIF_BRANCH_ID);
    const findings = findContinuityIssues({
      scenes,
      canonFacts: [],
      branchFacts: [],
      characters: CHARACTERS,
    });
    expect(findings).toEqual([]);
  });

  it("ignores facts whose statement is outside the fact grammar", async () => {
    const scenes = await getBranchScenes(WHATIF_BRANCH_ID);
    const findings = findContinuityIssues({
      scenes,
      canonFacts: [
        {
          id: "fact-vague",
          project_id: PROJECT.id,
          branch_id: null,
          kind: "prop",
          subject: "brass compass",
          // No cast member named, so possession is unknowable deterministically.
          statement: "The brass compass matters more than it should.",
          established_in_scene_id: "scene-main-s2",
          status: "canon",
        },
      ],
      branchFacts: [],
      characters: CHARACTERS,
    });

    // Silence, not a guess. Unparseable facts are stage 2's problem.
    expect(findings).toEqual([]);
  });

  it("respects a later fact that hands the prop back", async () => {
    const scenes = await getBranchScenes(WHATIF_BRANCH_ID);
    const findings = findContinuityIssues({
      scenes,
      canonFacts: [
        {
          id: "fact-held",
          project_id: PROJECT.id,
          branch_id: null,
          kind: "prop",
          subject: "brass compass",
          statement: "The brass compass is in Wren's possession.",
          established_in_scene_id: "scene-main-s2",
          status: "canon",
        },
      ],
      branchFacts: [
        {
          id: "fact-given",
          project_id: PROJECT.id,
          branch_id: WHATIF_BRANCH_ID,
          kind: "prop",
          subject: "brass compass",
          statement: "Wren gave the brass compass to the stranger.",
          established_in_scene_id: "scene-wf-s3",
          status: "branch",
        },
        {
          id: "fact-returned",
          project_id: PROJECT.id,
          branch_id: WHATIF_BRANCH_ID,
          kind: "prop",
          subject: "brass compass",
          // Same scene as the reuse, so possession is Wren's again by then.
          statement: "The stranger handed the brass compass back to Wren.",
          established_in_scene_id: "scene-wf-s4",
          status: "branch",
        },
      ],
      characters: CHARACTERS,
    });

    expect(findings).toEqual([]);
  });
});
