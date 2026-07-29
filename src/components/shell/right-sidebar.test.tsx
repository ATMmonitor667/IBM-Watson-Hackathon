import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { RightSidebar } from "@/components/shell/right-sidebar";
import { withRuleReviews } from "@/lib/ai/continuity";
import { getWorkspaceSnapshot, type WorkspaceSnapshot } from "@/lib/db/queries";
import {
  CANON_BRANCH_ID,
  PROJECT,
  WHATIF_BRANCH_ID,
} from "@/lib/demo/fixtures";
import { CANVAS_TAB, useWorkspace } from "@/lib/store/workspace";
import { WorkspaceDataProvider } from "@/lib/store/workspace-data";

/**
 * An integration test across the seam that matters: fixtures -> queries ->
 * rule engine -> provider -> the canon panel. Each of those has its own unit
 * test; this asserts they add up to the contradiction actually being visible
 * to a human, which is the only version of "it works" the demo cares about.
 */
async function snapshot(): Promise<WorkspaceSnapshot> {
  const stored = await getWorkspaceSnapshot(PROJECT.id);
  if (!stored) throw new Error("expected a snapshot");
  return withRuleReviews(stored);
}

function renderPanel(data: WorkspaceSnapshot) {
  return render(
    <WorkspaceDataProvider snapshot={data}>
      <RightSidebar />
    </WorkspaceDataProvider>,
  );
}

describe("the canon panel", () => {
  beforeEach(() => {
    useWorkspace.setState({
      activeBranchId: null,
      selectedSceneId: null,
      tabs: [CANVAS_TAB],
      activeTabId: CANVAS_TAB.id,
    });
  });

  it("shows the computed contradiction on the what-if timeline's S4", async () => {
    const data = await snapshot();
    useWorkspace.setState({
      activeBranchId: WHATIF_BRANCH_ID,
      selectedSceneId: "scene-wf-s4",
    });

    renderPanel(data);

    expect(
      screen.getByText(/cannot be in two places at once/),
    ).toBeInTheDocument();
    // The "AI proposes, human disposes" label is a judged criterion.
    expect(screen.getByText(/AI proposal — not applied/)).toBeInTheDocument();
    expect(screen.getByText(/source: rule/)).toBeInTheDocument();
  });

  it("reports a clean scene as clean", async () => {
    const data = await snapshot();
    useWorkspace.setState({
      activeBranchId: WHATIF_BRANCH_ID,
      selectedSceneId: "scene-wf-s5",
    });

    renderPanel(data);

    expect(screen.getByText(/No contradictions/)).toBeInTheDocument();
  });

  it("reports canon as clean", async () => {
    const data = await snapshot();
    useWorkspace.setState({
      activeBranchId: CANON_BRANCH_ID,
      selectedSceneId: "scene-main-s3",
    });

    renderPanel(data);

    expect(screen.getByText(/No contradictions/)).toBeInTheDocument();
  });

  it("shows the selected scene's structured properties", async () => {
    const data = await snapshot();
    useWorkspace.setState({
      activeBranchId: WHATIF_BRANCH_ID,
      selectedSceneId: "scene-wf-s3",
    });

    renderPanel(data);

    expect(screen.getByText("props")).toBeInTheDocument();
    expect(screen.getByText("rope, lantern")).toBeInTheDocument();
    expect(screen.getByText("Wren, The stranger")).toBeInTheDocument();
  });

  it("marks a branch-only fact as scoped to this timeline", async () => {
    const data = await snapshot();
    useWorkspace.setState({
      activeBranchId: WHATIF_BRANCH_ID,
      selectedSceneId: "scene-wf-s4",
    });

    renderPanel(data);

    expect(screen.getAllByText(/this timeline only/).length).toBeGreaterThan(0);
  });

  it("surfaces the locked character reference with its version", async () => {
    const data = await snapshot();
    renderPanel(data);

    // "Wren" also appears in the selected scene's cast, so scope the query to
    // the Locked designs list rather than searching the whole panel.
    const locked = screen.getByText("Locked designs").closest("section");
    expect(locked).not.toBeNull();

    const entry = within(locked!).getByRole("listitem");
    expect(entry).toHaveTextContent("Wren");
    expect(entry).toHaveTextContent("v2");
  });
});
