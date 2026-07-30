"use client";

import { useEffect, useState } from "react";
import { Plus, Users } from "lucide-react";
import { Toaster } from "sonner";

import { useCharacterStore } from "@/store/characterStore";
import { CharacterCard } from "@/components/character/CharacterCard";
import { CharacterCompareView } from "@/components/character/CharacterCompareView";
import { CharacterUploadForm } from "@/components/character/CharacterUploadForm";

interface CharacterStudioProps {
  projectId: string;
}

export function CharacterStudio({ projectId }: CharacterStudioProps) {
  const { characters, isLoading, loadCharacters, getCharacter } = useCharacterStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadCharacters(projectId);
  }, [loadCharacters, projectId]);

  // Derive the active selection instead of syncing it via effect: fall back
  // to the first character until the user explicitly picks one.
  const effectiveSelectedId = selectedId ?? characters[0]?.id;
  const selected = effectiveSelectedId ? getCharacter(effectiveSelectedId) : undefined;

  return (
    <div className="flex h-full flex-col">
      <Toaster position="bottom-right" richColors />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-violet-400" aria-hidden="true" />
          <h1 className="text-sm font-semibold uppercase tracking-widest text-slate-300">
            Character Studio
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-violet-500"
        >
          <Plus className="size-3.5" />
          New Character
        </button>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        {/* Character list */}
        <section
          className="flex shrink-0 gap-3 overflow-x-auto border-b border-white/10 p-4 md:w-64 md:flex-col md:overflow-y-auto md:overflow-x-hidden md:border-b-0 md:border-r"
          aria-label="Characters"
        >
          {isLoading ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="h-48 w-56 shrink-0 animate-pulse rounded-xl bg-slate-800 md:w-full" />
            ))
          ) : characters.length === 0 ? (
            <p className="p-2 text-xs text-slate-500">
              No characters yet. Add your first one to get started.
            </p>
          ) : (
            characters.map((character) => (
              <div key={character.id} className="md:w-full">
                <CharacterCard
                  character={character}
                  isSelected={character.id === effectiveSelectedId}
                  onSelect={() => setSelectedId(character.id)}
                />
              </div>
            ))
          )}
        </section>

        {/* Compare / lock panel */}
        <section className="flex-1 overflow-y-auto p-6" aria-label="Character detail">
          {selected ? (
            <CharacterCompareView key={selected.id} character={selected} />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">
              Select a character to view and refine its reference art.
            </div>
          )}
        </section>
      </div>

      {showForm && (
        <CharacterUploadForm projectId={projectId} onClose={() => setShowForm(false)} />
      )}
    </div>
  );
}
