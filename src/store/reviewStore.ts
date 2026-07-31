"use client";

import { create } from "zustand";

import { callContinuityReview } from "@/lib/ai/continuityClient";
import { buildCanonContext, toContextBranch } from "@/lib/ai/contextBuilder";
import { reviewBranch } from "@/lib/ai/continuityRules";
import { DEMO_BRANCHES } from "@/lib/mock/demoBranches";
import { DEMO_CHARACTERS } from "@/lib/mock/demoCharacters";
import { demoStrategiesFor } from "@/lib/mock/demoReview";
import {
  applyNarrative,
  buildBranchReview,
  sceneNumbersOf,
  withUnavailableNarrative,
} from "@/lib/review/branchReview";
import type {
  BranchReview,
  FindingDecision,
  MergeSelection,
} from "@/types/review";
import type { Branch } from "@/types/workspace";

// ---------------------------------------------------------------------------
// Continuity review + selective merge store
//
// HOW A REVIEW IS PRODUCED (issues #8 / D3 and #12 / D4)
//
//   1. The deterministic rule engine reviews the branch. This cannot fail for
//      external reasons and needs no network, so the reviewer sees the
//      contradictions, their evidence and the canon facts they break
//      immediately — before any model is involved.
//   2. The same computed findings are posted to /api/ai/continuity so the model
//      can EXPLAIN them. If that call fails the review keeps everything from
//      step 1 and says the narrative is unavailable. A failed model call must
//      never look like a clean branch.
//
// This replaces the `branchId === "branch-tunnel" ? DEMO_BRANCH_REVIEW : null`
// check that used to live here (audit finding H3). Every branch now gets a real
// review computed from its own scenes, and a branch that genuinely cannot be
// reviewed — one that does not exist, or a project with no canon to compare
// against — surfaces as an error instead of as an empty success.
//
// MOCK vs REAL — search this file for "MOCK:" for what is still stubbed:
//   1. The branch list is read from demo fixtures rather than a branches API.
//   2. Merge strategies are hand-authored for one branch (issue #25 / D5).
//   3. confirmMerge() does not persist anything.
// The findings themselves are no longer mocked at all.
// ---------------------------------------------------------------------------

interface ReviewStore {
  review: BranchReview | null;
  /** The deterministic pass is running. */
  isLoading: boolean;
  /** The model is being asked to explain findings that are already on screen. */
  isNarrativeLoading: boolean;
  error: string | null;
  /** The reviewer's verdict per finding id. Recorded, never enacted. */
  decisions: Record<string, FindingDecision>;
  selections: MergeSelection[];
  isMerging: boolean;
  mergeComplete: boolean;

  runContinuityReview: (branchId: string) => Promise<void>;
  decideFinding: (findingId: string, decision: FindingDecision) => void;
  toggleSelection: (sceneId: string) => void;
  setAllSelections: (sceneIds: string[], include: boolean) => void;
  confirmMerge: () => Promise<void>;
  reset: () => void;
}

/**
 * The locked character records, as one block of context for the model.
 *
 * Derived from the character fixtures rather than typed out, so it cannot drift
 * away from the cast the scenes actually contain.
 */
function lockedCharacterSummary(): string {
  return DEMO_CHARACTERS.map(
    (character) => `${character.name} (${character.role}) — ${character.description}`,
  ).join("\n");
}

/** MOCK: the project's branches, pending a branches API. */
function branchesOfProject(): Branch[] {
  return DEMO_BRANCHES;
}

