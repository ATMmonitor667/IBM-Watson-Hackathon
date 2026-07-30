"use client";

import type { Character } from "@/types/character";
import { AppImage } from "@/components/ui/AppImage";
import { ImageIcon, Lock, Sparkles } from "lucide-react";

interface CharacterCardProps {
  character: Character;
  isSelected: boolean;
  onSelect: () => void;
}

export function CharacterCard({ character, isSelected, onSelect }: CharacterCardProps) {
  const lockedVersion =
    character.versions.find((v) => v.id === character.lockedVersionId) ?? character.versions[0];
  const hasRefinedVersion = character.versions.some((v) => v.source === "ai-refined");

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      className={`group relative flex w-56 shrink-0 flex-col overflow-hidden rounded-xl border bg-slate-900 text-left shadow-md transition-all hover:border-violet-500/60 hover:shadow-violet-900/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400 ${
        isSelected ? "border-violet-500" : "border-white/10"
      }`}
    >
      {/* Reference image */}
      <div className="relative h-32 w-full overflow-hidden bg-slate-800">
        {lockedVersion?.imageUrl ? (
          <AppImage
            src={lockedVersion.imageUrl}
            alt={`Reference image for ${character.name}`}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-slate-600">
            <ImageIcon className="size-8" aria-hidden="true" />
            <span className="text-xs">No image</span>
          </div>
        )}

        {/* Locked badge */}
        {character.lockedVersionId && (
          <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-emerald-500/90 px-2 py-0.5 text-[10px] font-semibold text-slate-900 backdrop-blur-sm">
            <Lock className="size-3" aria-hidden="true" />
            Locked
          </span>
        )}

        {/* Has AI-refined version badge */}
        {hasRefinedVersion && (
          <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-violet-500/90 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
            <Sparkles className="size-3" aria-hidden="true" />
            Refined
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <h3 className="truncate text-sm font-semibold text-white">{character.name}</h3>
        <p className="truncate text-[11px] font-medium uppercase tracking-widest text-slate-500">
          {character.role}
        </p>
        <p className="line-clamp-2 text-xs leading-relaxed text-slate-400">
          {character.description}
        </p>
        <p className="mt-auto truncate pt-1 text-[10px] text-slate-500">
          {character.versions.length} version{character.versions.length !== 1 ? "s" : ""}
        </p>
      </div>
    </button>
  );
}
