"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { SceneReviewStatus } from "@/types/workspace";

// ---------------------------------------------------------------------------
// Shared status badge colours (same tokens as SceneCard)
// ---------------------------------------------------------------------------
const STATUS_STYLES: Record<SceneReviewStatus, string> = {
  Draft:          "bg-slate-700 text-slate-300",
  "Under Review": "bg-amber-500/20 text-amber-300",
  Approved:       "bg-emerald-500/20 text-emerald-300",
  Merged:         "bg-violet-500/20 text-violet-300",
};

// ---------------------------------------------------------------------------
// Shared data shape passed to every node
// ---------------------------------------------------------------------------
export interface BranchNodeData {
  label: string;
  sceneNumber: number;
  reviewStatus: SceneReviewStatus;
  isSelected: boolean;
  [key: string]: unknown; // satisfies React Flow's NodeProps constraint
}

// ---------------------------------------------------------------------------
// Canon node — solid blue border
// ---------------------------------------------------------------------------
export const CanonNode = memo(function CanonNode({ data }: NodeProps) {
  const d = data as BranchNodeData;
  return (
    <div
      className={`flex min-w-[140px] flex-col gap-1 rounded-lg border-2 px-3 py-2 text-center transition-shadow ${
        d.isSelected
          ? "border-blue-300 shadow-lg shadow-blue-500/30"
          : "border-blue-500"
      } bg-[#1e3a5f]`}
    >
      <Handle type="target" position={Position.Top} className="!bg-blue-400" />

      <span className="text-[10px] font-semibold uppercase tracking-widest text-blue-300">
        Canon · #{d.sceneNumber}
      </span>
      <span className="text-xs font-semibold leading-snug text-blue-100">
        {d.label}
      </span>
      <span className={`mx-auto mt-0.5 rounded-full px-2 py-0.5 text-[9px] font-semibold ${STATUS_STYLES[d.reviewStatus]}`}>
        {d.reviewStatus}
      </span>

      <Handle type="source" position={Position.Bottom} className="!bg-blue-400" />
    </div>
  );
});

// ---------------------------------------------------------------------------
// Alternate node — dashed violet border
// ---------------------------------------------------------------------------
export const AlternateNode = memo(function AlternateNode({ data }: NodeProps) {
  const d = data as BranchNodeData;
  return (
    <div
      className={`flex min-w-[140px] flex-col gap-1 rounded-lg border-2 border-dashed px-3 py-2 text-center transition-shadow ${
        d.isSelected
          ? "border-violet-300 shadow-lg shadow-violet-500/30"
          : "border-violet-600"
      } bg-[#1e1040]`}
      style={{ opacity: d.isSelected ? 1 : 0.88 }}
    >
      <Handle type="target" position={Position.Top} className="!bg-violet-400" />

      <span className="text-[10px] font-semibold uppercase tracking-widest text-violet-400">
        Alt · #{d.sceneNumber}
      </span>
      <span className="text-xs font-semibold leading-snug text-violet-200">
        {d.label}
      </span>
      <span className={`mx-auto mt-0.5 rounded-full px-2 py-0.5 text-[9px] font-semibold ${STATUS_STYLES[d.reviewStatus]}`}>
        {d.reviewStatus}
      </span>

      <Handle type="source" position={Position.Bottom} className="!bg-violet-400" />
    </div>
  );
});
