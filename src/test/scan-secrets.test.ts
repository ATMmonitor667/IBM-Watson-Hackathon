import { describe, expect, it } from "vitest";

// @ts-expect-error — plain .mjs script, no type declarations by design.
import { inspectLine, isPlaceholder } from "../../scripts/scan-secrets.mjs";

/**
 * Tests for the secret scanner (issue #36 / F5).
 *
 * A scanner that reports "clean" because it is broken is worse than no scanner
 * at all — it converts an unknown risk into false confidence. These tests prove
 * it actually fires on real credential shapes, and that it stays quiet on the
 * placeholders this repo genuinely contains.
 *
 * NOTE ON THE FIXTURES: every fake credential below is assembled by
 * concatenation at runtime, so no literal credential shape ever appears in this
 * file's source. Writing them out would mean the scanner flags its own test
 * file on the next history scan — an own goal that would get the scanner muted.
 */

const scan = (line: string, file = "src/example.ts"): string[] =>
  inspectLine(file, line) as string[];

describe("catches real credential shapes", () => {
  it("a Supabase / JWT key", () => {
    const jwt = ["eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9", "eyJzdWIiOiIxMjM0NTY3ODkwIn0", "dBjftJeZ4CVPmB92K27uhbUJU1p1r0"].join(".");
    expect(scan(`const key = "${jwt}";`)).toContain("JSON Web Token");
  });

  it("an AWS access key id", () => {
    const aws = "AKIA" + "IOSFODNN7EXAMPLE".slice(0, 16);
    expect(scan(`AWS_ID=${aws}`)).toContain("AWS access key id");
  });

  it("a GitHub personal access token", () => {
    const token = "ghp_" + "a".repeat(36);
    expect(scan(`token: "${token}"`)).toContain("GitHub token");
  });

  it("an OpenAI-style key", () => {
    const key = "sk-" + "A1b2C3d4".repeat(5);
    expect(scan(`OPENAI=${key}`)).toContain("OpenAI-style key");
  });

  it("a private key block", () => {
    const header = "-----BEGIN" + " RSA PRIVATE KEY" + "-----";
    expect(scan(header)).toContain("Private key block");
  });

  it("a Google API key", () => {
    const key = "AIza" + "b".repeat(35);
    expect(scan(`maps=${key}`)).toContain("Google API key");
  });
});

describe("catches the way THIS project would leak", () => {
  it("a watsonx key pasted into an env file", () => {
    const value = "9Fk" + "qZ2xL8vT4nR7wY1pJ6sD3gH5bM0cA".repeat(1);
    const reasons = scan(`WATSONX_API_KEY=${value}`, ".env");
    expect(reasons.join(" ")).toMatch(/assigned a non-placeholder value/i);
  });

  it("a Supabase publishable key assigned in source", () => {
    const value = "sbp" + "_0123456789abcdef0123456789abcdef";
    const reasons = scan(`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "${value}"`);
    expect(reasons.join(" ")).toMatch(/assigned a non-placeholder value/i);
  });

  it("a service role key", () => {
    const value = "srk" + "_9876543210zyxwvutsrqponmlkjihg";
    expect(scan(`SUPABASE_SERVICE_ROLE_KEY=${value}`).length).toBeGreaterThan(0);
  });
});

describe("stays quiet on what this repo actually contains", () => {
  it("empty assignments in .env.example", () => {
    expect(scan("WATSONX_API_KEY=", ".env.example")).toEqual([]);
    expect(scan("NEXT_PUBLIC_SUPABASE_ANON_KEY=", ".env.example")).toEqual([]);
  });

  it("code that READS an env var rather than defining one", () => {
    expect(
      scan("const apiKey = process.env.WATSONX_API_KEY?.trim();"),
    ).toEqual([]);
  });

  it("documentation placeholders", () => {
    expect(scan("grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=<KEY>")).toEqual([]);
    expect(scan("SUPABASE_ANON_KEY=your-anon-key-here")).toEqual([]);
    expect(scan("API_KEY=changeme")).toEqual([]);
    expect(scan("token: xxxxxxxxxx")).toEqual([]);
  });

  it("type annotations and schema definitions", () => {
    expect(scan("apiKey: string;")).toEqual([]);
    expect(scan("apiKey: z.string().min(1),")).toEqual([]);
  });

  it("numeric config that happens to be near a secret-ish name", () => {
    expect(scan("AI_REQUEST_TIMEOUT_MS=15000")).toEqual([]);
  });
});

describe("ignores files that are noise", () => {
  it("skips lockfile integrity hashes", () => {
    const hash = "sha512-" + "Z".repeat(60);
    expect(scan(`"integrity": "${hash}"`, "package-lock.json")).toEqual([]);
  });

  it("skips binary assets", () => {
    const jwtish = ["eyJhbGciOiJIUzI1NiJ9", "eyJhIjoxfQ", "sig"].join(".");
    expect(scan(jwtish, "public/demo/panel.png")).toEqual([]);
  });

  it("never reports its own rule definitions", () => {
    const aws = "AKIA" + "IOSFODNN7EXAMPLE".slice(0, 16);
    expect(scan(aws, "scripts/scan-secrets.mjs")).toEqual([]);
  });
});

describe("isPlaceholder", () => {
  it("treats short values as placeholders — too short to be a credential", () => {
    expect(isPlaceholder("abc")).toBe(true);
    expect(isPlaceholder("")).toBe(true);
  });

  it("treats a long random-looking value as real", () => {
    expect(isPlaceholder("k7Jd82hFmQ0xPzR4vN6bT1sW9yL3cX5a")).toBe(false);
  });
});
