"use client";

import { useState } from "react";
import { CheckCircle2, GitMerge, Loader2 } from "lucide-react";

import { useReviewStore } from "@/store/reviewStore";
import type { MergeStrategyOption } from "@/types/review";
import type { Scene } from "@/types/workspace";

interface MergeSelectionPanelProps {
  strategies: MergeStrategyOption[];
  branchScenes: Scene[];
  onMergeConfirmed?: () => void;
}

export function MergeSelectionPanel({
  strategies,
  branchScenes,
  onMergeConfirmed,
}: MergeSelectionPanelProps) {
  const { selections, toggleSelection, setAllSelections, confirmMerge, isMerging, mergeComplete } =
    useReviewStore();
  const [activeStrategyId, setActiveStrategyId] = useState(strategies[0]?.id ?? "");

  function applyStrategy(strategy: MergeStrategyOption) {
    setActiveStrategyId(strategy.id);
    setAllSelections(strategy.compatibleSceneIds, true);
  }

  function isIncluded(sceneId: string) {
    return selections.find((s) => s.sceneId === sceneId)?.include ?? false;
  }

  const includedCount = selections.filter((s) => s.include).length;

  async function handleConfirm() {
    await confirmMerge();
    onMergeConfirmed?.();
  }

  if (mergeComplete) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
        <CheckCircle2 className="size-8 text-emerald-400" aria-hidden="true" />
        <p className="text-sm font-medium text-emerald-300">
          {includedCount} scene{includedCount !== 1 ? "s" : ""} merged into canon
        </p>
        <p className="text-xs text-slate-400">
          The canon state view now reflects this merge.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Strategy picker */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
          Merge strategy
        </p>
        <div className="flex flex-col gap-2">
          {strategies.map((strategy) => (
            <button
              key={strategy.id}
              type="button"
              onClick={() => applyStrategy(strategy)}
              className={`rounded-lg border p-3 text-left transition ${
                activeStrategyId === strategy.id
                  ? "border-violet-500 bg-violet-500/10"
                  : "border-white/10 bg-slate-800 hover:border-white/20"
              }`}
            >
              <p className="text-sm font-medium text-white">{strategy.label}</p>
              <p className="mt-0.5 text-xs text-slate-400">{strategy.description}</p>
              <p className="mt-1 text-[11px] text-slate-500">{strategy.tradeoffs}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Per-scene selection */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
          Scenes to include
        </p>
        <div className="flex flex-col gap-2">
          {branchScenes.map((scene) => (
            <label
              key={scene.id}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/10 bg-slate-800 p-3 transition hover:border-white/20"
            >
              <input
                type="checkbox"
                checked={isIncluded(scene.id)}
                onChange={() => toggleSelection(scene.id)}
                className="mt-0.5 size-4 shrink-0 accent-violet-600"
              />
              <div className="min-w-0">
                <p className="truncate text-sm text-white">
                  #{scene.sceneNumber} — {scene.title}
                </p>
                <p className="truncate text-[11px] text-slate-500">{scene.location}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Confirm */}
      <button
        type="button"
        onClick={handleConfirm}
        disabled={isMerging || includedCount === 0}
        className="mt-1 inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isMerging ? <Loader2 className="size-4 animate-spin" /> : <GitMerge className="size-4" />}
        {isMerging
          ? "Merging…"
          : `Merge ${includedCount} scene${includedCount !== 1 ? "s" : ""} into canon`}
      </button>
    </div>
  );
}
