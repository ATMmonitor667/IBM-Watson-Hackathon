"use client";

import { create } from "zustand";
import type { Character, CharacterFormValues, CharacterVersion } from "@/types/character";
import { DEMO_CHARACTERS } from "@/lib/mock/demoCharacters";

// ---------------------------------------------------------------------------
// Character Studio store
//
// MOCK vs REAL — search this file for "MOCK:" to find every spot that needs
// to change once real services are ready:
//   1. loadCharacters()   -> replace with Rahat's GET /api/projects/:id/characters
//   2. addCharacter()     -> replace with Supabase Storage upload + Rahat's
//                            POST /api/characters (character record)
//   3. refineCharacter()  -> replace with Farin's POST /api/characters/:id/refine
//   4. lockCharacter()    -> replace with Rahat's PATCH /api/characters/:id/lock
// ---------------------------------------------------------------------------

interface CharacterStore {
  characters: Character[];
  isLoading: boolean;
  error: string | null;
  /** Character id currently mid-refine, or null */
  refiningId: string | null;

  loadCharacters: (projectId: string) => Promise<void>;
  addCharacter: (projectId: string, values: CharacterFormValues, imageDataUrl: string) => Promise<Character>;
  refineCharacter: (characterId: string) => Promise<void>;
  lockCharacter: (characterId: string, versionId: string) => Promise<void>;
  getCharacter: (id: string) => Character | undefined;
}

export const useCharacterStore = create<CharacterStore>((set, get) => ({
  characters: [],
  isLoading: false,
  error: null,
  refiningId: null,

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

  refineCharacter: async (characterId) => {
    set({ refiningId: characterId });
    try {
      // MOCK: replace with `await fetch(\`/api/characters/${characterId}/refine\`, { method: "POST" })`
      // once Farin's AI refinement endpoint is ready. That endpoint returns a
      // proposed updated description / trait list (and eventually an image).
      await new Promise((r) => setTimeout(r, 900)); // simulate model latency

      const character = get().characters.find((c) => c.id === characterId);
      if (!character) return;

      // MOCK: a deterministic "refined" version so the demo doesn't depend on
      // network availability. Real version will come from Farin's endpoint.
      const refined: CharacterVersion = {
        id: `char-version-${Date.now()}`,
        imageUrl: character.versions[0]?.imageUrl ?? "",
        description: `${character.description} Refined for visual consistency: sharper silhouette, consistent palette across panels, and clearer read at small sizes.`,
        visualTraits: [...character.visualTraits, "Consistent palette lock"],
        source: "ai-refined",
        createdAt: new Date().toISOString(),
      };

      set((state) => ({
        characters: state.characters.map((c) =>
          c.id === characterId
            ? { ...c, versions: [...c.versions, refined], updatedAt: refined.createdAt }
            : c,
        ),
      }));
    } finally {
      set({ refiningId: null });
    }
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
