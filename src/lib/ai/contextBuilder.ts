/**
 * src/lib/ai/contextBuilder.ts
 *
 * Builds a CanonContext for an AI request given a branch and the canon branch.
 *
 * Key invariant:
 *   A branch can NEVER silently overwrite a canon fact.
 *   If a branch scene contains a fact key that already exists in canon,
 *   it goes into `branchFacts` (not `canonFacts`), making the conflict
 *   visible to the continuity inspector.
 *
 * This module is pure — no I/O, no network calls.
 * Tests can run without any environment setup.
 */

import { type CanonContext, type CanonFact } from "./schemas";

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

/**
 * Minimal scene representation consumed by the context builder.
 * Matches the subset of src/types/workspace.ts#Scene that the builder needs.
 */
export interface ContextScene {
  sceneNumber: number;
  title: string;
  /** Object-state changes established in this scene, keyed by fact key */
  facts?: CanonFact[];
}

/**
 * Minimal branch representation consumed by the context builder.
 */
export interface ContextBranch {
  name: string;
  isCanon: boolean;
  scenes: ContextScene[];
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

/**
 * Builds the CanonContext that is sent to every AI call.
 *
 * @param branch        The branch being evaluated (may or may not be canon).
 * @param canonBranch   The authoritative canon branch of the same project.
 * @param projectId     The project identifier.
 * @param characterSummary  The locked character description.
 *
 * Canon facts are collected from canonBranch.scenes.
 * Branch facts are collected from branch.scenes, but only for keys that
 * DO NOT already exist in the canon set — new branch-only facts are included.
 * Facts whose key matches a canon fact are placed in branchFacts,
 * preserving the contradiction for the inspector to detect.
 */
export function buildCanonContext(
  branch: ContextBranch,
  canonBranch: ContextBranch,
  projectId: string,
  characterSummary: string
): CanonContext {
  // ------------------------------------------------------------------
  // Collect canon facts (last writer wins within canon scenes)
  // ------------------------------------------------------------------
  const canonFactMap = new Map<string, CanonFact>();
  for (const scene of canonBranch.scenes) {
    for (const fact of scene.facts ?? []) {
      canonFactMap.set(fact.key, fact);
    }
  }

  // ------------------------------------------------------------------
  // Collect branch facts — never overwrite canon
  // When the branch IS the canon branch (self-review), there are no
  // branch-specific overrides to detect.
  // ------------------------------------------------------------------
  const branchFactMap = new Map<string, CanonFact>();
  if (branch.name !== canonBranch.name) {
    for (const scene of branch.scenes) {
      for (const fact of scene.facts ?? []) {
        // Place in branchFacts regardless of whether the key exists in canon.
        // If the key matches canon, the inspector can detect the contradiction.
        // If it's new, the scope remains clear (branch-only fact).
        branchFactMap.set(fact.key, fact);
      }
    }
  }

  // ------------------------------------------------------------------
  // Scene history — canon scenes ordered, then branch-only additions
  // ------------------------------------------------------------------
  const canonSceneIds = new Set(canonBranch.scenes.map((s) => s.sceneNumber));
  const canonHistory = [...canonBranch.scenes]
    .sort((a, b) => a.sceneNumber - b.sceneNumber)
    .map((s) => s.title);
  const branchOnlyHistory = [...branch.scenes]
    .filter((s) => !canonSceneIds.has(s.sceneNumber))
    .sort((a, b) => a.sceneNumber - b.sceneNumber)
    .map((s) => `[branch] ${s.title}`);

  return {
    projectId,
    branchName: branch.name,
    canonFacts: Array.from(canonFactMap.values()),
    branchFacts: Array.from(branchFactMap.values()),
    sceneHistory: [...canonHistory, ...branchOnlyHistory],
    characterSummary,
  };
}

// ---------------------------------------------------------------------------
// Utility: detect contradictions between branch and canon facts
// ---------------------------------------------------------------------------

export interface CanonContradiction {
  key: string;
  canonValue: string;
  branchValue: string;
  canonLockedInScene: number;
  branchLockedInScene: number;
}

/**
 * Returns every fact key where the branch value differs from the canon value.
 * Used by the continuity inspector and tests.
 */
export function findContradictions(ctx: CanonContext): CanonContradiction[] {
  const canonMap = new Map(ctx.canonFacts.map((f) => [f.key, f]));
  const contradictions: CanonContradiction[] = [];

  for (const branchFact of ctx.branchFacts) {
    const canonFact = canonMap.get(branchFact.key);
    if (canonFact && canonFact.value !== branchFact.value) {
      contradictions.push({
        key: branchFact.key,
        canonValue: canonFact.value,
        branchValue: branchFact.value,
        canonLockedInScene: canonFact.lockedInScene,
        branchLockedInScene: branchFact.lockedInScene,
      });
    }
  }

  return contradictions;
}
