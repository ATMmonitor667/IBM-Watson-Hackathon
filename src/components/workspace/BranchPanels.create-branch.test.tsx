import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CreateBranchPanel } from "@/components/workspace/BranchPanels";
import { useSceneStore } from "@/store/sceneStore";
import { useUiStore } from "@/store/uiStore";
import type { Branch, Scene } from "@/types/workspace";

const { toast } = vi.hoisted(() => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("sonner", () => ({ toast }));

const baseScene: Scene = {
  id: "scene-2",
  projectId: "project-1",
  sceneNumber: 2,
  title: "The Broken Causeway",
  location: "Eastern Causeway",
  dialogueExcerpt: "The route ends here.",
  characters: ["Wren"],
  emotionalBeat: "Tension",
  reviewStatus: "Approved",
  contributor: { id: "user-1", displayName: "Rahat" },
  revision: 2,
  status: "canon",
  order: 2,
  parentId: "scene-1",
  createdAt: "2026-07-30T12:00:00.000Z",
  updatedAt: "2026-07-30T12:00:00.000Z",
};

const savedBranch: Branch = {
  id: "1d3b8919-d03e-42cc-bc54-252820ad2782",
  projectId: "project-1",
  name: "The Rooftop Route",
  sourceSceneId: "scene-2",
  scenes: [],
  isCanon: false,
  createdAt: "2026-07-30T14:00:00.000Z",
  updatedAt: "2026-07-30T14:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  useSceneStore.setState({ selectedSceneId: baseScene.id });
  useUiStore.setState({
    openPanelId: "create-branch",
    mergeBranchId: null,
  });
});

describe("CreateBranchPanel", () => {
  it("closes and announces success only after the saved branch returns", async () => {
    const onBranchCreated = vi.fn().mockResolvedValue(savedBranch);

    render(
      <CreateBranchPanel
        scenes={[baseScene]}
        onBranchCreated={onBranchCreated}
      />,
    );

    fireEvent.change(
      screen.getByRole("textbox", { name: /branch name/i }),
      { target: { value: "The Rooftop Route" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(onBranchCreated).toHaveBeenCalledTimes(1);
      expect(useUiStore.getState().openPanelId).toBeNull();
    });
    expect(onBranchCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "project-1",
        name: "The Rooftop Route",
        sourceSceneId: "scene-2",
        isCanon: false,
      }),
    );
    expect(toast.success).toHaveBeenCalledWith(
      'Branch "The Rooftop Route" created',
      expect.any(Object),
    );
  });

  it("keeps the panel open and displays a save failure", async () => {
    const onBranchCreated = vi
      .fn()
      .mockRejectedValue(new Error("Branch could not be saved: policy denied"));

    render(
      <CreateBranchPanel
        scenes={[baseScene]}
        onBranchCreated={onBranchCreated}
      />,
    );

    fireEvent.change(
      screen.getByRole("textbox", { name: /branch name/i }),
      { target: { value: "The Rooftop Route" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent("Branch could not be saved: policy denied");
    expect(useUiStore.getState().openPanelId).toBe("create-branch");
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(
      "Branch was not created",
      expect.objectContaining({
        description: "Branch could not be saved: policy denied",
      }),
    );
  });
});
