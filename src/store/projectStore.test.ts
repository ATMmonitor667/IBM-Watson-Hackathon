import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  MOCK_REASON_TEXT,
  useProjectStore,
  __resetMockWarnings,
} from "@/store/projectStore";

/**
 * Issue #24 / A5 — the fallback to demo data must never be silent.
 *
 * The behaviour these tests protect is subtle: falling back is CORRECT, and
 * the bug was that it was invisible. So every case below asserts two things —
 * that the app still works, and that it says so.
 */

const ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

function setCredentials(present: boolean) {
  if (present) {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://real-project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "a".repeat(40);
  } else {
    for (const key of ENV_KEYS) delete process.env[key];
  }
}

beforeEach(() => {
  __resetMockWarnings();
  useProjectStore.setState({
    projects: [],
    isLoading: false,
    error: null,
    dataSource: "mock",
    mockReason: null,
  });
  vi.restoreAllMocks();
});

afterEach(() => {
  setCredentials(false);
  vi.resetModules();
});

describe("with no Supabase credentials", () => {
  it("still loads the demo projects", async () => {
    setCredentials(false);
    await useProjectStore.getState().loadProjects();

    const state = useProjectStore.getState();
    expect(state.projects.length).toBeGreaterThan(0);
    expect(state.isLoading).toBe(false);
  });

  it("reports mock as the data source, with the reason", async () => {
    setCredentials(false);
    await useProjectStore.getState().loadProjects();

    const state = useProjectStore.getState();
    expect(state.dataSource).toBe("mock");
    expect(state.mockReason).toBe("no-credentials");
  });

  it("warns on the console so it cannot pass unnoticed", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    setCredentials(false);

    await useProjectStore.getState().loadProjects();

    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0][0]).toContain("DEMO DATA");
    // The message must name the fix, not just the symptom.
    expect(warn.mock.calls[0][0]).toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(warn.mock.calls[0][0]).toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  });

  it("warns once, not on every reload", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    setCredentials(false);

    await useProjectStore.getState().loadProjects();
    await useProjectStore.getState().loadProjects();
    await useProjectStore.getState().loadProjects();

    // A console that repeats itself gets ignored, which defeats the purpose.
    expect(warn).toHaveBeenCalledOnce();
  });

  it("does not set `error` — an offline demo is not a failure", async () => {
    setCredentials(false);
    await useProjectStore.getState().loadProjects();
    expect(useProjectStore.getState().error).toBeNull();
  });
});

describe("every mock reason explains itself", () => {
  it("names a concrete next step rather than restating the problem", () => {
    for (const [reason, text] of Object.entries(MOCK_REASON_TEXT)) {
      expect(text.length, `${reason} is too terse to act on`).toBeGreaterThan(
        30,
      );
    }

    expect(MOCK_REASON_TEXT["no-credentials"]).toContain(".env.local");
    expect(MOCK_REASON_TEXT["not-signed-in"]).toContain("sign in");
    expect(MOCK_REASON_TEXT["empty-database"]).toContain("seed");
  });
});

describe("the store starts honest", () => {
  it("defaults to mock before anything has loaded", () => {
    // Defaulting to "supabase" would show a green Live-data badge during the
    // first paint, before a single row had been fetched.
    expect(useProjectStore.getState().dataSource).toBe("mock");
  });
});
