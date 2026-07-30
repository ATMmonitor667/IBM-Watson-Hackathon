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
import { useSceneStore } from "@/store/sceneStore";
import { useActivityStore } from "@/store/activityStore";
import { DEMO_SCENES } from "@/lib/mock/demoScenes";
import { DEMO_BRANCHES } from "@/lib/mock/demoBranches";
import {
  continuityFlagsFor,
  withComputedFlags,
} from "@/lib/ai/continuityRules";
import type { Branch, Scene, SceneReviewStatus } from "@/types/workspace";

interface ProjectPageClientProps {
  id: string;
}

// Reduced-motion flag (evaluated once)
const prefersReduced =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function ProjectPageClient({ id }: ProjectPageClientProps) {
  const { loadProjects, getProject, isLoading, error } = useProjectStore();
  const [retryKey, setRetryKey] = useState(0);

  // Branch + scene state — seeded from mock, mutated on branch create / merge
  const [branches, setBranches] = useState<Branch[]>(
    id === "demo-1" ? DEMO_BRANCHES : [],
  );
  const [scenes, setScenes] = useState<Scene[]>(
    id === "demo-1" ? DEMO_SCENES : [],
  );
  // Whether a "re-fetch" is in progress after merge
  const [isRefreshing, setIsRefreshing] = useState(false);

  const openPanelId   = useUiStore((s) => s.openPanelId);
  const clearSelection = useSceneStore((s) => s.clearSelection);
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

  /**
   * Step 29 — Refresh after merge
   * 1. Mark all scenes in the merged branch as "Merged"
   * 2. Update the branch to isCanon = true
   * 3. Clear selectedSceneId if it no longer has a live node
   * 4. Simulate a re-fetch (shows loading indicator)
   * 5. Add an activity entry
   */
  const handleMergeBranch = useCallback(
    async (branchId: string) => {
      const branch = branches.find((b) => b.id === branchId);
      if (!branch) return;

      setIsRefreshing(true);

      // Simulate network re-fetch delay
      await new Promise((r) => setTimeout(r, prefersReduced ? 0 : 600));

      // Mark every scene in the merged branch as "Merged"
      const mergedSceneIds = new Set(branch.scenes.map((s) => s.id));

      setScenes((prev) =>
        prev.map((sc) =>
          mergedSceneIds.has(sc.id)
            ? { ...sc, reviewStatus: "Merged" as SceneReviewStatus }
            : sc,
        ),
      );

      setBranches((prev) =>
        prev.map((b) =>
          b.id === branchId
            ? {
                ...b,
                isCanon: true,
                updatedAt: new Date().toISOString(),
                scenes: b.scenes.map((sc) => ({
                  ...sc,
                  reviewStatus: "Merged" as SceneReviewStatus,
                })),
              }
            : b,
        ),
      );

      // Clear stale selection if the selected scene was inside the merged branch
      clearSelection();

      addActivity({
        message: `Branch "${branch.name}" merged into canon`,
        type: "merge",
      });

      setIsRefreshing(false);

      // Sonner toast
      const { toast } = await import("sonner");
      toast.success(`Branch "${branch.name}" merged`, {
        description: `${branch.scenes.length} scene(s) marked as Merged.`,
      });
    },
    [branches, clearSelection, addActivity],
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

  if (isLoading) return <WorkspacePageSkeleton />;

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <ErrorState message={error} onRetry={() => setRetryKey((k) => k + 1)} />
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
