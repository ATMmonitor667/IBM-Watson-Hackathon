"use client";

import { create } from "zustand";
import { hasSupabasePublicConfig } from "@/lib/supabase/env";
import type { Project, ProjectStatus } from "@/types/workspace";

// ---------------------------------------------------------------------------
// Static fallback used when Supabase credentials are absent in fixture mode.
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
/**
 * Where the data on screen actually came from.
 *
 * "mock" is a legitimate demo mode, but it must never be INVISIBLE. Before
 * this, every Supabase failure was caught and silently replaced with
 * MOCK_PROJECTS, which meant a broken RLS policy, an expired key, and a
 * perfectly healthy database all looked identical. You could record the demo
 * believing it came from Postgres.
 */
export type DataSource = "supabase" | "mock";

/** Why the store fell back, in words a human can act on. */
export type MockReason =
  | "no-credentials"
  | "not-signed-in"
  | "empty-database"
  | "query-failed";

export const MOCK_REASON_TEXT: Record<MockReason, string> = {
  "no-credentials":
    "No Supabase credentials configured — set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.",
  "not-signed-in":
    "Not signed in — sign in to load your own projects from the database.",
  "empty-database":
    "Signed in, but the database has no projects yet — run the seed script.",
  "query-failed": "The database query failed; showing demo data instead.",
};

interface ProjectStore {
  projects: Project[];
  isLoading: boolean;
  error: string | null;
  /** Which source the current `projects` came from. */
  dataSource: DataSource;
  /** Set whenever dataSource is "mock". Null when reading real data. */
  mockReason: MockReason | null;

  loadProjects: () => Promise<void>;
  addProject: (values: { title: string; description: string; status: ProjectStatus }) => Promise<Project>;
  getProject: (id: string) => Project | undefined;
}

/**
 * Log each distinct fallback once per session.
 *
 * loadProjects runs on every mount and retry; without this the console fills
 * with the same line and people stop reading it — which is the failure mode
 * this whole change exists to prevent.
 */
const warned = new Set<MockReason>();

function warnOnce(reason: MockReason, detail?: string) {
  if (warned.has(reason)) return;
  warned.add(reason);
  console.warn(
    `[storyverse] Showing DEMO DATA, not the database. ${MOCK_REASON_TEXT[reason]}` +
      (detail ? ` (${detail})` : ""),
  );
}

/** Exposed for tests, which need a clean slate between cases. */
export function __resetMockWarnings() {
  warned.clear();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------
export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  isLoading: false,
  error: null,
  dataSource: "mock",
  mockReason: null,

  loadProjects: async () => {
    set({ isLoading: true, error: null });

    /** Every fallback goes through here, so none of them can be silent. */
    const fallBackToMock = (reason: MockReason, detail?: string) => {
      warnOnce(reason, detail);
      set({
        projects: MOCK_PROJECTS,
        isLoading: false,
        dataSource: "mock",
        mockReason: reason,
        // `error` stays reserved for failures the user must act on, so a
        // deliberate offline demo does not render as a red error state.
        error: reason === "query-failed" ? (detail ?? null) : null,
      });
    };

    // ── Real Supabase path ────────────────────────────────────────────────
    if (hasSupabasePublicConfig()) {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const { fetchProjects } = await import("@/lib/supabase/db");
        const client = createClient();

        const { data: sessionData } = await client.auth.getSession();
        if (!sessionData.session) {
          fallBackToMock("not-signed-in");
          return;
        }

        const projects = await fetchProjects(client);
        if (projects.length === 0) {
          fallBackToMock("empty-database");
          return;
        }

        // The only path that reads real data.
        set({
          projects,
          isLoading: false,
          dataSource: "supabase",
          mockReason: null,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load projects";
        fallBackToMock("query-failed", msg);
      }
      return;
    }

    // ── Mock / offline path ───────────────────────────────────────────────
    // Small artificial delay to make loading states visible in dev
    await new Promise<void>((r) => setTimeout(r, 300));
    fallBackToMock("no-credentials");
  },

  addProject: async (values) => {
    // ── Real Supabase path ────────────────────────────────────────────────
    if (hasSupabasePublicConfig()) {
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
