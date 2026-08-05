"use client";

import { create } from "zustand";
import {
  hasSupabasePublicConfig,
  isFixtureMode,
} from "@/lib/supabase/env";
import type { Project, ProjectStatus } from "@/types/workspace";

const MOCK_PROJECTS: Project[] = [
  {
    id: "demo-1",
    title: "The Flooded City",
    description:
      "An explorer navigates a drowned metropolis with only a glowing compass to guide them.",
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
    description:
      "A prequel — how the compass was forged and what it truly points toward.",
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

export type DataSource = "supabase" | "mock";
export type MockReason =
  | "no-credentials"
  | "not-signed-in"
  | "empty-database"
  | "query-failed";

export const MOCK_REASON_TEXT: Record<MockReason, string> = {
  "no-credentials":
    "Fixture mode is active without Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local for live data.",
  "not-signed-in":
    "Not signed in — sign in to load your own projects from the database.",
  "empty-database":
    "Signed in, but the database has no projects yet — run the staged seed script or create a project.",
  "query-failed":
    "The database query failed. Live mode never substitutes demo rows for a failed query.",
};

interface ProjectStore {
  projects: Project[];
  isLoading: boolean;
  error: string | null;
  dataSource: DataSource;
  mockReason: MockReason | null;
  loadProjects: () => Promise<void>;
  addProject: (values: {
    title: string;
    description: string;
    status: ProjectStatus;
  }) => Promise<Project>;
  getProject: (id: string) => Project | undefined;
}

const warned = new Set<MockReason>();

function warnOnce(reason: MockReason, detail?: string) {
  if (warned.has(reason)) return;
  warned.add(reason);
  console.warn(
    `[storyverse] Showing DEMO DATA, not the database. ${MOCK_REASON_TEXT[reason]}` +
      (detail ? ` (${detail})` : ""),
  );
}

export function __resetMockWarnings() {
  warned.clear();
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  isLoading: false,
  error: null,
  dataSource: "mock",
  mockReason: null,

  loadProjects: async () => {
    set({ isLoading: true, error: null });

    if (isFixtureMode()) {
      const reason: MockReason = hasSupabasePublicConfig()
        ? "empty-database"
        : "no-credentials";
      warnOnce(reason);
      set({
        projects: MOCK_PROJECTS,
        isLoading: false,
        dataSource: "mock",
        mockReason: reason,
      });
      return;
    }

    if (!hasSupabasePublicConfig()) {
      // Graceful fallback: no credentials → show demo data, warn loudly once.
      // A working demo without credentials is more useful than a broken screen.
      // Set NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in
      // .env.local to load live data, or set NEXT_PUBLIC_USE_FIXTURES=1 to
      // suppress this warning and make the fixture intent explicit.
      warnOnce("no-credentials");
      set({
        projects: MOCK_PROJECTS,
        isLoading: false,
        dataSource: "mock",
        mockReason: "no-credentials",
        error: null,
      });
      return;
    }

    try {
      const [{ createClient }, { fetchProjects }] = await Promise.all([
        import("@/lib/supabase/client"),
        import("@/lib/supabase/db"),
      ]);
      const client = createClient();
      const { data: userData } = await client.auth.getUser();
      if (!userData.user) {
        set({
          projects: [],
          isLoading: false,
          dataSource: "supabase",
          mockReason: null,
          error: MOCK_REASON_TEXT["not-signed-in"],
        });
        return;
      }

      const projects = await fetchProjects(client);
      set({
        projects,
        isLoading: false,
        dataSource: "supabase",
        mockReason: null,
        error:
          projects.length === 0 ? MOCK_REASON_TEXT["empty-database"] : null,
      });
    } catch (error) {
      set({
        projects: [],
        isLoading: false,
        dataSource: "supabase",
        mockReason: null,
        error:
          error instanceof Error ? error.message : "Failed to load projects",
      });
    }
  },

  addProject: async (values) => {
    if (!isFixtureMode()) {
      if (!hasSupabasePublicConfig()) {
        throw new Error("Supabase is not configured");
      }
      const [{ createClient }, { insertProject }] = await Promise.all([
        import("@/lib/supabase/client"),
        import("@/lib/supabase/db"),
      ]);
      const newProject = await insertProject(createClient(), values);
      set((state) => ({ projects: [newProject, ...state.projects] }));
      return newProject;
    }

    const now = new Date().toISOString();
    const newProject: Project = {
      id: `project-local-${crypto.randomUUID()}`,
      ...values,
      ownerId: "dev-user",
      collaborators: [],
      branches: [],
      createdAt: now,
      updatedAt: now,
    };
    set((state) => ({ projects: [newProject, ...state.projects] }));
    return newProject;
  },

  getProject: (id) => get().projects.find((project) => project.id === id),
}));
