"use client";

import { useState } from "react";
import {
  Check,
  ImageIcon,
  Loader2,
  Lock,
  LockOpen,
  Sparkles,
  X,
} from "lucide-react";

import { AiDisclaimer } from "@/components/ai/AiDisclaimer";
import { AppImage } from "@/components/ui/AppImage";
import {
  CharacterRefinementResponseSchema,
  type CharacterRefinementResponse,
} from "@/lib/ai/schemas";
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
          <AppImage
            src={version.imageUrl}
            alt={
              version.source === "ai-refined"
                ? "AI-refined reference"
                : "Original reference"
            }
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-slate-600">
            <ImageIcon className="size-7" aria-hidden="true" />
            <span className="text-xs">
              {isEmpty ? "Not generated yet" : "No image"}
            </span>
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
            <p className="text-xs leading-relaxed text-slate-300">
              {version.description}
            </p>
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
            Generate and approve an AI proposal to create a refined version.
          </p>
        )}
      </div>
    </div>
  );
}

export function CharacterCompareView({
  character,
}: CharacterCompareViewProps) {
  const approveRefinement = useCharacterStore(
    (state) => state.approveRefinement,
  );
  const lockCharacter = useCharacterStore((state) => state.lockCharacter);
  const [lockingId, setLockingId] = useState<string | null>(null);
  const [refinementPrompt, setRefinementPrompt] = useState("");
  const [proposal, setProposal] =
    useState<CharacterRefinementResponse | null>(null);
  const [isRefining, setIsRefining] = useState(false);
  const [refinementError, setRefinementError] = useState<string | null>(null);

  const originalVersion = character.versions.find(
    (version) => version.source === "original",
  );
  const refinedVersion = [...character.versions]
    .reverse()
    .find((version) => version.source === "ai-refined");
  const lockedVersion = character.versions.find(
    (version) => version.id === character.lockedVersionId,
  );

  async function handleRefine(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const prompt = refinementPrompt.trim();
    if (prompt.length < 3) return;

    setIsRefining(true);
    setRefinementError(null);
    setProposal(null);

    try {
      const response = await fetch("/api/ai/character-refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: character.projectId,
          branchName: "canon",
          canonFacts: [],
          branchFacts: [],
          sceneHistory: [],
          characterSummary: [
            lockedVersion?.description ?? character.description,
            lockedVersion?.visualTraits.length
              ? `Locked visual traits: ${lockedVersion.visualTraits.join(", ")}.`
              : "",
          ]
            .filter(Boolean)
            .join(" "),
          characterId: character.id,
          refinementPrompt: prompt,
        }),
      });
      const payload: unknown = await response.json();

      if (!response.ok) {
        const message =
          typeof payload === "object" &&
          payload !== null &&
          "error" in payload &&
          typeof payload.error === "string"
            ? payload.error
            : "Character refinement failed";
        throw new Error(message);
      }

      const parsed = CharacterRefinementResponseSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error("Character refinement returned an invalid proposal");
      }
      if (parsed.data.characterId !== character.id) {
        throw new Error(
          "Character refinement returned a proposal for another character",
        );
      }

      setProposal(parsed.data);
    } catch (error) {
      setRefinementError(
        error instanceof Error ? error.message : "Character refinement failed",
      );
    } finally {
      setIsRefining(false);
    }
  }

  async function handleApprove() {
    if (!proposal) return;
    const version = approveRefinement(character.id, proposal);
    if (!version) {
      setRefinementError("The proposal could not be applied to this character");
      return;
    }

    setProposal(null);
    setRefinementPrompt("");
    const { toast } = await import("sonner");
    toast.success(`Refinement approved for ${character.name}`, {
      description:
        "A new character version was created. The canon lock is unchanged.",
    });
  }

  function handleReject() {
    setProposal(null);
    setRefinementError(null);
  }

  async function handleLock(versionId: string) {
    setLockingId(versionId);
    await lockCharacter(character.id, versionId);
    setLockingId(null);

    const { toast } = await import("sonner");
    toast.success(`${character.name}'s reference is locked for this project`);
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-base font-semibold text-white">{character.name}</h3>
        <p className="text-xs text-slate-500">{character.role}</p>
      </div>

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

      <form
        onSubmit={handleRefine}
        className="flex flex-col gap-3 rounded-lg border border-violet-500/20 bg-violet-500/5 p-4"
      >
        <div>
          <label
            htmlFor={`refinement-prompt-${character.id}`}
            className="text-xs font-semibold uppercase tracking-widest text-violet-300"
          >
            Refinement direction
          </label>
          <p className="mt-1 text-xs text-slate-400">
            Describe the visual or narrative change you want. Locked traits
            remain constraints.
          </p>
        </div>
        <textarea
          id={`refinement-prompt-${character.id}`}
          value={refinementPrompt}
          onChange={(event) => setRefinementPrompt(event.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="Example: Show the cost of losing the compass while preserving Kael's pressure suit and scar."
          className="w-full resize-y rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-violet-500"
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] text-slate-500">
            {refinementPrompt.length}/1000
          </span>
          <button
            type="submit"
            disabled={isRefining || refinementPrompt.trim().length < 3}
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isRefining ? (
              <Loader2
                className="size-3.5 animate-spin"
                aria-hidden="true"
              />
            ) : (
              <Sparkles className="size-3.5" aria-hidden="true" />
            )}
            {isRefining ? "Generating proposal…" : "Generate proposal"}
          </button>
        </div>
        {refinementError && (
          <p role="alert" className="text-xs text-red-300">
            {refinementError}
          </p>
        )}
      </form>

      {proposal && (
        <section
          aria-label="AI refinement proposal"
          className="flex flex-col gap-4 rounded-lg border border-violet-500/40 bg-slate-800 p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-white">
              Refinement proposal
            </h4>
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-amber-300">
              Not applied
            </span>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Proposed description
            </p>
            <p className="mt-1 text-sm leading-relaxed text-slate-200">
              {proposal.proposedDescription}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Generation instruction
            </p>
            <p className="mt-1 rounded-md border border-white/10 bg-slate-900 p-3 text-xs leading-relaxed text-slate-300">
              {proposal.proposedGenerationInstruction}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Why the AI changed it
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              {proposal.changeRationale}
            </p>
          </div>
          <AiDisclaimer feature="characterRefine" />
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={handleReject}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-red-400/40 hover:text-red-300"
            >
              <X className="size-3.5" aria-hidden="true" />
              Reject proposal
            </button>
            <button
              type="button"
              onClick={handleApprove}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-emerald-500"
            >
              <Check className="size-3.5" aria-hidden="true" />
              Approve proposal
            </button>
          </div>
        </section>
      )}

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
        Locking sets the canon reference used everywhere this character appears.
        You can re-lock a different version any time before final merge.
      </p>
    </div>
  );
}
