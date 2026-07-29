"use client";

import type { Scene } from "@/types/workspace";
import { SceneCard } from "@/components/workspace/SceneCard";
import { SkeletonBlock } from "@/components/workspace/LoadingSkeletons";
import { EmptySceneCanvas } from "@/components/workspace/StateViews";
import { Plus, ArrowRight } from "lucide-react";

// ---------------------------------------------------------------------------
// Skeleton row shown while scenes are loading
// ---------------------------------------------------------------------------
function SceneCardSkeleton() {
  return (
    <div className="flex w-56 shrink-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-slate-900">
      <SkeletonBlock className="h-32 w-full rounded-none" />
      <div className="flex flex-col gap-2 p-3">
        <SkeletonBlock className="h-3 w-20" />
        <SkeletonBlock className="h-3 w-full" />
        <SkeletonBlock className="h-3 w-3/4" />
        <SkeletonBlock className="mt-1 h-3 w-1/2" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Connection arrow between cards
// ---------------------------------------------------------------------------
function ConnectorArrow() {
  return (
    <div className="flex shrink-0 items-center self-center px-1 text-slate-600" aria-hidden="true">
      <ArrowRight className="size-4" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// SceneCanvas
// ---------------------------------------------------------------------------
interface SceneCanvasProps {
  scenes: Scene[];
  isLoading?: boolean;
  projectTitle?: string;
  onAddScene?: () => void;
}

export function SceneCanvas({
  scenes,
  isLoading = false,
  projectTitle,
  onAddScene,
}: SceneCanvasProps) {
  // Loading state — show 3 skeleton cards
  if (isLoading) {
    return (
      <div className="flex h-full items-start gap-0 overflow-x-auto px-6 py-6">
        {[1, 2, 3].map((i, idx) => (
          <div key={i} className="flex items-center">
            <SceneCardSkeleton />
            {idx < 2 && <ConnectorArrow />}
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (scenes.length === 0) {
    return (
      <EmptySceneCanvas projectTitle={projectTitle} onCreateScene={onAddScene} />
    );
  }

  return (
    <div
      className="flex h-full items-start overflow-x-auto px-6 py-6"
      role="list"
      aria-label="Scene canvas"
    >
      {scenes.map((scene, idx) => (
        <div key={scene.id} className="flex items-center" role="listitem">
          <SceneCard scene={scene} />
          {/* Arrow connector between every pair of cards */}
          {idx < scenes.length - 1 && <ConnectorArrow />}
        </div>
      ))}

      {/* Add scene button after last card */}
      <div className="flex items-center self-start pt-0">
        <ConnectorArrow />
        <button
          type="button"
          onClick={onAddScene}
          aria-label="Add new scene"
          className="flex h-32 w-14 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-white/20 bg-slate-900/50 text-slate-500 transition hover:border-violet-500/60 hover:text-violet-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
        >
          <Plus className="size-5" />
        </button>
      </div>
    </div>
  );
}
