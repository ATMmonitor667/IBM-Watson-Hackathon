"use client";

import { useState } from "react";
import { AlertTriangle, GitBranch, GitMerge, ScanSearch } from "lucide-react";
import { Toaster } from "sonner";

import { BranchDiffView } from "@/components/review/BranchDiffView";
import { MergePreviewPanel } from "@/components/workspace/BranchPanels";
import { useUiStore } from "@/store/uiStore";
import type { Branch } from "@/types/workspace";

interface ReviewStudioProps {
  projectId: string;
  /**
   * Real branches for this project, already carrying computed
   * `continuityFlag` values (see ProjectPageClient's `branchesWithFindings`).
   * This is the same data the Story workspace tab renders — Canon Review is
   * a focused second view of it, not a separate dataset.
   */
  branches: Branch[];
  onMergeBranch: (branchId: string, selectedSceneIds: string[]) => Promise<void>;
}

export function ReviewStudio({ branches, onMergeBranch }: ReviewStudioProps) {
  const altBranches = branches.filter((b) => !b.isCanon);
  const canonBranch = branches.find((b) => b.isCanon);

  const [selectedBranchId, setSelectedBranchId] = useState<string | undefined>(
    altBranches[0]?.id,
  );

  const openPanelId = useUiStore((s) => s.openPanelId);
  const openMergePreview = useUiStore((s) => s.openMergePreview);

  const selectedBranch = altBranches.find((b) => b.id === selectedBranchId);

  const flaggedScenes = selectedBranch
    ? selectedBranch.scenes.filter((s) => s.continuityFlag)
    : [];

  return (
    <div className="relative flex h-full flex-col">
      <Toaster position="bottom-right" richColors />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <div className="flex items-center gap-2">
          <ScanSearch className="size-4 text-violet-400" aria-hidden="true" />
          <h1 className="text-sm font-semibold uppercase tracking-widest text-slate-300">
            Canon Review
          </h1>
        </div>

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
          No what-if branches to review yet. Create a branch from a scene first.
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
          {/* Computed continuity flags for this branch — same engine, same
              data as the flags shown on each scene card in Story workspace. */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
              Continuity flags on this branch
            </p>
            {flaggedScenes.length === 0 ? (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
                No continuity issues found on this branch.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {flaggedScenes.map((scene) => (
                  <div
                    key={scene.id}
                    className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3"
                  >
                    <AlertTriangle
                      className="mt-0.5 size-4 shrink-0 text-amber-400"
                      aria-hidden="true"
                    />
                    <div>
                      <p className="text-xs font-medium text-amber-200">
                        #{scene.sceneNumber} — {scene.title}
                      </p>
                      <p className="mt-0.5 text-xs text-amber-300/90">{scene.continuityFlag}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Visual diff against canon */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
              Visual diff vs. canon
            </p>
            {selectedBranch && canonBranch && (
              <BranchDiffView canonBranch={canonBranch} branch={selectedBranch} />
            )}
          </div>

          {/* Entry point into the real, persisting selective-merge flow */}
          <button
            type="button"
            onClick={() => selectedBranch && openMergePreview(selectedBranch.id)}
            disabled={!selectedBranch}
            className="inline-flex w-fit items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <GitMerge className="size-4" aria-hidden="true" />
            Review &amp; merge this branch
          </button>
        </div>
      )}

      {openPanelId === "merge-preview" && (
        <MergePreviewPanel branches={branches} onMergeBranch={onMergeBranch} />
      )}
    </div>
  );
}