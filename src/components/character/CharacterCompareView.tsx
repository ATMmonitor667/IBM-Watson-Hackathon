"use client";

import { useState } from "react";
import { ImageIcon, Loader2, Lock, LockOpen, Sparkles } from "lucide-react";

import { useCharacterStore } from "@/store/characterStore";
import type { Character, CharacterVersion } from "@/types/character";

interface CharacterCompareViewProps {
  character: Character;
}

function VersionPane({
  version,
  isLocked,
  isEmpty,
}: {
  version?: CharacterVersion;
  isLocked: boolean;
  isEmpty?: boolean;
}) {
  return (
    <div
      className={`flex flex-1 flex-col overflow-hidden rounded-lg border ${
        isLocked ? "border-emerald-500/50" : "border-white/10"
      } bg-slate-800`}
    >
      <div className="relative h-40 w-full bg-slate-900">
        {version?.imageUrl ? (
          <img
            src={version.imageUrl}
            alt={version.source === "ai-refined" ? "AI-refined reference" : "Original reference"}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-slate-600">
            <ImageIcon className="size-7" aria-hidden="true" />
            <span className="text-xs">{isEmpty ? "Not generated yet" : "No image"}</span>
          </div>
        )}
        {isLocked && (
          <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-emerald-500/90 px-2 py-0.5 text-[10px] font-semibold text-slate-900">
            <Lock className="size-3" aria-hidden="true" />
            Locked
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <span
          className={`w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${
            version?.source === "ai-refined"
              ? "bg-violet-500/20 text-violet-300"
              : "bg-slate-700 text-slate-300"
          }`}
        >
          {version?.source === "ai-refined" ? "AI Refined" : "Original"}
        </span>
        {version ? (
          <>
            <p className="text-xs leading-relaxed text-slate-300">{version.description}</p>
            <div className="flex flex-wrap gap-1 pt-1">
              {version.visualTraits.map((trait) => (
                <span
                  key={trait}
                  className="rounded-full border border-white/10 bg-slate-900 px-2 py-0.5 text-[10px] text-slate-400"
                >
                  {trait}
                </span>
              ))}
            </div>
          </>
        ) : (
          <p className="text-xs text-slate-500">
            Run AI refinement to generate a consistency-checked version.
          </p>
        )}
      </div>
    </div>
  );
}

export function CharacterCompareView({ character }: CharacterCompareViewProps) {
  const refineCharacter = useCharacterStore((s) => s.refineCharacter);
  const lockCharacter = useCharacterStore((s) => s.lockCharacter);
  const refiningId = useCharacterStore((s) => s.refiningId);
  const [lockingId, setLockingId] = useState<string | null>(null);

  const originalVersion = character.versions.find((v) => v.source === "original");
  const refinedVersion = [...character.versions].reverse().find((v) => v.source === "ai-refined");
  const isRefining = refiningId === character.id;

  async function handleLock(versionId: string) {
    setLockingId(versionId);
    await lockCharacter(character.id, versionId);
    setLockingId(null);

    const { toast } = await import("sonner");
    toast.success(`${character.name}'s reference is locked for this project`);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">{character.name}</h3>
          <p className="text-xs text-slate-500">{character.role}</p>
        </div>
        <button
          type="button"
          onClick={() => refineCharacter(character.id)}
          disabled={isRefining}
          className="inline-flex items-center gap-2 rounded-lg border border-violet-500/40 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-300 transition hover:bg-violet-500/20 disabled:opacity-60"
        >
          {isRefining ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Sparkles className="size-3.5" />
          )}
          {isRefining ? "Refining…" : "Run AI Refinement"}
        </button>
      </div>

      {/* Side-by-side comparison */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <VersionPane
          version={originalVersion}
          isLocked={character.lockedVersionId === originalVersion?.id}
        />
        <VersionPane
          version={refinedVersion}
          isLocked={character.lockedVersionId === refinedVersion?.id}
          isEmpty={!refinedVersion}
        />
      </div>

      {/* Lock actions */}
      <div className="flex flex-col gap-2 border-t border-white/10 pt-3 sm:flex-row">
        <button
          type="button"
          disabled={!originalVersion || lockingId !== null}
          onClick={() => originalVersion && handleLock(originalVersion.id)}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-white/20 hover:text-white disabled:opacity-50"
        >
          {lockingId === originalVersion?.id ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : character.lockedVersionId === originalVersion?.id ? (
            <Lock className="size-3.5" />
          ) : (
            <LockOpen className="size-3.5" />
          )}
          Lock Original
        </button>
        <button
          type="button"
          disabled={!refinedVersion || lockingId !== null}
          onClick={() => refinedVersion && handleLock(refinedVersion.id)}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-violet-500 disabled:opacity-50 disabled:bg-slate-700"
        >
          {lockingId === refinedVersion?.id ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : character.lockedVersionId === refinedVersion?.id ? (
            <Lock className="size-3.5" />
          ) : (
            <LockOpen className="size-3.5" />
          )}
          Lock Refined
        </button>
      </div>
      <p className="text-[10px] text-slate-500">
        Locking sets the canon reference used everywhere this character appears. You can
        re-lock a different version any time before final merge.
      </p>
    </div>
  );
}
