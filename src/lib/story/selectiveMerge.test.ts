import { describe, expect, it } from "vitest";

import { DEMO_BRANCHES } from "@/lib/mock/demoBranches";
import { mergeSelectedScenes } from "@/lib/story/selectiveMerge";
import type { Branch, Scene } from "@/types/workspace";

const canon = DEMO_BRANCHES.find((branch) => branch.isCanon) as Branch;
const alternate = DEMO_BRANCHES.find((branch) => !branch.isCanon) as Branch;
const mergedAt = "2026-07-30T18:00:00.000Z";

describe("mergeSelectedScenes", () => {
  it("merges only the selected changed scene into canon", () => {
    const result = mergeSelectedScenes(
      canon,
      alternate,
      ["scene-alt-2a"],
      mergedAt,
    );

    expect(result.mergedBranchSceneIds).toEqual(["scene-alt-2a"]);
    expect(result.canonBranch.scenes[2]).toMatchObject({
      id: "scene-demo-3",
      title: "The Hidden Tunnel",
      location: "Underground Aqueduct",
      reviewStatus: "Merged",
      status: "canon",
      revision: 2,
      updatedAt: mergedAt,
    });
    expect(result.canonBranch.scenes[3]).toEqual(canon.scenes[3]);
    expect(result.sourceBranch.isCanon).toBe(false);
    expect(result.sourceBranch.scenes[0].reviewStatus).toBe("Merged");
    expect(result.sourceBranch.scenes[1].reviewStatus).toBe("Draft");
  });

  it("does nothing when no changed scenes are selected", () => {
    const result = mergeSelectedScenes(canon, alternate, [], mergedAt);

    expect(result.canonBranch).toBe(canon);
    expect(result.sourceBranch).toBe(alternate);
    expect(result.mergedScenes).toEqual([]);
  });

  it("copies a selected added scene into canon without reusing its branch id", () => {
    const addedScene: Scene = {
      ...alternate.scenes[0],
      id: "scene-alt-added",
      title: "After the Flood Gate",
      sceneNumber: 8,
      order: 3,
      parentId: alternate.scenes[0].id,
    };
    const shortCanon: Branch = {
      ...canon,
      scenes: canon.scenes.slice(0, 3),
    };
    const extendedBranch: Branch = {
      ...alternate,
      scenes: [alternate.scenes[0], addedScene],
    };

    const result = mergeSelectedScenes(
      shortCanon,
      extendedBranch,
      [addedScene.id],
      mergedAt,
    );
    const mergedScene = result.mergedScenes[0];

    expect(mergedScene).toMatchObject({
      id: "scene-alt-added-canon",
      title: "After the Flood Gate",
      status: "canon",
      reviewStatus: "Merged",
      parentId: "scene-demo-3",
      createdAt: mergedAt,
    });
    expect(mergedScene.id).not.toBe(addedScene.id);
    expect(result.sourceBranch.scenes[1].id).toBe(addedScene.id);
  });
});
