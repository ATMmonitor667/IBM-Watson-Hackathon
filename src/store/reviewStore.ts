"use client";

import { create } from "zustand";
import type { BranchReview, MergeSelection } from "@/types/review";
import { DEMO_BRANCH_REVIEW } from "@/lib/mock/demoReview";

// ---------------------------------------------------------------------------
// Continuity review + selective merge store
//
// MOCK vs REAL — search this file for "MOCK:" to find every spot that needs
// to change once real services are ready:
//   1. runContinuityReview() -> replace with Farin's continuity inspector +
//                                merge assistant endpoint (returns BranchReview)
//   2. confirmMerge()        -> replace with Rahat's transactional selective
//                                merge API (POST /api/branches/:id/merge)
// ---------------------------------------------------------------------------

interface ReviewStore {
  review: BranchReview | null;
  isLoading: boolean;
  error: string | null;
  selections: MergeSelection[];
  isMerging: boolean;
  mergeComplete: boolean;

  runContinuityReview: (branchId: string) => Promise<void>;
  toggleSelection: (sceneId: string) => void;
  setAllSelections: (sceneIds: string[], include: boolean) => void;
  confirmMerge: () => Promise<void>;
  reset: () => void;
}

export const useReviewStore = create<ReviewStore>((set) => ({
  review: null,
  isLoading: false,
  error: null,
  selections: [],
  isMerging: false,
  mergeComplete: false,

  runContinuityReview: async (branchId) => {
    set({ isLoading: true, error: null, mergeComplete: false });
    try {
      // MOCK: replace with `await fetch(\`/api/branches/${branchId}/review\`)`
      // once Farin's continuity inspector + merge assistant are ready. The
      // real response should validate against src/types/review.ts BranchReview.
      await new Promise((r) => setTimeout(r, 700)); // simulate model latency

      const review = branchId === "branch-tunnel" ? DEMO_BRANCH_REVIEW : null;

      // Default every scene named in a strategy to "included" so the
      // reviewer starts from the recommended safe strategy.
      const defaultSceneIds = review?.strategies[0]?.compatibleSceneIds ?? [];
      const selections: MergeSelection[] = defaultSceneIds.map((sceneId) => ({
        sceneId,
        include: true,
      }));

      set({ review, selections, isLoading: false });
    } catch {
      set({ error: "Failed to run continuity review. Please try again.", isLoading: false });
    }
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
      // MOCK: replace with Rahat's transactional selective-merge API. Send
      // get().selections (only sceneId where include === true) plus the
      // branch id, reviewer id, and chosen strategy id.
      await new Promise((r) => setTimeout(r, 800)); // simulate network
      set({ mergeComplete: true });
    } finally {
      set({ isMerging: false });
    }
  },

  reset: () => set({ review: null, selections: [], mergeComplete: false, error: null }),
}));
