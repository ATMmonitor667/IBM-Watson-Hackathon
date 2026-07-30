import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MergePreviewPanel } from "@/components/workspace/BranchPanels";
import type { MergeAssistantResponse } from "@/lib/ai/schemas";
import { DEMO_BRANCHES } from "@/lib/mock/demoBranches";
import { useUiStore } from "@/store/uiStore";

const { callMergeAssistant, toastSuccess } = vi.hoisted(() => ({
  callMergeAssistant: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("@/lib/ai/mergeAssistantClient", () => ({
  callMergeAssistant,
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccess,
  },
}));

const mergeResponse: MergeAssistantResponse = {
  branchName: "The Tunnel Route",
  branchSummary: "Two branch scenes differ from canon.",
  compatibleChanges: ["The tunnel route can replace the lighthouse route."],
  trueConflicts: ["The Archivist is not established in canon."],
  strategies: [
    {
      id: "safe",
      label: "Safe merge",
      description: "Merge the compatible scene only.",
      tradeoffs: "Leaves the conflicting scene in the branch.",
      includedSceneIds: ["scene-alt-2a"],
    },
    {
      id: "full",
      label: "Full merge",
      description: "Merge both scenes.",
      tradeoffs: "Requires resolving the new character.",
      includedSceneIds: ["scene-alt-2a", "scene-alt-2b"],
    },
  ],
  previewOnly: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  callMergeAssistant.mockResolvedValue({
    ok: true,
    data: mergeResponse,
  });
  useUiStore.setState({
    openPanelId: "merge-preview",
    mergeBranchId: "branch-tunnel",
  });
});

describe("MergePreviewPanel selective scene merge", () => {
  it("merges only checked scenes and confirms the exact canon changes", async () => {
    const user = userEvent.setup();
    const onMergeBranch = vi.fn().mockResolvedValue(undefined);

    render(
      <MergePreviewPanel
        branches={DEMO_BRANCHES}
        onMergeBranch={onMergeBranch}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Preview merge" }));

    const firstScene = await screen.findByRole("checkbox", {
      name: /Select Replace canon Scene #3 .*The Lighthouse Signal.*The Hidden Tunnel/,
    });
    const secondScene = screen.getByRole("checkbox", {
      name: /Select Replace canon Scene #4 .*Below the Archive.*The Drowned Engine Room/,
    });
    const confirmChanges = screen.getByLabelText("Canon changes to apply");

    expect(
      screen.getByRole("button", { name: "Merge 0 scenes" }),
    ).toBeDisabled();
    expect(within(confirmChanges).getByText("Nothing selected. Canon will not change."))
      .toBeInTheDocument();

    await user.click(firstScene);

    expect(firstScene).toBeChecked();
    expect(secondScene).not.toBeChecked();
    expect(
      within(confirmChanges).getByText(
        'Replace canon Scene #3 "The Lighthouse Signal" with "The Hidden Tunnel"',
      ),
    ).toBeInTheDocument();
    expect(
      within(confirmChanges).queryByText(
        'Replace canon Scene #4 "Below the Archive" with "The Drowned Engine Room"',
      ),
    ).not.toBeInTheDocument();
    expect(
      within(confirmChanges).getByText(
        /Location:\s+Old Harbour Lighthouse\s+to Underground Aqueduct/,
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Merge 1 scene" }));

    expect(onMergeBranch).toHaveBeenCalledTimes(1);
    expect(onMergeBranch).toHaveBeenCalledWith("branch-tunnel", [
      "scene-alt-2a",
    ]);
    expect(toastSuccess).toHaveBeenCalledWith(
      "1 selected scene(s) merged",
      expect.objectContaining({
        description: "Only the checked scenes changed canon.",
      }),
    );
  });
});