export const useReviewStore = create<ReviewStore>((set, get) => ({
  review: null,
  isLoading: false,
  isNarrativeLoading: false,
  error: null,
  decisions: {},
  selections: [],
  isMerging: false,
  mergeComplete: false,

  runContinuityReview: async (branchId) => {
    set({
      isLoading: true,
      isNarrativeLoading: false,
      error: null,
      review: null,
      decisions: {},
      mergeComplete: false,
    });

    const branches = branchesOfProject();
    const branch = branches.find((b) => b.id === branchId);
    const canonBranch = branches.find((b) => b.isCanon);

    // A branch we cannot find, or a project with no canon, is a real failure.
    // Returning an empty review here would tell the reviewer their branch is
    // clean, which is the worst possible lie for this screen to tell.
    if (!branch) {
      set({
        error:
          `Branch "${branchId}" was not found in this project, so there is ` +
          `nothing to review. It may not have been saved yet.`,
        isLoading: false,
      });
      return;
    }
    if (!canonBranch) {
      set({
        error:
          "This project has no canon timeline, so a branch cannot be compared " +
          "against one.",
        isLoading: false,
      });
      return;
    }

    // ------------------------------------------------------------------
    // Pass 1 — deterministic. Show it before asking the model anything.
    // ------------------------------------------------------------------
    let review: BranchReview;
    try {
      review = buildBranchReview(branch, branches, demoStrategiesFor(branch.id));
    } catch (err) {
      set({
        error:
          `The continuity engine failed on this branch: ` +
          `${err instanceof Error ? err.message : "unknown error"}`,
        isLoading: false,
      });
      return;
    }

    // Default every scene named by the first strategy to "included" so the
    // reviewer starts from the recommended safe strategy.
    const defaultSceneIds = review.strategies[0]?.compatibleSceneIds ?? [];
    const selections: MergeSelection[] = defaultSceneIds.map((sceneId) => ({
      sceneId,
      include: true,
    }));

    set({ review, selections, isLoading: false, isNarrativeLoading: true });

    // ------------------------------------------------------------------
    // Pass 2 — the model explains what the engine found.
    // ------------------------------------------------------------------
    const context = buildCanonContext(
      toContextBranch(branch),
      toContextBranch(canonBranch),
      branch.projectId,
      lockedCharacterSummary(),
      reviewBranch(branch, branches),
    );

    const result = await callContinuityReview(context);

    // The reviewer may have switched branches while the model was thinking.
    // Applying this response to a different branch's review is exactly the
    // mislabelling this surface exists to prevent. The flags are left alone:
    // whichever run is current owns them, and this one is not it.
    const current = get().review;
    if (!current || current.branchId !== branch.id) return;

    set({
      review: result.ok
        ? applyNarrative(current, result.data, sceneNumbersOf(branches))
        : withUnavailableNarrative(current, result.error),
      isNarrativeLoading: false,
    });
  },

  /**
   * Record the reviewer's verdict on one finding.
   *
   * Nothing downstream reads this to change a scene, and deliberately so: the
   * AI proposes, the human decides, and the only thing that writes to the story
   * is the merge step the human confirms separately.
   */
  decideFinding: (findingId, decision) => {
    set((state) => ({
      decisions: { ...state.decisions, [findingId]: decision },
    }));
  },

  toggleSelection: (sceneId) => {
    set((state) => {
      const exists = state.selections.find((s) => s.sceneId === sceneId);
      if (exists) {
        return {
          selections: state.selections.map((s) =>
            s.sceneId === sceneId ? { ...s, include: !s.include } : s,
          ),
        };
      }
      return { selections: [...state.selections, { sceneId, include: true }] };
    });
  },

  setAllSelections: (sceneIds, include) => {
    set({ selections: sceneIds.map((sceneId) => ({ sceneId, include })) });
  },

  confirmMerge: async () => {
    set({ isMerging: true });
    try {
      // MOCK: replace with the transactional selective-merge API. Send
      // get().selections (only sceneId where include === true) plus the
      // branch id, reviewer id, and chosen strategy id.
      await new Promise((r) => setTimeout(r, 800)); // simulate network
      set({ mergeComplete: true });
    } finally {
      set({ isMerging: false });
    }
  },

  reset: () =>
    set({
      review: null,
      selections: [],
      decisions: {},
      mergeComplete: false,
      error: null,
      isNarrativeLoading: false,
    }),
}));
