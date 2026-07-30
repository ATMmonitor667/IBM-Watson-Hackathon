import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BranchDiffView } from "@/components/review/BranchDiffView";
import { DEMO_BRANCHES } from "@/lib/mock/demoBranches";
import type { Branch, Scene } from "@/types/workspace";

const canon = DEMO_BRANCHES.find((branch) => branch.isCanon)!;
const alternate = DEMO_BRANCHES.find((branch) => !branch.isCanon)!;

function addedBranch(): Branch {
  const extraScene: Scene = {
    ...alternate.scenes[1],
    id: "scene-added",
    sceneNumber: 8,
    order: 3,
    title: "The New Exit",
  };

  return {
    ...alternate,
    scenes: [...alternate.scenes, extraScene],
  };
}

describe("BranchDiffView", () => {
  it("renders a summary and per-scene statuses", () => {
    render(<BranchDiffView canonBranch={canon} branch={alternate} />);

    expect(
      screen.getByText("Comparing Canon with The Tunnel Route"),
    ).toBeInTheDocument();

    const summary = screen.getByLabelText("Diff summary");
    expect(within(summary).getByText("Unchanged")).toBeInTheDocument();
    expect(within(summary).getAllByText("2")).toHaveLength(2);
    expect(within(summary).getByText("Changed")).toBeInTheDocument();
    expect(within(summary).getByText("Added")).toBeInTheDocument();
    expect(within(summary).getByText("0")).toBeInTheDocument();

    expect(screen.getAllByText("Changed")).toHaveLength(3);
    expect(screen.getAllByText("Unchanged")).toHaveLength(3);
  });

  it("shows required field-level before and after values", () => {
    render(<BranchDiffView canonBranch={canon} branch={alternate} />);

    const firstChangedScene = screen.getByLabelText("The Hidden Tunnel: Changed");
    const fieldChanges = within(firstChangedScene).getByLabelText(
      "Changed fields for The Hidden Tunnel",
    );

    expect(within(fieldChanges).getByText("Dialogue")).toBeInTheDocument();
    expect(within(fieldChanges).getByText("Props")).toBeInTheDocument();
    expect(within(fieldChanges).getByText("Action")).toBeInTheDocument();
    expect(within(fieldChanges).getByText("Emotional beat")).toBeInTheDocument();
    expect(within(fieldChanges).getByText(/Aqueduct map/)).toBeInTheDocument();
  });

  it("announces an added scene and its missing canon counterpart", () => {
    const branch = addedBranch();
    render(
      <BranchDiffView
        canonBranch={{ ...canon, scenes: canon.scenes.slice(0, 4) }}
        branch={branch}
      />,
    );

    const added = screen.getByLabelText("The New Exit: Added");
    expect(within(added).getByText("Added")).toBeInTheDocument();
    expect(
      within(added).getByText("This scene does not exist in canon."),
    ).toBeInTheDocument();
    expect(within(added).getByText("Field changes")).toBeInTheDocument();
  });
});
