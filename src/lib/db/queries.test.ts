import { describe, expect, it } from "vitest";

import {
  CANON_BRANCH_ID,
  PROJECT,
  WHATIF_BRANCH_ID,
} from "@/lib/demo/fixtures";
import {
  getBranchScenes,
  getBranches,
  getCanonBranch,
  getLatestReview,
  getLockedCharacterVersions,
  getScene,
  getWorkspaceSnapshot,
  getWorldFacts,
} from "@/lib/db/queries";
import { SceneWithVersionSchema } from "@/lib/types/schemas";

/**
 * Step P2's definition of done: `getBranchScenes` returns typed scenes for the
 * canon branch. Everything else here guards the properties the workspace and
 * the AI track depend on before they have any real backend to test against.
 */
describe("getBranchScenes", () => {
  it("returns canon's four scenes, in order, schema-valid", async () => {
    const scenes = await getBranchScenes(CANON_BRANCH_ID);

    expect(scenes).toHaveLength(4);
    expect(scenes.map((s) => s.order_index)).toEqual([0, 1, 2, 3]);
    expect(scenes.map((s) => s.id)).toEqual([
      "scene-main-s1",
      "scene-main-s2",
      "scene-main-s3",
      "scene-main-s4",
    ]);

    for (const scene of scenes) {
      expect(() => SceneWithVersionSchema.parse(scene)).not.toThrow();
      expect(scene.version.scene_id).toBe(scene.id);
    }
  });

  it("returns the what-if timeline's five scenes", async () => {
    const scenes = await getBranchScenes(WHATIF_BRANCH_ID);
    expect(scenes).toHaveLength(5);
    expect(scenes.at(-1)?.title).toContain("S5");
  });

  it("returns nothing for an unknown branch rather than throwing", async () => {
    await expect(getBranchScenes("branch-nope")).resolves.toEqual([]);
  });

  it("keeps the two timelines disjoint", async () => {
    const canon = await getBranchScenes(CANON_BRANCH_ID);
    const whatIf = await getBranchScenes(WHATIF_BRANCH_ID);
    const overlap = canon
      .map((s) => s.id)
      .filter((id) => whatIf.some((s) => s.id === id));
    expect(overlap).toEqual([]);
  });
});

describe("branches", () => {
  it("lists canon first", async () => {
    const branches = await getBranches(PROJECT.id);
    expect(branches[0].is_canon).toBe(true);
    expect(branches).toHaveLength(2);
  });

  it("resolves the canon branch", async () => {
    const canon = await getCanonBranch(PROJECT.id);
    expect(canon?.id).toBe(CANON_BRANCH_ID);
  });

  it("records where the what-if timeline forked", async () => {
    const branches = await getBranches(PROJECT.id);
    const whatIf = branches.find((b) => b.id === WHATIF_BRANCH_ID);
    expect(whatIf?.parent_branch_id).toBe(CANON_BRANCH_ID);
    expect(whatIf?.branched_from_scene_id).toBe("scene-main-s2");
  });
});

describe("world facts", () => {
  it("keeps canon and branch facts in separate lists", async () => {
    const { canon, branch } = await getWorldFacts(
      PROJECT.id,
      WHATIF_BRANCH_ID,
    );

    expect(canon.every((f) => f.branch_id === null)).toBe(true);
    expect(branch.every((f) => f.branch_id === WHATIF_BRANCH_ID)).toBe(true);
    expect(canon.map((f) => f.id)).toContain("fact-compass-possession");
    expect(branch.map((f) => f.id)).toContain("fact-compass-given-away");

    // The contradiction only exists because these two never merge.
    expect(canon.map((f) => f.id)).not.toContain("fact-compass-given-away");
  });

  it("returns no branch facts when no branch is asked for", async () => {
    const { branch } = await getWorldFacts(PROJECT.id);
    expect(branch).toEqual([]);
  });
});

describe("characters", () => {
  it("returns Wren's locked reference and skips unlocked characters", async () => {
    const locked = await getLockedCharacterVersions(PROJECT.id);
    expect(locked).toHaveLength(1);
    expect(locked[0].character.name).toBe("Wren");
    expect(locked[0].version.version_no).toBe(2);
    expect(locked[0].version.clothing_rules.join(" ")).toContain("left hip");
  });
});

describe("reviews", () => {
  it("returns the what-if timeline's continuity review", async () => {
    const review = await getLatestReview(WHATIF_BRANCH_ID);
    expect(review?.findings).toHaveLength(1);
    expect(review?.findings[0].affected_scene_id).toBe("scene-wf-s4");
  });

  it("returns null for canon, which has no open review", async () => {
    await expect(getLatestReview(CANON_BRANCH_ID)).resolves.toBeNull();
  });
});

describe("getWorkspaceSnapshot", () => {
  it("assembles everything the shell renders in one call", async () => {
    const snapshot = await getWorkspaceSnapshot(PROJECT.id);
    if (!snapshot) throw new Error("expected a snapshot");

    expect(snapshot.project.title).toBe("The Drowned Compass");
    expect(snapshot.branches).toHaveLength(2);
    expect(snapshot.scenesByBranch[CANON_BRANCH_ID]).toHaveLength(4);
    expect(snapshot.scenesByBranch[WHATIF_BRANCH_ID]).toHaveLength(5);
    expect(snapshot.lockedVersions["character-wren"].id).toBe("wren-v2");
    expect(snapshot.reviews[WHATIF_BRANCH_ID]).toBeDefined();
    expect(snapshot.memberNames["user-omit"]).toBe("Omit");
    expect(snapshot.activity[0].created_at).toBe("2026-07-27T15:10:00.000Z");
  });

  it("returns null for an unknown project", async () => {
    await expect(getWorkspaceSnapshot("project-nope")).resolves.toBeNull();
  });
});

describe("getScene", () => {
  it("resolves a scene with its current version", async () => {
    const scene = await getScene("scene-wf-s4");
    expect(scene?.version.props_used).toContain("brass compass");
    expect(scene?.forked_from_scene_id).toBe("scene-main-s4");
  });

  it("returns null for an unknown scene", async () => {
    await expect(getScene("scene-nope")).resolves.toBeNull();
  });
});
