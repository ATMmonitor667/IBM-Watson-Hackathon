import { afterEach, describe, expect, it } from "vitest";

import {
  getSupabasePublicConfig,
  hasSupabasePublicConfig,
} from "@/lib/supabase/env";

const ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

afterEach(() => {
  for (const key of ENV_KEYS) delete process.env[key];
});

describe("Supabase public environment configuration", () => {
  it("reads the dashboard anon public key variable", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL =
      "https://storyverse.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "a".repeat(40);

    expect(getSupabasePublicConfig()).toEqual({
      url: "https://storyverse.supabase.co",
      anonKey: "a".repeat(40),
    });
    expect(hasSupabasePublicConfig()).toBe(true);
  });

  it("rejects placeholder dashboard values", () => {
    expect(
      hasSupabasePublicConfig({
        url: "https://your-project.supabase.co",
        anonKey: "your_supabase_anon_key",
      }),
    ).toBe(false);
  });
});
