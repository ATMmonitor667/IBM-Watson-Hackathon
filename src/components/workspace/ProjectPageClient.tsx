"use client";

import { useCallback, useEffect, useState } from "react";
import { Toaster } from "sonner";

import { BranchTree } from "@/components/workspace/BranchTree";
import { ProjectHeader } from "@/components/workspace/ProjectHeader";
import { WorkspacePageSkeleton } from "@/components/workspace/LoadingSkeletons";
import { ErrorState } from "@/components/workspace/StateViews";
import { SceneCanvas } from "@/components/workspace/SceneCanvas";
import { SceneDetailPanel, CreateBranchPanel } from "@/components/workspace/BranchPanels";
import { useProjectStore } from "@/store/projectStore";
import { useUiStore } from "@/store/uiStore";
import { DEMO_SCENES } from "@/lib/mock/demoScenes";
import { DEMO_BRANCHES } from "@/lib/mock/demoBranches";
import type { Branch } from "@/types/workspace";

interface ProjectPageClientProps {
  id: string;
}

export function ProjectPageClient({ id }: ProjectPageClientProps) {
  const { loadProjects, getProject, isLoading, error } = useProjectStore();
  const [retryKey, setRetryKey] = useState(0);

  // Branch state — seeded from mock, updated on new branch creation
  const [branches, setBranches] = useState<Branch[]>(
    id === "demo-1" ? DEMO_BRANCHES : [],
  );

  const openPanelId = useUiStore((s) => s.openPanelId);

  const handleBranchCreated = useCallback((branch: Branch) => {
    setBranches((prev) => [...prev, branch]);
  }, []);

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

  const scenes = id === "demo-1" ? DEMO_SCENES : [];

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

        {/* Three-region workspace layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: scene canvas area */}
          <section
            className="flex flex-1 overflow-hidden border-r border-white/10 bg-slate-950"
            aria-label="Scene canvas"
          >
            <SceneCanvas
              scenes={scenes}
              isLoading={false}
              projectTitle={project.title}
              onAddScene={() => alert("Scene creation — coming soon")}
            />
          </section>

          {/* Right: branch tree area — position:relative so panels anchor here */}
          <section
            className="relative flex w-[420px] shrink-0 flex-col overflow-hidden bg-slate-900"
            aria-label="Branch tree"
          >
            <div className="border-b border-white/10 px-4 py-2">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Branch Tree
              </h2>
            </div>
            <div className="flex-1 overflow-hidden" style={{ height: "100%" }}>
              <BranchTree branches={branches} />
            </div>

            {/* Detail / create-branch panels — slide in over the branch tree */}
            {openPanelId === "scene-detail" && (
              <SceneDetailPanel scenes={scenes} />
            )}
            {openPanelId === "create-branch" && (
              <CreateBranchPanel
                scenes={scenes}
                onBranchCreated={handleBranchCreated}
              />
            )}
          </section>
        </div>

        {/* Bottom: activity feed placeholder */}
        <footer
          className="flex h-10 shrink-0 items-center border-t border-white/10 bg-slate-900 px-5"
          aria-label="Activity feed"
        >
          <p className="text-xs text-slate-500">Activity feed — coming Day 2</p>
        </footer>
      </div>
    </>
  );
}
