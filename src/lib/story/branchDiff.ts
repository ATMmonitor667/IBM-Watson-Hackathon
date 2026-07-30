import type { Branch, Scene } from "@/types/workspace";

export type SceneDiffStatus = "unchanged" | "changed" | "added";

export type SceneDiffField =
  | "title"
  | "location"
  | "dialogueExcerpt"
  | "action"
  | "characters"
  | "propsUsed"
  | "emotionalBeat";

export interface SceneFieldChange {
  field: SceneDiffField;
  label: string;
  before?: string;
  after?: string;
}

export interface SceneComparison {
  id: string;
  status: SceneDiffStatus;
  canonScene?: Scene;
  branchScene: Scene;
  changes: SceneFieldChange[];
}

export interface BranchDiff {
  comparisons: SceneComparison[];
  counts: Record<SceneDiffStatus, number>;
}

type ComparableField = {
  field: SceneDiffField;
  label: string;
  value: (scene: Scene) => string;
};

const COMPARABLE_FIELDS: ComparableField[] = [
  { field: "title", label: "Title", value: (scene) => scene.title.trim() },
  { field: "location", label: "Location", value: (scene) => scene.location.trim() },
  {
    field: "dialogueExcerpt",
    label: "Dialogue",
    value: (scene) => scene.dialogueExcerpt.trim(),
  },
  { field: "action", label: "Action", value: (scene) => scene.action?.trim() ?? "" },
  {
    field: "characters",
    label: "Characters",
    value: (scene) => normalizedList(scene.characters),
  },
  {
    field: "propsUsed",
    label: "Props",
    value: (scene) => normalizedList(scene.propsUsed ?? []),
  },
  {
    field: "emotionalBeat",
    label: "Emotional beat",
    value: (scene) => scene.emotionalBeat.trim(),
  },
];

function normalizedList(items: string[]): string {
  return [...items]
    .map((item) => item.trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))
    .join(", ");
}

export function compareSceneFields(
  canonScene: Scene,
  branchScene: Scene,
): SceneFieldChange[] {
  return COMPARABLE_FIELDS.flatMap(({ field, label, value }) => {
    const before = value(canonScene);
    const after = value(branchScene);
    if (before === after) return [];

    return [
      {
        field,
        label,
        before: before || undefined,
        after: after || undefined,
      },
    ];
  });
}

/**
 * Storyverse branches store only their divergent scenes. Scenes through the
 * branch's sourceSceneId are shared canon history. After that fork, scenes are
 * paired by narrative position. A branch scene without a counterpart is added.
 */
export function compareBranchToCanon(
  canonBranch: Branch,
  branch: Branch,
): BranchDiff {
  const forkIndex = canonBranch.scenes.findIndex(
    (scene) => scene.id === branch.sourceSceneId,
  );
  const sharedSceneCount = forkIndex >= 0 ? forkIndex + 1 : 0;
  const sharedScenes = canonBranch.scenes.slice(0, sharedSceneCount);
  const canonAfterFork = canonBranch.scenes.slice(sharedSceneCount);

  const sharedComparisons: SceneComparison[] = sharedScenes.map((scene) => ({
    id: `shared-${scene.id}`,
    status: "unchanged",
    canonScene: scene,
    branchScene: scene,
    changes: [],
  }));

  const branchComparisons: SceneComparison[] = branch.scenes.map(
    (branchScene, index) => {
      const canonScene = canonAfterFork[index];
      if (!canonScene) {
        return {
          id: `added-${branchScene.id}`,
          status: "added" as const,
          branchScene,
          changes: COMPARABLE_FIELDS.map(({ field, label, value }) => {
            const after = value(branchScene);
            return { field, label, after: after || undefined };
          }).filter((change) => change.after !== undefined),
        };
      }

      const changes = compareSceneFields(canonScene, branchScene);
      return {
        id: `compared-${canonScene.id}-${branchScene.id}`,
        status: changes.length === 0 ? ("unchanged" as const) : ("changed" as const),
        canonScene,
        branchScene,
        changes,
      };
    },
  );

  const comparisons = [...sharedComparisons, ...branchComparisons];
  const counts: Record<SceneDiffStatus, number> = {
    unchanged: 0,
    changed: 0,
    added: 0,
  };

  for (const comparison of comparisons) {
    counts[comparison.status] += 1;
  }

  return { comparisons, counts };
}
