import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  PanelGenerationPreview,
  SceneDetailPanel,
} from "@/components/workspace/BranchPanels";
import type { PanelGenerationResult } from "@/lib/ai/panelRequest";
import { DEMO_BRANCHES } from "@/lib/mock/demoBranches";
import { DEMO_SCENES } from "@/lib/mock/demoScenes";
import { useSceneStore } from "@/store/sceneStore";

const RESULT: PanelGenerationResult = {
  assetUrl: "/demo/panel-kael-scene5-fallback.png",
  isFallback: true,
  request: {
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
  },
};

describe("PanelGenerationPreview", () => {
  beforeEach(() => {
    useSceneStore.setState({ selectedSceneId: null });
    vi.unstubAllGlobals();
  });

  it("labels the artwork honestly as a prepared fallback", () => {
    render(
      <PanelGenerationPreview
        result={RESULT}
        sceneTitle="The Choice at the Gate"
      />,
    );

    expect(
      screen.getByText("Demo preview — AI model not called"),
    ).toBeInTheDocument();
    expect(
      screen.getByAltText(
        "Prepared demo panel for scene: The Choice at the Gate",
      ),
    ).toHaveAttribute("src", RESULT.assetUrl);
    expect(screen.getByText(/does not call a live image model/i)).toBeInTheDocument();
    expect(
      screen.getByRole("complementary", {
        name: "Demo preview — AI model not called",
      }),
    ).toBeInTheDocument();
  });

  it("shows every meaningful field in the assembled request", () => {
    render(
      <PanelGenerationPreview
        result={RESULT}
        sceneTitle="The Choice at the Gate"
      />,
    );

    expect(
      screen.getByText(RESULT.request.lockedCharacterDescription),
    ).toBeInTheDocument();
    expect(screen.getByText("compass_position")).toBeInTheDocument();
    expect(
      screen.getAllByText("short chain at the left hip", { exact: false }),
    ).not.toHaveLength(0);
    expect(screen.getByText(RESULT.request.sceneDescription)).toBeInTheDocument();
    expect(screen.getByText(RESULT.request.styleInstruction)).toBeInTheDocument();
    expect(screen.getByText(RESULT.request.projectId)).toBeInTheDocument();
    expect(screen.getByText(RESULT.request.sceneId)).toBeInTheDocument();
    expect(screen.getByText("Yes")).toBeInTheDocument();
  });

  it("includes the complete machine-readable request", () => {
    const { container } = render(
      <PanelGenerationPreview
        result={RESULT}
        sceneTitle="The Choice at the Gate"
      />,
    );

    const json = container.querySelector("pre");
    expect(json).not.toBeNull();
    expect(JSON.parse(json?.textContent ?? "")).toEqual(RESULT.request);
  });

  it("assembles canon context before requesting a prepared panel", async () => {
    const user = userEvent.setup();
    let sentBody: PanelGenerationResult["request"] | undefined;
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        sentBody = JSON.parse(String(init?.body)) as PanelGenerationResult["request"];
        return new Response(
          JSON.stringify({
            assetUrl: RESULT.assetUrl,
            request: { ...sentBody, useFallback: true },
            isFallback: true,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      },
    );
    vi.stubGlobal("fetch", fetchMock);
    useSceneStore.setState({ selectedSceneId: "scene-demo-5" });

    render(<SceneDetailPanel scenes={DEMO_SCENES} branches={DEMO_BRANCHES} />);
    await user.click(screen.getByRole("button", { name: "Prepare panel" }));

    expect(
      await screen.findByText("Demo preview — AI model not called"),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(sentBody?.lockedCharacterDescription).toContain("Kael");
    expect(sentBody?.canonFacts).not.toHaveLength(0);
    expect(sentBody?.canonFacts).toContainEqual({
      key: "scene_5_location",
      value: "Northern Flood Gate",
      lockedInScene: 5,
    });
    expect(
      screen.getAllByText("Northern Flood Gate", { exact: false }),
    ).not.toHaveLength(0);
  });
});
