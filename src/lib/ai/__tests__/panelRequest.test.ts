/**
 * src/lib/ai/__tests__/panelRequest.test.ts
 *
 * Unit tests for buildPanelRequest and getPanelFallback.
 * No I/O — pure function tests.
 */

import { describe, it, expect } from "vitest";
import { buildPanelRequest, getPanelFallback } from "../panelRequest";
import type { BuildPanelRequestInput } from "../panelRequest";

const DEMO_CTX = {
  projectId: "demo-1",
  branchName: "feature/save-the-stranger",
  canonFacts: [
    {
      key: "compass_state",
      value: "lost in Scene 4 – given to The Ferryman",
      lockedInScene: 4,
    },
  ],
  branchFacts: [],
  sceneHistory: [
    "The Surface Breaks",
    "The Market Beneath",
    "The Lighthouse Signal",
    "Below the Archive",
    "The Choice at the Gate",
  ],
  characterSummary:
    "Kael — explorer, mid-30s, worn leather coat. Empty belt holster.",
};

const DEMO_INPUT: BuildPanelRequestInput = {
  projectId: "demo-1",
  sceneId: "scene-demo-5",
  sceneDescription:
    "Kael stands at the flood gate controls in knee-deep water, expression resolute.",
  styleInstruction:
    "Graphic novel, high-contrast ink lines, muted blues and earth tones.",
  ctx: DEMO_CTX,
};

// ---------------------------------------------------------------------------
// buildPanelRequest
// ---------------------------------------------------------------------------

describe("buildPanelRequest", () => {
  it("returns a validated PanelGenerationRequest", () => {
    const req = buildPanelRequest(DEMO_INPUT);
    expect(req.projectId).toBe("demo-1");
    expect(req.sceneId).toBe("scene-demo-5");
    expect(req.useFallback).toBe(false);
  });

  it("sets lockedCharacterDescription from ctx.characterSummary", () => {
    const req = buildPanelRequest(DEMO_INPUT);
    expect(req.lockedCharacterDescription).toBe(DEMO_CTX.characterSummary);
  });

  it("includes canonFacts from the context", () => {
    const req = buildPanelRequest(DEMO_INPUT);
    expect(req.canonFacts).toHaveLength(1);
    expect(req.canonFacts[0].key).toBe("compass_state");
  });

  it("throws when sceneId is empty", () => {
    expect(() =>
      buildPanelRequest({ ...DEMO_INPUT, sceneId: "" })
    ).toThrow();
  });

  it("throws when sceneDescription is empty", () => {
    expect(() =>
      buildPanelRequest({ ...DEMO_INPUT, sceneDescription: "" })
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// getPanelFallback
// ---------------------------------------------------------------------------

describe("getPanelFallback", () => {
  it("returns an assetUrl string", () => {
    const result = getPanelFallback(DEMO_INPUT);
    expect(typeof result.assetUrl).toBe("string");
    expect(result.assetUrl.length).toBeGreaterThan(0);
  });

  it("request in fallback has useFallback=true", () => {
    const result = getPanelFallback(DEMO_INPUT);
    expect(result.request.useFallback).toBe(true);
  });

  it("request in fallback carries the same context as buildPanelRequest", () => {
    const fallback = getPanelFallback(DEMO_INPUT);
    const real = buildPanelRequest(DEMO_INPUT);

    expect(fallback.request.projectId).toBe(real.projectId);
    expect(fallback.request.sceneId).toBe(real.sceneId);
    expect(fallback.request.lockedCharacterDescription).toBe(
      real.lockedCharacterDescription
    );
    expect(fallback.request.canonFacts).toEqual(real.canonFacts);
    expect(fallback.request.sceneDescription).toBe(real.sceneDescription);
    expect(fallback.request.styleInstruction).toBe(real.styleInstruction);
  });
});
