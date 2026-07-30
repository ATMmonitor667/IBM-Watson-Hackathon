import type {
  Scene,
  SceneContributor,
  SceneRevision,
} from "@/types/workspace";

export interface SceneEditFields {
  title: string;
  location: string;
  dialogueExcerpt: string;
  characters: string[];
  emotionalBeat: string;
}

export function createSceneRevision(
  scene: Scene,
  branchId: string,
): SceneRevision {
  return {
    id: `${scene.id}-revision-${scene.revision}`,
    sceneId: scene.id,
    projectId: scene.projectId,
    branchId,
    revision: scene.revision,
    title: scene.title,
    location: scene.location,
    dialogueExcerpt: scene.dialogueExcerpt,
    characters: [...scene.characters],
    emotionalBeat: scene.emotionalBeat,
    contributor: { ...scene.contributor },
    createdAt: scene.updatedAt,
  };
}

export function createEditedScene(
  scene: Scene,
  fields: SceneEditFields,
  contributor: SceneContributor,
  editedAt: string = new Date().toISOString(),
): Scene {
  return {
    ...scene,
    ...fields,
    characters: [...fields.characters],
    reviewStatus: "Draft",
    continuityFlag: undefined,
    contributor: { ...contributor },
    revision: scene.revision + 1,
    updatedAt: editedAt,
  };
}
