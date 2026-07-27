"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { TriangleAlert } from "lucide-react";
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
  /** AI continuity finding — shows ⚠ icon when present */
  continuityFlag?: string;
  /** Branch this node belongs to — used by the detail panel for merge */
  branchId: string;
  isCanon: boolean;
  onActivate?: () => void; // keyboard + click handler injected by BranchTree
  [key: string]: unknown; // satisfies React Flow's NodeProps constraint
}

// ---------------------------------------------------------------------------
// Reduced-motion detection (evaluated once per module load in the browser)
// ---------------------------------------------------------------------------
const prefersReduced =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------------------------------------------------------------------------
// Canon node — solid blue border
// ---------------------------------------------------------------------------
export const CanonNode = memo(function CanonNode({ data }: NodeProps) {
  const d = data as BranchNodeData;

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      d.onActivate?.();
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Canon scene ${d.sceneNumber}: ${d.label}, status ${d.reviewStatus}${d.continuityFlag ? ", has continuity finding" : ""}`}
      aria-pressed={d.isSelected}
      onKeyDown={handleKeyDown}
      className={`relative flex min-w-[140px] cursor-pointer flex-col gap-1 rounded-lg border-2 px-3 py-2 text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
        prefersReduced ? "" : "transition-shadow"
      } ${
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

      {/* AI continuity warning indicator */}
      {d.continuityFlag && (
        <span
          title={d.continuityFlag}
          aria-label={`Continuity finding: ${d.continuityFlag}`}
          className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 shadow-sm"
        >
          <TriangleAlert className="size-3 text-slate-900" aria-hidden="true" />
        </span>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-blue-400" />
    </div>
  );
});

// ---------------------------------------------------------------------------
// Alternate node — dashed violet border
// ---------------------------------------------------------------------------
export const AlternateNode = memo(function AlternateNode({ data }: NodeProps) {
  const d = data as BranchNodeData;

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      d.onActivate?.();
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Alternate scene ${d.sceneNumber}: ${d.label}, status ${d.reviewStatus}${d.continuityFlag ? ", has continuity finding" : ""}`}
      aria-pressed={d.isSelected}
      onKeyDown={handleKeyDown}
      className={`relative flex min-w-[140px] cursor-pointer flex-col gap-1 rounded-lg border-2 border-dashed px-3 py-2 text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
        prefersReduced ? "" : "transition-shadow"
      } ${
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

      {/* AI continuity warning indicator */}
      {d.continuityFlag && (
        <span
          title={d.continuityFlag}
          aria-label={`Continuity finding: ${d.continuityFlag}`}
          className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 shadow-sm"
        >
          <TriangleAlert className="size-3 text-slate-900" aria-hidden="true" />
        </span>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-violet-400" />
    </div>
  );
});
