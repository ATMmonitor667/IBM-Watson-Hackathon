"use client";

import { useEffect, useMemo, useState } from "react";
import { GitBranch, ScanSearch } from "lucide-react";
import { Toaster } from "sonner";

import { useReviewStore } from "@/store/reviewStore";
import { BranchDiffView } from "@/components/review/BranchDiffView";
import { ContinuityReviewPanel } from "@/components/review/ContinuityReviewPanel";
import { MergeSelectionPanel } from "@/components/review/MergeSelectionPanel";
import { DEMO_BRANCHES } from "@/lib/mock/demoBranches";
import { DEMO_SCENES } from "@/lib/mock/demoScenes";
import type { Branch } from "@/types/workspace";

interface ReviewStudioProps {
  projectId: string;
}

export function ReviewStudio({ projectId }: ReviewStudioProps) {
  // NOTE: branches/scenes are read from the same mock data ProjectPageClient
  // uses. Once Rahat's branch API is live, this should read from a shared
  // branch store instead of importing mock data directly.
  const branches: Branch[] = projectId === "demo-1" ? DEMO_BRANCHES : [];
  const altBranches = branches.filter((b) => !b.isCanon);

  const [selectedBranchId, setSelectedBranchId] = useState<string | undefined>(
    altBranches[0]?.id,
  );

  const { review, isLoading, runContinuityReview, reset } = useReviewStore();

  useEffect(() => {
    if (selectedBranchId) {
      reset();
      runContinuityReview(selectedBranchId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranchId]);

  const selectedBranch = altBranches.find((b) => b.id === selectedBranchId);
  const sourceScene = selectedBranch
    ? DEMO_SCENES.find((s) => s.id === selectedBranch.sourceSceneId)
    : undefined;

  const sceneTitleById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const scene of [...DEMO_SCENES, ...altBranches.flatMap((b) => b.scenes)]) {
      map[scene.id] = `#${scene.sceneNumber} — ${scene.title}`;
    }
    return map;
  }, [altBranches]);

  return (
    <div className="flex h-full flex-col">
      <Toaster position="bottom-right" richColors />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <div className="flex items-center gap-2">
          <ScanSearch className="size-4 text-violet-400" aria-hidden="true" />
          <h1 className="text-sm font-semibold uppercase tracking-widest text-slate-300">
            Review &amp; Merge
          </h1>
        </div>

        {/* Branch picker */}
        {altBranches.length > 0 && (
          <div className="flex items-center gap-2">
            <GitBranch className="size-3.5 text-slate-500" aria-hidden="true" />
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="rounded-lg border border-white/10 bg-slate-800 px-2 py-1.5 text-xs text-white outline-none focus:ring-2 focus:ring-violet-500"
            >
              {altBranches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {altBranches.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-sm text-slate-500">
          No alternate branches to review yet. Create a branch from a scene first.
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6 lg:flex-row lg:gap-8 lg:overflow-hidden">
          {/* Left: diff + findings */}
          <section className="flex flex-1 flex-col gap-6 lg:overflow-y-auto lg:pr-2">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
                Visual diff
              </p>
              {selectedBranch && (
                <BranchDiffView sourceScene={sourceScene} branchScenes={selectedBranch.scenes} />
              )}
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
                AI continuity findings
              </p>
              {isLoading ? (
                <div className="flex flex-col gap-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-24 animate-pulse rounded-lg bg-slate-800" />
                  ))}
                </div>
              ) : (
                <ContinuityReviewPanel
                  findings={review?.findings ?? []}
                  sceneTitleById={sceneTitleById}
                />
              )}
            </div>
          </section>

          {/* Right: merge selection */}
          <section className="flex w-full flex-col lg:w-[360px] lg:shrink-0 lg:overflow-y-auto">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
              Selective merge
            </p>
            {isLoading ? (
              <div className="h-64 animate-pulse rounded-lg bg-slate-800" />
            ) : review && selectedBranch ? (
              <MergeSelectionPanel
                strategies={review.strategies}
                branchScenes={selectedBranch.scenes}
              />
            ) : (
              <p className="text-xs text-slate-500">
                No AI review available for this branch yet.
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
