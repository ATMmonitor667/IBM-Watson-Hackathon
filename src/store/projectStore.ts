"use client";

import { create } from "zustand";
import type { Project, ProjectStatus } from "@/types/workspace";

// ---------------------------------------------------------------------------
// Static fallback — used when Supabase credentials are absent (AI_MOCK mode)
// or when the DB returns no rows for a fresh dev environment.
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

// ---------------------------------------------------------------------------
// Store interface
// ---------------------------------------------------------------------------
interface ProjectStore {
  projects: Project[];
  isLoading: boolean;
  error: string | null;

  loadProjects: () => Promise<void>;
  addProject: (values: { title: string; description: string; status: ProjectStatus }) => Promise<Project>;
  getProject: (id: string) => Project | undefined;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** True when Supabase env vars look real (not placeholder strings). */
function hasSupabaseCredentials(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
  return (
    url.startsWith("https://") &&
    !url.includes("your-project") &&
    key.length > 20 &&
    !key.includes("your_supabase")
  );
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------
export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  isLoading: false,
  error: null,

  loadProjects: async () => {
    set({ isLoading: true, error: null });

    // ── Real Supabase path ────────────────────────────────────────────────
    if (hasSupabaseCredentials()) {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const { fetchProjects } = await import("@/lib/supabase/db");
        const client = createClient();

        // Check session — fall back to mock if not signed in (dev bypass)
        const { data: sessionData } = await client.auth.getSession();
        if (!sessionData.session) {
          set({ projects: MOCK_PROJECTS, isLoading: false });
          return;
        }

        const projects = await fetchProjects(client);
        // Always include MOCK_PROJECTS as fallback when DB is empty (first run)
        set({
          projects: projects.length > 0 ? projects : MOCK_PROJECTS,
          isLoading: false,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load projects";
        // Non-fatal: degrade to mock data so the demo still works
        set({ projects: MOCK_PROJECTS, isLoading: false, error: msg });
      }
      return;
    }

    // ── Mock / offline path ───────────────────────────────────────────────
    // Small artificial delay to make loading states visible in dev
    await new Promise<void>((r) => setTimeout(r, 300));
    set({ projects: MOCK_PROJECTS, isLoading: false });
  },

  addProject: async (values) => {
    // ── Real Supabase path ────────────────────────────────────────────────
    if (hasSupabaseCredentials()) {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const { insertProject } = await import("@/lib/supabase/db");
        const client = createClient();
        const newProject = await insertProject(client, values);
        set((state) => ({ projects: [newProject, ...state.projects] }));
        return newProject;
      } catch (err) {
        throw err instanceof Error ? err : new Error("Failed to create project");
      }
    }

    // ── Mock path ─────────────────────────────────────────────────────────
    await new Promise<void>((r) => setTimeout(r, 200));
    const now = new Date().toISOString();
    const newProject: Project = {
      id: `project-local-${now}`,
      title: values.title,
      description: values.description,
      status: values.status,
      ownerId: "dev-user",
      collaborators: [],
      branches: [],
      createdAt: now,
      updatedAt: now,
    };
    set((state) => ({ projects: [newProject, ...state.projects] }));
    return newProject;
  },

  getProject: (id) => get().projects.find((p) => p.id === id),
}));
