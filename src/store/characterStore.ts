"use client";

import { create } from "zustand";
import type { Character, CharacterFormValues, CharacterVersion } from "@/types/character";
import { DEMO_CHARACTERS } from "@/lib/mock/demoCharacters";
import type { CharacterRefinementResponse } from "@/lib/ai/schemas";

// ---------------------------------------------------------------------------
// Character Studio store
//
// MOCK vs REAL — search this file for "MOCK:" to find every spot that needs
// to change once real services are ready:
//   1. loadCharacters()   -> replace with Rahat's GET /api/projects/:id/characters
//   2. addCharacter()     -> replace with Supabase Storage upload + Rahat's
//                            POST /api/characters (character record)
//   3. approveRefinement() -> persist approved versions through the character API
//   4. lockCharacter()     -> replace with Rahat's PATCH /api/characters/:id/lock
// ---------------------------------------------------------------------------

interface CharacterStore {
  characters: Character[];
  isLoading: boolean;
  error: string | null;

  loadCharacters: (projectId: string) => Promise<void>;
  addCharacter: (projectId: string, values: CharacterFormValues, imageDataUrl: string) => Promise<Character>;
  approveRefinement: (
    characterId: string,
    proposal: CharacterRefinementResponse,
  ) => CharacterVersion | undefined;
  lockCharacter: (characterId: string, versionId: string) => Promise<void>;
  getCharacter: (id: string) => Character | undefined;
}

export const useCharacterStore = create<CharacterStore>((set, get) => ({
  characters: [],
  isLoading: false,
  error: null,

  loadCharacters: async (projectId) => {
    set({ isLoading: true, error: null });
    try {
      // MOCK: replace with `await fetch(\`/api/projects/${projectId}/characters\`)`
      // once Rahat's character API is ready.
      await new Promise((r) => setTimeout(r, 500)); // simulate network
      const seeded = DEMO_CHARACTERS.filter((c) => c.projectId === projectId);
      set({ characters: seeded, isLoading: false });
    } catch {
      set({ error: "Failed to load characters. Please try again.", isLoading: false });
    }
  },

  addCharacter: async (projectId, values, imageDataUrl) => {
    // MOCK: replace with a Supabase Storage upload for the image, then a
    // POST to Rahat's character API with the returned public URL.
    await new Promise((r) => setTimeout(r, 500)); // simulate network

    const traits = values.visualTraits
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const now = new Date().toISOString();
    const originalVersion: CharacterVersion = {
      id: `char-version-${Date.now()}`,
      imageUrl: imageDataUrl,
      description: values.description,
      visualTraits: traits,
      source: "original",
      createdAt: now,
    };

    const newCharacter: Character = {
      id: `char-${Date.now()}`,
      projectId,
      name: values.name,
      role: values.role,
      description: values.description,
      visualTraits: traits,
      versions: [originalVersion],
      lockedVersionId: null,
      createdAt: now,
      updatedAt: now,
    };

    set((state) => ({ characters: [...state.characters, newCharacter] }));
    return newCharacter;
  },

  approveRefinement: (characterId, proposal) => {
    const character = get().characters.find((candidate) => candidate.id === characterId);
    if (!character || proposal.characterId !== characterId) return undefined;

    const createdAt = new Date().toISOString();
    const sourceVersion =
      character.versions.find((version) => version.id === character.lockedVersionId) ??
      character.versions[0];
    const refined: CharacterVersion = {
      id: `char-version-${Date.now()}`,
      imageUrl: sourceVersion?.imageUrl ?? "",
      description: proposal.proposedDescription,
      generationInstruction: proposal.proposedGenerationInstruction,
      visualTraits: sourceVersion?.visualTraits ?? character.visualTraits,
      source: "ai-refined",
      createdAt,
    };

    set((state) => ({
      characters: state.characters.map((candidate) =>
        candidate.id === characterId
          ? {
              ...candidate,
              versions: [...candidate.versions, refined],
              updatedAt: createdAt,
            }
          : candidate,
      ),
    }));

    return refined;
  },

  lockCharacter: async (characterId, versionId) => {
    // MOCK: replace with a PATCH call to Rahat's API once ready. Locking
    // should be the only action that marks a version as canon.
    await new Promise((r) => setTimeout(r, 300));

    set((state) => ({
      characters: state.characters.map((c) =>
        c.id === characterId
          ? { ...c, lockedVersionId: versionId, updatedAt: new Date().toISOString() }
          : c,
      ),
    }));
  },

  getCharacter: (id) => get().characters.find((c) => c.id === id),
}));
