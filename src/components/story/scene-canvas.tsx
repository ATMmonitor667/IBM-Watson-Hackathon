"use client";

import { Plus } from "lucide-react";

import { SceneCard } from "@/components/story/scene-card";
import { BranchChip, StateChip } from "@/components/story/state-chip";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/lib/store/workspace";
import {
  useActiveBranch,
  useActiveScenes,
  useWorkspaceData,
} from "@/lib/store/workspace-data";

/**
 * SceneCanvas — the ordered scene sequence for the active timeline.
 * See STORYVERSE_DESIGN.txt §5.10.
 *
 * Scenes flagged by the timeline's continuity review render as conflicted, so
 * the contradiction is visible on the canvas before anyone opens the review.
 */
export function SceneCanvas() {
  const { characters, memberNames, reviews } = useWorkspaceData();
  const branch = useActiveBranch();
  const scenes = useActiveScenes();

  const selectedSceneId = useWorkspace((s) => s.selectedSceneId);
  const selectScene = useWorkspace((s) => s.selectScene);
  const openTab = useWorkspace((s) => s.openTab);

  const characterNames = Object.fromEntries(
    characters.map((c) => [c.id, c.name]),
  );
  const flagged = new Set(
    reviews[branch.id]?.findings.map((f) => f.affected_scene_id) ?? [],
  );

  return (
    <div className="p-4">
      <header className="mb-4 flex flex-wrap items-center gap-2">
        <BranchChip name={branch.name} canon={branch.is_canon} />
        <StateChip state={branch.state} />
        <span className="text-meta text-sv-muted">
          {scenes.length} {scenes.length === 1 ? "scene" : "scenes"}
        </span>
        <Button size="sm" variant="outline" className="ml-auto">
          <Plus />
          New scene
        </Button>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {scenes.map((scene) => (
          <button
            key={scene.id}
            type="button"
            className="text-left"
            onClick={() => {
              selectScene(scene.id);
              openTab({ id: scene.id, title: scene.title, kind: "scene" });
            }}
          >
            <SceneCard
              scene={scene}
              authorName={memberNames[scene.version.author_id]}
              characterNames={characterNames}
              variant={
                flagged.has(scene.id)
                  ? "conflicted"
                  : selectedSceneId === scene.id
                    ? "selected"
                    : "default"
              }
            />
          </button>
        ))}
      </div>
    </div>
  );
}
