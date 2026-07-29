// ---------------------------------------------------------------------------
// Character Studio types — local/temporary until Rahat's shared Character
// type + Zod schema lands in src/types/workspace.ts (see AGENTS.md contract).
//
// Owner: Firdosi (Character Studio, media workflow, review UI)
// ---------------------------------------------------------------------------

export type CharacterVersionSource = "original" | "ai-refined";

export interface CharacterVersion {
  id: string;
  imageUrl: string;
  description: string;
  /** Comma-separated or short list of visual traits at this version */
  visualTraits: string[];
  source: CharacterVersionSource;
  createdAt: string; // ISO date string
}

export interface Character {
  id: string;
  projectId: string;
  name: string;
  /** Short role label, e.g. "Protagonist / Explorer" */
  role: string;
  description: string;
  visualTraits: string[];
  /** All saved versions, oldest first. versions[0] is always the original upload. */
  versions: CharacterVersion[];
  /** id of the version currently marked canon. null until Lock Character is used. */
  lockedVersionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CharacterFormValues {
  name: string;
  role: string;
  description: string;
  visualTraits: string; // comma-separated input from the form, split on save
}
