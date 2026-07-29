"use client";

import { create } from "zustand";

// ---------------------------------------------------------------------------
// Panel identifiers
// ---------------------------------------------------------------------------
export type PanelId =
  | "scene-detail"
  | "branch-detail"
  | "create-branch"
  | "create-scene"
  | "merge-preview"
  | null;

interface UiStore {
  openPanelId: PanelId;
  /** Branch targeted by the merge-preview panel */
  mergeBranchId: string | null;
  /** Open a panel, optionally replacing any currently open one */
  openPanel: (id: Exclude<PanelId, null>) => void;
  /** Open the merge-preview panel for a specific branch */
  openMergePreview: (branchId: string) => void;
  closePanels: () => void;
}

export const useUiStore = create<UiStore>((set) => ({
  openPanelId: null,
  mergeBranchId: null,
  openPanel: (id) => set({ openPanelId: id }),
  openMergePreview: (branchId) =>
    set({ openPanelId: "merge-preview", mergeBranchId: branchId }),
  closePanels: () => set({ openPanelId: null, mergeBranchId: null }),
}));
