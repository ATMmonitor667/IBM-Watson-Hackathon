"use client";

import { create } from "zustand";

// ---------------------------------------------------------------------------
// Scene + node selection store
// ---------------------------------------------------------------------------
interface SceneStore {
  selectedSceneId: string | null;
  selectNode: (id: string) => void;
  clearSelection: () => void;
}

export const useSceneStore = create<SceneStore>((set) => ({
  selectedSceneId: null,
  selectNode: (id) => set({ selectedSceneId: id }),
  clearSelection: () => set({ selectedSceneId: null }),
}));
