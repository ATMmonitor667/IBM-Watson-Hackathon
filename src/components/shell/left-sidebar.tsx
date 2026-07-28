"use client";

import { FileText, Lock, MapPin, Package, Plus, Scroll, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { ExplorerRow, ExplorerSection } from "@/components/shell/explorer";
import { BranchChip, StateChip } from "@/components/story/state-chip";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWorkspace } from "@/lib/store/workspace";
import {
  useActiveBranch,
  useWorkspaceData,
} from "@/lib/store/workspace-data";
import type { WorldFactKind } from "@/lib/types/schemas";

/**
 * Story Explorer — Obsidian's left sidebar. See STORYVERSE_DESIGN.txt §5.2.
 *
 * Timelines, their scenes, the cast, and the world. Everything here comes from
 * the workspace snapshot the project layout fetched; this component never
 * queries.
 */

const FACT_ICONS: Record<WorldFactKind, LucideIcon> = {
  prop: Package,
  location: MapPin,
  character: Users,
  rule: Scroll,
  event: Scroll,
};

export function LeftSidebar() {
  const { project, branches, scenesByBranch, characters, canonFacts, reviews } =
    useWorkspaceData();
  const activeBranch = useActiveBranch();

  const selectedSceneId = useWorkspace((s) => s.selectedSceneId);
  const selectScene = useWorkspace((s) => s.selectScene);
  const setActiveBranch = useWorkspace((s) => s.setActiveBranch);
  const openTab = useWorkspace((s) => s.openTab);

  function onScene(id: string, title: string, branchId: string) {
    // Clicking a scene in another timeline switches to it — the explorer is
    // the fastest way to jump between canon and a what-if in the demo.
    if (branchId !== activeBranch.id) setActiveBranch(branchId);
    selectScene(id);
    openTab({ id, title, kind: "scene" });
  }

  /** Scenes the continuity review flagged, so the explorer can mark them. */
  function flaggedScenes(branchId: string): Set<string> {
    const review = reviews[branchId];
    return new Set(review?.findings.map((f) => f.affected_scene_id) ?? []);
  }

  // The world section lists the distinct subjects canon knows about.
  const worldSubjects = Array.from(
    new Map(
      canonFacts
        .filter((f) => f.kind !== "character")
        .map((f) => [f.subject, f]),
    ).values(),
  );

  return (
    <div className="flex h-full flex-col bg-sv-chrome">
      <div className="flex h-10 shrink-0 items-center border-b border-sv-edge px-3">
        <span className="truncate text-ui font-medium text-sv-text">
          {project.title}
        </span>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="py-2">
          <ExplorerSection
            id="branches"
            label="Timelines"
            actions={
              <Button size="icon-sm" variant="ghost" aria-label="New timeline">
                <Plus />
              </Button>
            }
          >
            {branches.map((branch) => {
              const scenes = scenesByBranch[branch.id] ?? [];
              const flagged = flaggedScenes(branch.id);
              const active = branch.id === activeBranch.id;

              return (
                <div key={branch.id}>
                  <button
                    type="button"
                    onClick={() => setActiveBranch(branch.id)}
                    aria-current={active ? "true" : undefined}
                    className={
                      "flex h-6 w-full items-center gap-1.5 px-2 text-left transition-colors duration-120 " +
                      (active ? "bg-sv-accent-fill" : "hover:bg-sv-raised")
                    }
                  >
                    <BranchChip name={branch.name} canon={branch.is_canon} />
                    <StateChip state={branch.state} className="ml-auto" />
                  </button>

                  {scenes.map((scene) => (
                    <ExplorerRow
                      key={scene.id}
                      label={scene.title}
                      icon={FileText}
                      depth={1}
                      selected={
                        active && selectedSceneId === scene.id
                      }
                      onClick={() =>
                        onScene(scene.id, scene.title, branch.id)
                      }
                      trailing={
                        flagged.has(scene.id) ? (
                          <span
                            role="img"
                            aria-label="Contradiction"
                            className="block size-1.5 rounded-full bg-sv-conflict"
                          />
                        ) : null
                      }
                    />
                  ))}
                </div>
              );
            })}
          </ExplorerSection>

          <ExplorerSection id="characters" label="Cast">
            {characters.map((character) => (
              <ExplorerRow
                key={character.id}
                label={character.name}
                icon={Users}
                trailing={
                  character.locked_version_id ? (
                    <Lock
                      className="size-3 text-sv-canon"
                      aria-label="Design locked"
                    />
                  ) : null
                }
                onClick={() =>
                  openTab({
                    id: character.id,
                    title: character.name,
                    kind: "character",
                  })
                }
              />
            ))}
          </ExplorerSection>

          <ExplorerSection id="world" label="World">
            {worldSubjects.map((fact) => (
              <ExplorerRow
                key={fact.id}
                label={fact.subject}
                icon={FACT_ICONS[fact.kind]}
              />
            ))}
          </ExplorerSection>
        </div>
      </ScrollArea>
    </div>
  );
}
