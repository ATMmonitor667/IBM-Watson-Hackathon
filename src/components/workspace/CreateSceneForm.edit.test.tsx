import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CreateSceneForm } from "@/components/workspace/CreateSceneForm";
import { DEMO_BRANCHES } from "@/lib/mock/demoBranches";

const original = DEMO_BRANCHES.find((branch) => !branch.isCanon)!.scenes[0];

describe("CreateSceneForm editing", () => {
  it("prefills a branch scene and submits a new revision", async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn().mockResolvedValue(undefined);

    render(
      <CreateSceneForm
        projectId={original.projectId}
        nextSceneNumber={original.sceneNumber}
        initialScene={original}
        onSaved={onSaved}
        onCancel={vi.fn()}
      />,
    );

    const title = screen.getByLabelText(/Title/);
    expect(title).toHaveValue(original.title);
    expect(screen.getByLabelText(/Characters/)).toHaveValue("Kael, Mira");

    await user.clear(title);
    await user.type(title, "The Safer Tunnel");
    await user.click(
      screen.getByRole("button", { name: "Save revision 2" }),
    );

    expect(onSaved).toHaveBeenCalledWith(
      expect.objectContaining({
        id: original.id,
        title: "The Safer Tunnel",
        revision: 2,
        reviewStatus: "Draft",
      }),
    );
    expect(original.title).toBe("The Hidden Tunnel");
  });
});
