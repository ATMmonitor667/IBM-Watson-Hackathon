"use client";

import type { Scene, SceneReviewStatus } from "@/types/workspace";
import { useSceneStore } from "@/store/sceneStore";
import { ImageIcon } from "lucide-react";

// ---------------------------------------------------------------------------
// Review-status badge colours
// ---------------------------------------------------------------------------
const REVIEW_STATUS_STYLES: Record<SceneReviewStatus, string> = {
  Draft:          "bg-slate-700 text-slate-300",
  "Under Review": "bg-amber-500/20 text-amber-300",
  Approved:       "bg-emerald-500/20 text-emerald-300",
  Merged:         "bg-violet-500/20 text-violet-300",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
interface SceneCardProps {
  scene: Scene;
}

export function SceneCard({ scene }: SceneCardProps) {
  const selectNode = useSceneStore((s) => s.selectNode);

  function handleSelect() {
    selectNode(scene.id);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      selectNode(scene.id);
    }
  }

  const avatarInitial = scene.contributor.displayName.charAt(0).toUpperCase();

  return (
    <button
      type="button"
      onClick={handleSelect}
      onKeyDown={handleKeyDown}
      aria-label={`Scene ${scene.sceneNumber}: ${scene.title}`}
      className="group relative flex w-56 shrink-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-slate-900 text-left shadow-md transition-all hover:border-violet-500/60 hover:shadow-violet-900/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
    >
      {/* Panel image */}
      <div className="relative h-32 w-full overflow-hidden bg-slate-800">
        {scene.imageUrl ? (
          <img
            src={scene.imageUrl}
            alt={`Panel image for scene ${scene.sceneNumber}: ${scene.title}`}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-slate-600">
            <ImageIcon className="size-8" aria-hidden="true" />
            <span className="text-xs">No image</span>
          </div>
        )}

        {/* Scene number badge */}
        <span className="absolute left-2 top-2 flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-slate-900/80 px-1.5 text-[11px] font-bold text-slate-300 backdrop-blur-sm">
          #{scene.sceneNumber}
        </span>

        {/* Emotional beat badge */}
        <span className="absolute bottom-2 right-2 rounded-full bg-slate-900/70 px-2 py-0.5 text-[10px] font-medium text-violet-300 backdrop-blur-sm">
          {scene.emotionalBeat}
        </span>
      </div>

      {/* Card body */}
      <div className="flex flex-1 flex-col gap-2 p-3">
        {/* Location */}
        <p className="truncate text-[11px] font-medium uppercase tracking-widest text-slate-500">
          {scene.location}
        </p>

        {/* Dialogue excerpt — clamped to 2 lines */}
        <p className="line-clamp-2 text-xs leading-relaxed text-slate-300">
          {scene.dialogueExcerpt}
        </p>

        {/* Characters */}
        <p className="truncate text-[11px] text-slate-500">
          {scene.characters.join(", ")}
        </p>

        {/* Footer row */}
        <div className="mt-auto flex items-center justify-between pt-1">
          {/* Review-status badge */}
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${REVIEW_STATUS_STYLES[scene.reviewStatus]}`}
          >
            {scene.reviewStatus}
          </span>

          {/* Revision */}
          <span className="text-[10px] text-slate-500">Rev {scene.revision}</span>
        </div>

        {/* Contributor */}
        <div className="flex items-center gap-1.5 border-t border-white/10 pt-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-700 text-[10px] font-bold text-white">
            {avatarInitial}
          </span>
          <span className="truncate text-[11px] text-slate-400">
            {scene.contributor.displayName}
          </span>
        </div>
      </div>
    </button>
  );
}
