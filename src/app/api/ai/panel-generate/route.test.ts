import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PanelGenerationResultSchema } from "@/lib/ai/panelRequest";
import { GET, POST } from "./route";

const VALID_REQUEST = {
  projectId: "demo-1",
  sceneId: "scene-demo-5",
  lockedCharacterDescription:
    "Kael — explorer in a patched pressure suit; compass at his left hip.",
  canonFacts: [
    {
      key: "compass_position",
      value: "short chain at the left hip",
      lockedInScene: 2,
    },
  ],
  sceneDescription: "Kael waits at the northern flood gate.",
  styleInstruction: "Graphic novel with muted blues and high-contrast ink.",
  useFallback: true,
};

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/ai/panel-generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/ai/panel-generate", () => {
  it("returns prepared artwork and the complete validated request", async () => {
    const response = await POST(makeRequest(VALID_REQUEST));
    const body = PanelGenerationResultSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(body.isFallback).toBe(true);
    expect(body.assetUrl).toBe("/demo/panel-kael-scene5-fallback.png");
    expect(body.request).toEqual(VALID_REQUEST);
  });

  it("uses the honest fallback in mock mode even without an explicit request", async () => {
    vi.stubEnv("AI_MOCK", "true");

    const response = await POST(
      makeRequest({ ...VALID_REQUEST, useFallback: false }),
    );
    const body = PanelGenerationResultSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(body.isFallback).toBe(true);
    expect(body.request.useFallback).toBe(true);
  });

  it("rejects an incomplete request", async () => {
    const response = await POST(
      makeRequest({ ...VALID_REQUEST, lockedCharacterDescription: "" }),
    );

    expect(response.status).toBe(400);
  });
});

describe("GET /api/ai/panel-generate", () => {
  it("is not allowed", async () => {
    const response = await GET();

    expect(response.status).toBe(405);
  });
});
