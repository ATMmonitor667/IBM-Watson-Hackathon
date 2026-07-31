/**
 * src/lib/ai/__tests__/mergeAssistantClient.test.ts
 *
 * The request half of issue #6 / D5.
 *
 * The route's own tests prove it answers. These prove it is asked a question
 * worth answering: that the CanonContext the UI sends actually contains the
 * author's facts, and that a fallback response is reported as one.
 */

import { describe, expect, it, vi, afterEach } from "vitest";

import {
  AI_SOURCE_HEADER,
  buildMergeContext,
  callMergeAssistant,
  factsFromScene,
} from "@/lib/ai/mergeAssistantClient";
import { findContradictions } from "@/lib/ai/contextBuilder";
import { mockMergeAssistantFor } from "@/lib/ai/mocks";
import { CanonContextSchema } from "@/lib/ai/schemas";
import { DEMO_BRANCHES } from "@/lib/mock/demoBranches";
import type { Scene } from "@/types/workspace";

const CANON = DEMO_BRANCHES.find((b) => b.isCanon)!;
const TUNNEL = DEMO_BRANCHES.find((b) => !b.isCanon)!;

afterEach(() => {
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// Fact derivation
// ---------------------------------------------------------------------------

describe("factsFromScene", () => {
  it("derives one fact per prop and per cast member, keyed separately", () => {
    const scene = CANON.scenes.find((s) => s.id === "scene-demo-1")!;
    const facts = factsFromScene(scene);

    expect(facts.map((f) => f.key)).toContain("prop:the-compass");
    expect(facts.map((f) => f.key)).toContain("character:the-compass");
    expect(facts.every((f) => f.lockedInScene === scene.sceneNumber)).toBe(true);
  });

  it("quotes the scene number and title so a finding can be checked", () => {
    const scene = CANON.scenes.find((s) => s.id === "scene-demo-1")!;
    const prop = factsFromScene(scene).find((f) => f.key === "prop:the-compass")!;

    expect(prop.value).toContain(`Scene ${scene.sceneNumber}`);
    expect(prop.value).toContain(scene.title);
  });

  it("skips scenes whose number could not be a lockedInScene", () => {
    const bad = { ...CANON.scenes[0], sceneNumber: 0 } as Scene;
    expect(factsFromScene(bad)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Context building — the C2 regression guard
// ---------------------------------------------------------------------------

describe("buildMergeContext", () => {
  it("sends real facts, not empty arrays", () => {
    const ctx = buildMergeContext(TUNNEL, CANON);

    // The bug this test exists for: canonFacts: [] / branchFacts: [] rendered
    // as "(none)" in the prompt, leaving the assistant nothing to reason about.
    expect(ctx.canonFacts.length).toBeGreaterThan(0);
    expect(ctx.branchFacts.length).toBeGreaterThan(0);
  });

  it("produces a body the route will accept", () => {
    expect(CanonContextSchema.safeParse(buildMergeContext(TUNNEL, CANON)).success).toBe(
      true,
    );
  });

  it("surfaces the branch/canon disagreement the merge is about", () => {
    const contradictions = findContradictions(buildMergeContext(TUNNEL, CANON));
    expect(contradictions.length).toBeGreaterThan(0);
  });

  it("names the branch being previewed and its added scenes", () => {
    const ctx = buildMergeContext(TUNNEL, CANON);

    expect(ctx.branchName).toBe(TUNNEL.name);
    expect(ctx.sceneHistory).toContain(`[branch] ${TUNNEL.scenes[0].title}`);
  });

  it("says so plainly when no character sheet is locked", () => {
    const ctx = buildMergeContext(TUNNEL, CANON);

    expect(ctx.characterSummary).toMatch(/no character sheet is locked/i);
    expect(ctx.characterSummary).toContain("Kael");
  });

  it("uses the locked character description when one is supplied", () => {
    const ctx = buildMergeContext(TUNNEL, CANON, "Kael — patched grey-green pressure suit.");
    expect(ctx.characterSummary).toBe("Kael — patched grey-green pressure suit.");
  });
});

// ---------------------------------------------------------------------------
// Transport — provenance must survive the round trip
// ---------------------------------------------------------------------------

function respond(body: unknown, headers: Record<string, string> = {}) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify(body), { status: 200, headers }),
    ),
  );
}

describe("callMergeAssistant", () => {
  const ctx = buildMergeContext(TUNNEL, CANON);

  it("reports a real model call as not mocked", async () => {
    respond(mockMergeAssistantFor(ctx), { [AI_SOURCE_HEADER]: "watsonx" });

    const result = await callMergeAssistant(ctx);
    expect(result.ok && result.isMock).toBe(false);
  });

  it("reports the deterministic fallback as mocked", async () => {
    respond(mockMergeAssistantFor(ctx), { [AI_SOURCE_HEADER]: "mock" });

    const result = await callMergeAssistant(ctx);
    expect(result.ok && result.isMock).toBe(true);
  });

  it("treats a response with no provenance header as mocked", async () => {
    // A 200 that cannot prove a model was called must not be presented as one.
    respond(mockMergeAssistantFor(ctx));

    const result = await callMergeAssistant(ctx);
    expect(result.ok && result.isMock).toBe(true);
  });

  it("never reports ok for a body that fails the schema", async () => {
    respond({ branchName: "x" });

    const result = await callMergeAssistant(ctx);
    expect(result.ok).toBe(false);
  });
});
