"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Toaster } from "sonner";
import { RefreshCw } from "lucide-react";

import { BranchTree } from "@/components/workspace/BranchTree";
import { ProjectHeader } from "@/components/workspace/ProjectHeader";
import { WorkspacePageSkeleton } from "@/components/workspace/LoadingSkeletons";
import { ErrorState } from "@/components/workspace/StateViews";
import { SceneCanvas } from "@/components/workspace/SceneCanvas";
import { SceneDetailPanel, CreateBranchPanel, CreateScenePanel, MergePreviewPanel } from "@/components/workspace/BranchPanels";
import { useProjectStore } from "@/store/projectStore";
import { useUiStore } from "@/store/uiStore";
import { useActivityStore } from "@/store/activityStore";
import { DEMO_SCENES } from "@/lib/mock/demoScenes";
import { DEMO_BRANCHES } from "@/lib/mock/demoBranches";
import {
  continuityFlagsFor,
  withComputedFlags,
} from "@/lib/ai/continuityRules";
import { mergeSelectedScenes } from "@/lib/story/selectiveMerge";
import type { Branch, Scene } from "@/types/workspace";

interface ProjectPageClientProps {
  id: string;
}

// Reduced-motion flag (evaluated once)
const prefersReduced =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function ProjectPageClient({ id }: ProjectPageClientProps) {
  const { loadProjects, getProject, isLoading, error, dataSource } =
    useProjectStore();
  const [retryKey, setRetryKey] = useState(0);

  // Branch + scene state — seeded from mock, mutated on branch create / merge
  const [branches, setBranches] = useState<Branch[]>(
    id === "demo-1" ? DEMO_BRANCHES : [],
  );
  const [scenes, setScenes] = useState<Scene[]>(
    id === "demo-1" ? DEMO_SCENES : [],
  );
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [loadedWorkspaceKey, setLoadedWorkspaceKey] = useState(
    `mock:${id}:0`,
  );
  // Whether a "re-fetch" is in progress after merge
  const [isRefreshing, setIsRefreshing] = useState(false);
  const workspaceKey = `${dataSource}:${id}:${retryKey}`;

  const openPanelId   = useUiStore((s) => s.openPanelId);
  const addActivity    = useActivityStore((s) => s.addEntry);
  const activityEntries = useActivityStore((s) => s.entries);

  const handleBranchCreated = useCallback(
    (branch: Branch) => {
      setBranches((prev) => [...prev, branch]);
      addActivity({ message: `Branch "${branch.name}" created`, type: "branch" });
    },
    [addActivity],
  );

  const handleSceneCreated = useCallback(
    (scene: Scene) => {
      setScenes((prev) => [...prev, scene]);
      addActivity({ message: `Scene #${scene.sceneNumber} "${scene.title}" added`, type: "scene" });
    },
    [addActivity],
  );

  const handleMergeBranch = useCallback(
    async (branchId: string, selectedSceneIds: string[]) => {
      const branch = branches.find((b) => b.id === branchId);
      const canonBranch = branches.find((candidate) => candidate.isCanon);
      if (!branch || !canonBranch || selectedSceneIds.length === 0) return;

      setIsRefreshing(true);

      await new Promise((r) => setTimeout(r, prefersReduced ? 0 : 600));
      const mergedAt = new Date().toISOString();
      const result = mergeSelectedScenes(
        canonBranch,
        branch,
        selectedSceneIds,
        mergedAt,
      );
      const mergedCanonById = new Map(
        result.canonBranch.scenes.map((scene) => [scene.id, scene]),
      );
      const mergedBranchIds = new Set(result.mergedBranchSceneIds);

      setScenes((prev) => {
        const nextScenes = prev.map((scene) => {
          const mergedCanonScene = mergedCanonById.get(scene.id);
          if (mergedCanonScene) return mergedCanonScene;
          if (mergedBranchIds.has(scene.id)) {
            return {
              ...scene,
              reviewStatus: "Merged" as const,
              updatedAt: mergedAt,
            };
          }
          return scene;
        });

        for (const mergedScene of result.mergedScenes) {
          if (!nextScenes.some((scene) => scene.id === mergedScene.id)) {
            nextScenes.push(mergedScene);
          }
        }
        return nextScenes;
      });

      setBranches((prev) =>
        prev.map((candidate) => {
          if (candidate.id === result.canonBranch.id) {
            return result.canonBranch;
          }
          if (candidate.id === result.sourceBranch.id) {
            return result.sourceBranch;
          }
          return candidate;
        }),
      );

      addActivity({
        message:
          `${result.mergedBranchSceneIds.length} scene(s) from ` +
          `"${branch.name}" merged into canon`,
        type: "merge",
      });

      setIsRefreshing(false);

      const { toast } = await import("sonner");
      toast.success(`Selected scenes merged from "${branch.name}"`, {
        description:
          `${result.mergedBranchSceneIds.length} scene(s) changed canon; ` +
          "unchecked scenes were left on the branch.",
      });
    },
    [branches, addActivity],
  );

  /**
   * Continuity findings are COMPUTED from the scene data on every change, not
   * read from a stored string (issue #8 / D3). Edit a scene's cast or dialogue
   * and the warning on its card appears or disappears accordingly — which is
   * the difference between a continuity checker and a screenshot of one.
   *
   * The scene card and the branch-tree node already render `continuityFlag`, so
   * feeding them computed values needed no change to either component.
   */
  const computedFlags = useMemo(() => {
    const flags: Record<string, string> = {};
    for (const branch of branches) {
      Object.assign(flags, continuityFlagsFor(branch, branches));
    }
    return flags;
  }, [branches]);

  const scenesWithFindings = useMemo(
    () => withComputedFlags(scenes, computedFlags),
    [scenes, computedFlags],
  );

  const branchesWithFindings = useMemo(
    () =>
      branches.map((branch) => ({
        ...branch,
        scenes: withComputedFlags(branch.scenes, computedFlags),
      })),
    [branches, computedFlags],
  );

  useEffect(() => {
    loadProjects();
  }, [loadProjects, retryKey]);

  useEffect(() => {
    let cancelled = false;

    async function loadWorkspace() {
      setWorkspaceError(null);

      if (dataSource === "mock") {
        setBranches(id === "demo-1" ? DEMO_BRANCHES : []);
        setScenes(id === "demo-1" ? DEMO_SCENES : []);
        setLoadedWorkspaceKey(workspaceKey);
        return;
      }

      try {
        const [{ createClient }, { fetchBranches, fetchScenes }] =
          await Promise.all([
            import("@/lib/supabase/client"),
            import("@/lib/supabase/db"),
          ]);
        const client = createClient();
        const [loadedBranches, loadedScenes] = await Promise.all([
          fetchBranches(client, id),
          fetchScenes(client, id),
        ]);

        if (cancelled) return;
        setBranches(loadedBranches);
        setScenes(loadedScenes);
        setLoadedWorkspaceKey(workspaceKey);
      } catch (loadError) {
        if (cancelled) return;
        const message =
          loadError instanceof Error
            ? loadError.message
            : "Failed to load workspace data";
        setWorkspaceError(message);
        setLoadedWorkspaceKey(workspaceKey);
      }
    }

    void loadWorkspace();

    return () => {
      cancelled = true;
    };
  }, [dataSource, id, workspaceKey]);

  if (isLoading || loadedWorkspaceKey !== workspaceKey) {
    return <WorkspacePageSkeleton />;
  }

  if (error || workspaceError) {
    return (
      <div className="flex h-full items-center justify-center">
        <ErrorState
          message={workspaceError ?? error ?? "Failed to load project"}
          onRetry={() => setRetryKey((k) => k + 1)}
        />
      </div>
    );
  }

  const project = getProject(id);

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center">
        <ErrorState
          message={`No project found with ID "${id}". It may have been deleted or the link is incorrect.`}
          onRetry={() => setRetryKey((k) => k + 1)}
        />
      </div>
    );
  }

  return (
    <>
      <Toaster position="bottom-right" richColors />

      <div className="flex h-full flex-col">
        {/* Project header */}
        <ProjectHeader
          title={project.title}
          status={project.status}
          createdAt={project.createdAt}
          collaboratorCount={project.collaborators.length}
        />

        {/* Three-region workspace layout
            Mobile:  flex-col  (canvas on top, branch tree below)
            Desktop: flex-row  (side by side) */}
        <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
          {/* Scene canvas area */}
          <section
            className="relative flex min-h-0 flex-1 overflow-hidden border-b border-white/10 bg-slate-950 md:border-b-0 md:border-r"
            aria-label="Scene canvas"
          >
            <SceneCanvas
              scenes={scenesWithFindings}
              isLoading={isRefreshing}
              projectTitle={project.title}
              onAddScene={() => useUiStore.getState().openPanel("create-scene")}
            />
            {openPanelId === "create-scene" && (
              <CreateScenePanel
                projectId={id}
                nextSceneNumber={scenes.length + 1}
                onCreated={handleSceneCreated}
              />
            )}
          </section>

          {/* Branch tree area — position:relative so panels anchor here
              Mobile: full width, fixed height; Desktop: fixed width, full height */}
          <section
            className="relative flex h-72 shrink-0 flex-col overflow-hidden bg-slate-900 md:h-auto md:w-[420px]"
            aria-label="Branch tree"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Branch Tree
              </h2>
              {/* Refresh indicator */}
              {isRefreshing && (
                <span className="flex items-center gap-1 text-[10px] text-slate-400">
                  <RefreshCw className="size-3 animate-spin" aria-hidden="true" />
                  Refreshing…
                </span>
              )}
            </div>
            <div className="flex-1 overflow-hidden" style={{ height: "100%" }}>
              <BranchTree branches={branchesWithFindings} />
            </div>

            {/* Detail / create-branch / merge-preview panels — slide in over the branch tree */}
            {openPanelId === "scene-detail" && (
              <SceneDetailPanel
                scenes={scenesWithFindings}
                branches={branchesWithFindings}
              />
            )}
            {openPanelId === "create-branch" && (
              <CreateBranchPanel
                scenes={scenesWithFindings}
                onBranchCreated={handleBranchCreated}
              />
            )}
            {openPanelId === "merge-preview" && (
              <MergePreviewPanel
                branches={branchesWithFindings}
                onMergeBranch={handleMergeBranch}
              />
            )}
          </section>
        </div>

        {/* Bottom: activity feed */}
        <footer
          className="flex h-10 shrink-0 items-center gap-3 overflow-hidden border-t border-white/10 bg-slate-900 px-5"
          aria-label="Activity feed"
          aria-live="polite"
        >
          {activityEntries.length > 0 ? (
            <>
              <span
                className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest ${
                  activityEntries[0].type === "merge"
                    ? "bg-emerald-500/20 text-emerald-300"
                    : activityEntries[0].type === "branch"
                      ? "bg-violet-500/20 text-violet-300"
                      : "bg-slate-700 text-slate-400"
                }`}
              >
                {activityEntries[0].type}
              </span>
              <p className="truncate text-xs text-slate-400">
                {activityEntries[0].message}
              </p>
            </>
          ) : (
            <p className="text-xs text-slate-500">No recent activity</p>
          )}
        </footer>
      </div>
    </>
  );
}
