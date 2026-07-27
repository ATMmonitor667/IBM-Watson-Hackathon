"use client";

import { create } from "zustand";

// ---------------------------------------------------------------------------
// Activity feed entry
// ---------------------------------------------------------------------------
export interface ActivityEntry {
  id: string;
  timestamp: string; // ISO date string
  message: string;
  type: "merge" | "branch" | "scene" | "info";
}

interface ActivityStore {
  entries: ActivityEntry[];
  addEntry: (entry: Omit<ActivityEntry, "id" | "timestamp">) => void;
}

export const useActivityStore = create<ActivityStore>((set) => ({
  entries: [
    {
      id: "init-1",
      timestamp: new Date().toISOString(),
      message: "Project loaded — 5 scenes, 2 branches",
      type: "info",
    },
  ],
  addEntry: (entry) =>
    set((state) => ({
      entries: [
        {
          ...entry,
          id: `activity-${Date.now()}`,
          timestamp: new Date().toISOString(),
        },
        ...state.entries,
      ],
    })),
}));
