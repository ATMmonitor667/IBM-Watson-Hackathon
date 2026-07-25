"use client";

import { useEffect, useState } from "react";
import { BranchTree } from "@/components/workspace/BranchTree";
import { ProjectHeader } from "@/components/workspace/ProjectHeader";
import { WorkspacePageSkeleton } from "@/components/workspace/LoadingSkeletons";
import { EmptySceneCanvas, ErrorState } from "@/components/workspace/StateViews";
import { useProjectStore } from "@/store/projectStore";

interface ProjectPageClientProps {
  id: string;
}

export function ProjectPageClient({ id }: ProjectPageClientProps) {
  const { loadProjects, getProject, isLoading, error } = useProjectStore();
  const [retryKey, setRetryKey] = useState(0);

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

  // Project not found after loading
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

  const hasScenes = false; // TODO: replace with project.scenes.length > 0 once Rahat's data lands

  return (
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
          className="flex flex-1 overflow-auto border-r border-white/10 bg-slate-950"
          aria-label="Scene canvas"
        >
          {hasScenes ? (
            <p className="p-6 text-sm text-slate-400">Scenes go here</p>
          ) : (
            <EmptySceneCanvas
              projectTitle={project.title}
              onCreateScene={() => alert("Scene creation — coming Day 3")}
            />
          )}
        </section>

        {/* Right: branch tree area */}
        <section
          className="flex w-[420px] shrink-0 flex-col overflow-hidden bg-slate-900"
          aria-label="Branch tree"
        >
          <div className="border-b border-white/10 px-4 py-2">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Branch Tree
            </h2>
          </div>
          <div className="flex-1 overflow-hidden" style={{ height: "100%" }}>
            <BranchTree />
          </div>
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
  );
}
