"use client";

import { create } from "zustand";
import type { Project, ProjectStatus } from "@/types/workspace";

// ---------------------------------------------------------------------------
// Mock seed data — will be replaced by real Supabase data on Day 2
// ---------------------------------------------------------------------------
const MOCK_PROJECTS: Project[] = [
  {
    id: "demo-1",
    title: "The Flooded City",
    description: "An explorer navigates a drowned metropolis with only a glowing compass to guide them.",
    status: "In Progress",
    ownerId: "dev-user",
    collaborators: [],
    branches: [],
    createdAt: "2026-07-22T10:00:00.000Z",
    updatedAt: "2026-07-24T10:00:00.000Z",
  },
  {
    id: "demo-2",
    title: "The Lost Compass",
    description: "A prequel — how the compass was forged and what it truly points toward.",
    status: "Draft",
    ownerId: "dev-user",
    collaborators: [],
    branches: [],
    createdAt: "2026-07-23T08:00:00.000Z",
    updatedAt: "2026-07-23T08:00:00.000Z",
  },
  {
    id: "demo-3",
    title: "Chapter Zero",
    description: "Origin story of the companion. Before the flood.",
    status: "Draft",
    ownerId: "dev-user",
    collaborators: [],
    branches: [],
    createdAt: "2026-07-24T09:00:00.000Z",
    updatedAt: "2026-07-24T09:00:00.000Z",
  },
];

interface ProjectStore {
  projects: Project[];
  isLoading: boolean;
  error: string | null;

  // Actions
  loadProjects: () => Promise<void>;
  addProject: (values: { title: string; description: string; status: ProjectStatus }) => Promise<Project>;
  getProject: (id: string) => Project | undefined;
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  isLoading: false,
  error: null,

  loadProjects: async () => {
    set({ isLoading: true, error: null });
    try {
      // TODO: replace with real Supabase call once Rahat's API is ready
      // const { data, error } = await supabase.from("projects").select("*");
      await new Promise((r) => setTimeout(r, 600)); // simulate network
      set({ projects: MOCK_PROJECTS, isLoading: false });
    } catch {
      set({ error: "Failed to load projects. Please try again.", isLoading: false });
    }
  },

  addProject: async (values) => {
    // TODO: replace with real Supabase insert once Rahat's API is ready
    await new Promise((r) => setTimeout(r, 400)); // simulate network
    const newProject: Project = {
      id: `project-${Date.now()}`,
      title: values.title,
      description: values.description,
      status: values.status,
      ownerId: "dev-user",
      collaborators: [],
      branches: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((state) => ({ projects: [...state.projects, newProject] }));
    return newProject;
  },

  getProject: (id) => get().projects.find((p) => p.id === id),
}));
