"use client";

import { create } from "zustand";

// ---------------------------------------------------------------------------
// Panel identifiers
// ---------------------------------------------------------------------------
export type PanelId = "scene-detail" | "branch-detail" | "create-branch" | null;

interface UiStore {
  openPanelId: PanelId;
  /** Open a panel, optionally replacing any currently open one */
  openPanel: (id: Exclude<PanelId, null>) => void;
  closePanels: () => void;
}

export const useUiStore = create<UiStore>((set) => ({
  openPanelId: null,
  openPanel: (id) => set({ openPanelId: id }),
  closePanels: () => set({ openPanelId: null }),
}));
