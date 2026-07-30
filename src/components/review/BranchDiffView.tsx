"use client";

import { ArrowRight, ImageIcon } from "lucide-react";
import { AppImage } from "@/components/ui/AppImage";
import type { Scene } from "@/types/workspace";

interface BranchDiffViewProps {
  /** Canon scene the branch diverges from (may be undefined if branching from root) */
  sourceScene?: Scene;
  branchScenes: Scene[];
}

function ScenePane({ scene, label }: { scene?: Scene; label: string }) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-white/10 bg-slate-800">
      <div className="relative h-28 w-full bg-slate-900">
        {scene?.imageUrl ? (
          <AppImage
            src={scene.imageUrl}
            alt={`Panel for ${scene.title}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-slate-600">
            <ImageIcon className="size-6" aria-hidden="true" />
            <span className="text-[10px]">No image</span>
          </div>
        )}
        <span className="absolute left-2 top-2 rounded-full bg-slate-900/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-slate-300 backdrop-blur-sm">
          {label}
        </span>
      </div>
      <div className="flex flex-col gap-1 p-3">
        {scene ? (
          <>
            <p className="truncate text-sm font-medium text-white">{scene.title}</p>
            <p className="truncate text-[11px] text-slate-500">{scene.location}</p>
            <p className="line-clamp-2 text-xs leading-relaxed text-slate-400">
              {scene.dialogueExcerpt}
            </p>
          </>
        ) : (
          <p className="text-xs text-slate-500">Branch starts from project root — no prior scene.</p>
        )}
      </div>
    </div>
  );
}

export function BranchDiffView({ sourceScene, branchScenes }: BranchDiffViewProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <ScenePane scene={sourceScene} label="Canon" />
        <ArrowRight className="size-4 shrink-0 text-slate-600" aria-hidden="true" />
        <div className="flex flex-1 flex-col gap-3">
          {branchScenes.map((scene) => (
            <ScenePane key={scene.id} scene={scene} label={`Branch #${scene.sceneNumber}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
