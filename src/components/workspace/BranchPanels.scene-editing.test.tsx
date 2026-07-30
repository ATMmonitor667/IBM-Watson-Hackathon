import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SceneDetailPanel } from "@/components/workspace/BranchPanels";
import { DEMO_BRANCHES } from "@/lib/mock/demoBranches";
import { useSceneStore } from "@/store/sceneStore";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
  },
}));

const canon = DEMO_BRANCHES.find((branch) => branch.isCanon)!;
const alternate = DEMO_BRANCHES.find((branch) => !branch.isCanon)!;

beforeEach(() => {
  useSceneStore.setState({ selectedSceneId: null });
});

describe("SceneDetailPanel editing", () => {
  it("edits alternate scenes and shows immutable revision history", async () => {
    const user = userEvent.setup();
    const onSceneEdited = vi.fn().mockResolvedValue(undefined);
    const scene = {
      ...alternate.scenes[0],
      title: "Current Tunnel",
      revision: 2,
    };
    const branches = DEMO_BRANCHES.map((branch) =>
      branch.id === alternate.id ? { ...branch, scenes: [scene] } : branch,
    );
    useSceneStore.setState({ selectedSceneId: scene.id });

    render(
      <SceneDetailPanel
        scenes={[]}
        branches={branches}
        revisions={[
          {
            id: "revision-1",
            sceneId: scene.id,
            projectId: scene.projectId,
            branchId: alternate.id,
            revision: 1,
            title: "Original Tunnel",
            location: scene.location,
            dialogueExcerpt: scene.dialogueExcerpt,
            characters: scene.characters,
            emotionalBeat: scene.emotionalBeat,
            contributor: scene.contributor,
            createdAt: scene.createdAt,
          },
        ]}
        onSceneEdited={onSceneEdited}
      />,
    );

    expect(screen.getByText("Rev 2 · Current")).toBeInTheDocument();
    expect(screen.getByText("Original Tunnel · Theo Park")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Edit scene" }));
    const title = screen.getByLabelText(/Title/);
    await user.clear(title);
    await user.type(title, "The Revised Tunnel");
    await user.click(
      screen.getByRole("button", { name: "Save revision 3" }),
    );

    expect(onSceneEdited).toHaveBeenCalledWith(
      alternate.id,
      expect.objectContaining({
        id: scene.id,
        title: "The Revised Tunnel",
        revision: 3,
      }),
    );
  });

  it("does not offer direct editing for canon scenes", () => {
    useSceneStore.setState({ selectedSceneId: canon.scenes[0].id });

    render(
      <SceneDetailPanel
        scenes={canon.scenes}
        branches={DEMO_BRANCHES}
        revisions={[]}
        onSceneEdited={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Edit scene" }),
    ).not.toBeInTheDocument();
  });
});
