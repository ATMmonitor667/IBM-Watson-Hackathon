import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  AI_REVIEW,
  ACTIVITY_EVENTS,
  BRANCHES,
  CANON_BRANCH_ID,
  CHARACTERS,
  CHARACTER_VERSIONS,
  EXPECTED_FINDING,
  MEMBERS,
  PROFILES,
  PROJECT,
  SCENES,
  SCENES_WITH_VERSIONS,
  SCENE_VERSIONS,
  WHATIF_BRANCH_ID,
  WORLD_FACTS,
} from "@/lib/demo/fixtures";
import {
  ActivityEventSchema,
  AiReviewSchema,
  BranchSchema,
  CharacterSchema,
  CharacterVersionSchema,
  ContinuityFindingSchema,
  ProfileSchema,
  ProjectMemberSchema,
  ProjectSchema,
  SceneSchema,
  SceneVersionSchema,
  SceneWithVersionSchema,
  WorldFactSchema,
} from "@/lib/types/schemas";

/**
 * The contract test. Fixtures, the seed script, and the real queries all have
 * to satisfy the same schemas (plan §5) — this is the half of that promise
 * that a test can enforce today, and it fails the build instead of the demo.
 */
describe("fixtures satisfy the contract", () => {
  const cases: [string, z.ZodType, unknown[]][] = [
    ["profiles", ProfileSchema, PROFILES],
    ["project", ProjectSchema, [PROJECT]],
    ["members", ProjectMemberSchema, MEMBERS],
    ["branches", BranchSchema, BRANCHES],
    ["characters", CharacterSchema, CHARACTERS],
    ["characterVersions", CharacterVersionSchema, CHARACTER_VERSIONS],
    ["scenes", SceneSchema, SCENES],
    ["sceneVersions", SceneVersionSchema, SCENE_VERSIONS],
    ["scenesWithVersions", SceneWithVersionSchema, SCENES_WITH_VERSIONS],
    ["worldFacts", WorldFactSchema, WORLD_FACTS],
    ["activityEvents", ActivityEventSchema, ACTIVITY_EVENTS],
    ["aiReviews", AiReviewSchema, [AI_REVIEW]],
    ["expectedFinding", ContinuityFindingSchema, [EXPECTED_FINDING]],
  ];

  it.each(cases)("%s parse", (_name, schema, rows) => {
    for (const row of rows) {
      expect(() => schema.parse(row)).not.toThrow();
    }
  });
});

describe("referential integrity", () => {
  it("every scene points at a version that exists and belongs to it", () => {
    for (const scene of SCENES) {
      const version = SCENE_VERSIONS.find(
        (v) => v.id === scene.current_version_id,
      );
      expect(version, `${scene.id} has no current version`).toBeDefined();
      expect(version?.scene_id).toBe(scene.id);
    }
  });

  it("every scene belongs to a declared branch", () => {
    const branchIds = new Set(BRANCHES.map((b) => b.id));
    for (const scene of SCENES) {
      expect(branchIds.has(scene.branch_id)).toBe(true);
    }
  });

  it("exactly one branch is canon", () => {
    expect(BRANCHES.filter((b) => b.is_canon)).toHaveLength(1);
  });

  it("locked character versions exist", () => {
    for (const character of CHARACTERS) {
      if (!character.locked_version_id) continue;
      const version = CHARACTER_VERSIONS.find(
        (v) => v.id === character.locked_version_id,
      );
      expect(version?.character_id).toBe(character.id);
    }
  });

  it("world facts cite scenes that exist", () => {
    const sceneIds = new Set(SCENES.map((s) => s.id));
    for (const fact of WORLD_FACTS) {
      if (!fact.established_in_scene_id) continue;
      expect(sceneIds.has(fact.established_in_scene_id)).toBe(true);
    }
  });

  it("branch scene order is dense and starts at zero", () => {
    for (const branch of BRANCHES) {
      const orders = SCENES.filter((s) => s.branch_id === branch.id)
        .map((s) => s.order_index)
        .sort((a, b) => a - b);
      expect(orders).toEqual(orders.map((_, i) => i));
    }
  });
});

/**
 * The demo's centrepiece, guarded. If someone tidies the fixtures and quietly
 * removes the compass from the what-if S4, the continuity inspector has
 * nothing to find and the most important fifteen seconds of the video go
 * silent. Fail here instead.
 */
describe("the planted contradiction", () => {
  const sceneVersion = (sceneId: string) => {
    const scene = SCENES_WITH_VERSIONS.find((s) => s.id === sceneId);
    if (!scene) throw new Error(`missing scene ${sceneId}`);
    return scene.version;
  };

  it("canon establishes that Wren holds the compass", () => {
    const fact = WORLD_FACTS.find((f) => f.id === "fact-compass-possession");
    expect(fact?.status).toBe("canon");
    expect(fact?.branch_id).toBeNull();
    expect(fact?.established_in_scene_id).toBe("scene-main-s2");
    expect(sceneVersion("scene-main-s2").props_used).toContain("brass compass");
  });

  it("the what-if S3 gives the compass away", () => {
    expect(sceneVersion("scene-wf-s3").props_used).not.toContain(
      "brass compass",
    );
    const fact = WORLD_FACTS.find((f) => f.id === "fact-compass-given-away");
    expect(fact?.branch_id).toBe(WHATIF_BRANCH_ID);
    expect(fact?.status).toBe("branch");
  });

  it("the what-if S4 still uses it — this is the contradiction", () => {
    expect(sceneVersion("scene-wf-s4").props_used).toContain("brass compass");
    expect(EXPECTED_FINDING.affected_scene_id).toBe("scene-wf-s4");
    expect(EXPECTED_FINDING.kind).toBe("prop_state");
    expect(EXPECTED_FINDING.severity).toBe("high");
  });

  it("canon has no such contradiction — the compass is never given away", () => {
    const canonScenes = SCENES_WITH_VERSIONS.filter(
      (s) => s.branch_id === CANON_BRANCH_ID,
    ).sort((a, b) => a.order_index - b.order_index);

    // From S2 onward the compass stays in Wren's hands on canon. A rule engine
    // that fires here is over-eager, and this asserts the negative case.
    const fromPickup = canonScenes.slice(1);
    for (const scene of fromPickup) {
      expect(scene.version.props_used).toContain("brass compass");
    }
  });

  it("the finding cites both the giving-away and the reuse", () => {
    const cited = EXPECTED_FINDING.evidence.map((e) => e.scene_id);
    expect(cited).toContain("scene-wf-s3");
    expect(cited).toContain("scene-wf-s4");
  });
});
