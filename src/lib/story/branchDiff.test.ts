import { describe, expect, it } from "vitest";

import {
  compareBranchToCanon,
  compareSceneFields,
} from "@/lib/story/branchDiff";
import { DEMO_BRANCHES } from "@/lib/mock/demoBranches";
import type { Branch, Scene } from "@/types/workspace";

const canon = DEMO_BRANCHES.find((branch) => branch.isCanon)!;
const alternate = DEMO_BRANCHES.find((branch) => !branch.isCanon)!;

function copyScene(scene: Scene, changes: Partial<Scene>): Scene {
  return { ...scene, ...changes };
}

function branchWithScenes(scenes: Scene[]): Branch {
  return { ...alternate, scenes };
}

describe("compareSceneFields", () => {
  it("reports the creative fields required by the visual review", () => {
    const changes = compareSceneFields(canon.scenes[2], alternate.scenes[0]);
    const fields = changes.map((change) => change.field);

    expect(fields).toContain("dialogueExcerpt");
    expect(fields).toContain("propsUsed");
    expect(fields).toContain("action");
    expect(fields).toContain("emotionalBeat");
  });

  it("ignores revision and review metadata", () => {
    const original = canon.scenes[2];
    const metadataOnly = copyScene(original, {
      id: "branch-copy",
      revision: original.revision + 1,
      reviewStatus: "Under Review",
      updatedAt: "2026-07-30T12:00:00.000Z",
    });

    expect(compareSceneFields(original, metadataOnly)).toEqual([]);
  });

  it("normalizes list order before comparing characters and props", () => {
    const original = canon.scenes[4];
    const reordered = copyScene(original, {
      characters: [...original.characters].reverse(),
      propsUsed: [...(original.propsUsed ?? [])].reverse(),
    });

    expect(compareSceneFields(original, reordered)).toEqual([]);
  });
});

describe("compareBranchToCanon", () => {
  it("marks shared history unchanged and divergent demo scenes changed", () => {
    const diff = compareBranchToCanon(canon, alternate);

    expect(diff.comparisons.map((comparison) => comparison.status)).toEqual([
      "unchanged",
      "unchanged",
      "changed",
      "changed",
    ]);
    expect(diff.counts).toEqual({ unchanged: 2, changed: 2, added: 0 });
  });

  it("marks branch scenes beyond the canon continuation as added", () => {
    const extraScene = copyScene(alternate.scenes[1], {
      id: "scene-alt-extra",
      sceneNumber: 8,
      title: "The New Exit",
      order: 3,
    });
    const diff = compareBranchToCanon(
      { ...canon, scenes: canon.scenes.slice(0, 4) },
      branchWithScenes([...alternate.scenes, extraScene]),
    );

    expect(diff.comparisons.at(-1)).toMatchObject({
      status: "added",
      branchScene: { id: "scene-alt-extra" },
    });
    expect(diff.counts.added).toBe(1);
  });

  it("recognizes an unchanged positional replacement after the fork", () => {
    const canonContinuation = canon.scenes[2];
    const identicalBranchScene = copyScene(canonContinuation, {
      id: "scene-identical-branch-copy",
      status: "draft",
    });
    const diff = compareBranchToCanon(
      canon,
      branchWithScenes([identicalBranchScene]),
    );

    expect(diff.comparisons.at(-1)?.status).toBe("unchanged");
    expect(diff.comparisons.at(-1)?.changes).toEqual([]);
  });
});
