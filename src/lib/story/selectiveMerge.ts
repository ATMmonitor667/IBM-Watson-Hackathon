import { compareBranchToCanon } from "@/lib/story/branchDiff";
import type { Branch, Scene } from "@/types/workspace";

export interface SelectiveMergeResult {
  canonBranch: Branch;
  sourceBranch: Branch;
  mergedScenes: Scene[];
  mergedBranchSceneIds: string[];
}

function nextCanonId(branchSceneId: string, existingIds: Set<string>): string {
  const baseId = `${branchSceneId}-canon`;
  if (!existingIds.has(baseId)) return baseId;

  let suffix = 2;
  while (existingIds.has(`${baseId}-${suffix}`)) {
    suffix += 1;
  }
  return `${baseId}-${suffix}`;
}

export function mergeSelectedScenes(
  canonBranch: Branch,
  sourceBranch: Branch,
  selectedBranchSceneIds: Iterable<string>,
  mergedAt: string = new Date().toISOString(),
): SelectiveMergeResult {
  const selectedIds = new Set(selectedBranchSceneIds);
  const comparisons = compareBranchToCanon(canonBranch, sourceBranch).comparisons;
  const selectedComparisons = comparisons.filter(
    (comparison) =>
      comparison.status !== "unchanged" &&
      selectedIds.has(comparison.branchScene.id),
  );

  if (sourceBranch.isCanon || selectedComparisons.length === 0) {
    return {
      canonBranch,
      sourceBranch,
      mergedScenes: [],
      mergedBranchSceneIds: [],
    };
  }

  const canonScenes = [...canonBranch.scenes];
  const existingIds = new Set(canonScenes.map((scene) => scene.id));
  const canonIdByBranchId = new Map(
    comparisons.flatMap((comparison) =>
      comparison.canonScene
        ? [[comparison.branchScene.id, comparison.canonScene.id] as const]
        : [],
    ),
  );
  const mergedScenes: Scene[] = [];
  const mergedBranchSceneIds: string[] = [];

  for (const comparison of selectedComparisons) {
    const branchScene = comparison.branchScene;

    if (comparison.status === "changed" && comparison.canonScene) {
      const canonIndex = canonScenes.findIndex(
        (scene) => scene.id === comparison.canonScene?.id,
      );
      if (canonIndex < 0) continue;

      const currentCanonScene = canonScenes[canonIndex];
      const mergedScene: Scene = {
        ...branchScene,
        id: currentCanonScene.id,
        projectId: canonBranch.projectId,
        sceneNumber: currentCanonScene.sceneNumber,
        reviewStatus: "Merged",
        status: "canon",
        order: currentCanonScene.order,
        parentId: currentCanonScene.parentId,
        revision:
          Math.max(currentCanonScene.revision, branchScene.revision) + 1,
        createdAt: currentCanonScene.createdAt,
        updatedAt: mergedAt,
      };
      canonScenes[canonIndex] = mergedScene;
      canonIdByBranchId.set(branchScene.id, mergedScene.id);
      mergedScenes.push(mergedScene);
      mergedBranchSceneIds.push(branchScene.id);
      continue;
    }

    if (comparison.status === "added") {
      const id = nextCanonId(branchScene.id, existingIds);
      existingIds.add(id);
      const parentId = branchScene.parentId
        ? canonIdByBranchId.get(branchScene.parentId) ??
          (existingIds.has(branchScene.parentId) ? branchScene.parentId : null)
        : null;
      const mergedScene: Scene = {
        ...branchScene,
        id,
        projectId: canonBranch.projectId,
        sceneNumber:
          Math.max(0, ...canonScenes.map((scene) => scene.sceneNumber)) + 1,
        reviewStatus: "Merged",
        status: "canon",
        order: Math.max(0, ...canonScenes.map((scene) => scene.order)) + 1,
        parentId,
        revision: branchScene.revision + 1,
        createdAt: mergedAt,
        updatedAt: mergedAt,
      };
      canonScenes.push(mergedScene);
      canonIdByBranchId.set(branchScene.id, id);
      mergedScenes.push(mergedScene);
      mergedBranchSceneIds.push(branchScene.id);
    }
  }

  const mergedIdSet = new Set(mergedBranchSceneIds);
  return {
    canonBranch: {
      ...canonBranch,
      scenes: canonScenes,
      updatedAt: mergedAt,
    },
    sourceBranch: {
      ...sourceBranch,
      scenes: sourceBranch.scenes.map((scene) =>
        mergedIdSet.has(scene.id)
          ? { ...scene, reviewStatus: "Merged", updatedAt: mergedAt }
          : scene,
      ),
      updatedAt: mergedAt,
    },
    mergedScenes,
    mergedBranchSceneIds,
  };
}
