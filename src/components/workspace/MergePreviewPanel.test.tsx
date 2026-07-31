/**
 * src/components/workspace/MergePreviewPanel.test.tsx
 *
 * The display path for issue #6 / D5.
 *
 * The route's tests prove the assistant answers; the client's tests prove it is
 * asked a grounded question. This proves the answer reaches a human intact —
 * all four things the acceptance criteria name (branch summary, compatible
 * changes, true conflicts, 2–3 strategies WITH trade-offs) — and, just as
 * importantly, that seeing them changes nothing until the human says so.
 */

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

import { MergePreviewPanel } from "@/components/workspace/BranchPanels";
import { buildMergeContext, AI_SOURCE_HEADER } from "@/lib/ai/mergeAssistantClient";
import { mockMergeAssistantFor } from "@/lib/ai/mocks";
import { DEMO_BRANCHES } from "@/lib/mock/demoBranches";
import { useUiStore } from "@/store/uiStore";

const CANON = DEMO_BRANCHES.find((b) => b.isCanon)!;
const TUNNEL = DEMO_BRANCHES.find((b) => !b.isCanon)!;

/** What the route would return for this branch when watsonx is unavailable. */
const FALLBACK = mockMergeAssistantFor(buildMergeContext(TUNNEL, CANON));

function stubRoute(source: string | null = "mock", body: unknown = FALLBACK) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify(body), {
        status: 200,
        headers: source ? { [AI_SOURCE_HEADER]: source } : {},
      }),
    ),
  );
}

async function openPreview() {
  const onMergeBranch = vi.fn();
  render(<MergePreviewPanel branches={DEMO_BRANCHES} onMergeBranch={onMergeBranch} />);
  await userEvent.click(screen.getByRole("button", { name: /preview merge/i }));
  await screen.findByText(/branch summary/i);
  return onMergeBranch;
}

beforeEach(() => {
  useUiStore.setState({ openPanelId: "merge-preview", mergeBranchId: TUNNEL.id });
  stubRoute();
});

afterEach(() => {
  vi.unstubAllGlobals();
  useUiStore.setState({ openPanelId: null, mergeBranchId: null });
});

// ---------------------------------------------------------------------------
// The four things the acceptance criteria name
// ---------------------------------------------------------------------------

describe("MergePreviewPanel renders the merge preview", () => {
  it("shows the branch summary", async () => {
    await openPreview();
    expect(screen.getByText(FALLBACK.branchSummary)).toBeInTheDocument();
  });

  it("shows compatible changes and true conflicts as labelled sections", async () => {
    await openPreview();

    // Rendered even when a list is empty — a missing section reads as
    // "not checked", which is a different claim from "none found".
    expect(screen.getByText(/^compatible changes \(/i)).toBeInTheDocument();
    expect(screen.getByText(/^true conflicts \(/i)).toBeInTheDocument();
    expect(screen.getByText(FALLBACK.trueConflicts[0])).toBeInTheDocument();
  });

  it("offers 2–3 strategies, each with its trade-offs", async () => {
    await openPreview();

    const group = within(screen.getByRole("radiogroup"));
    const options = group.getAllByRole("radio");
    expect(options.length).toBe(FALLBACK.strategies.length);
    expect(options.length).toBeGreaterThanOrEqual(2);
    expect(options.length).toBeLessThanOrEqual(3);

    for (const strategy of FALLBACK.strategies) {
      expect(group.getByText(strategy.label)).toBeInTheDocument();
      expect(group.getByText(strategy.description)).toBeInTheDocument();
      expect(group.getByText(strategy.tradeoffs)).toBeInTheDocument();
    }
  });

  it("lets the human change which strategy is selected", async () => {
    await openPreview();

    const options = screen.getAllByRole("radio");
    expect(options[0]).toBeChecked();

    await userEvent.click(options[1]);
    expect(options[1]).toBeChecked();
    expect(options[0]).not.toBeChecked();
  });
});

// ---------------------------------------------------------------------------
// previewOnly — the graded human-in-the-loop constraint
// ---------------------------------------------------------------------------

describe("MergePreviewPanel never merges on its own", () => {
  it("labels the strategies as proposals that have not been applied", async () => {
    await openPreview();
    expect(screen.getByText(/proposal — not applied/i)).toBeInTheDocument();
  });

  it("does not touch branch state while the preview is on screen", async () => {
    const onMergeBranch = await openPreview();
    expect(onMergeBranch).not.toHaveBeenCalled();
  });

  it("merges only when the human confirms", async () => {
    const onMergeBranch = await openPreview();

    await userEvent.click(screen.getByRole("button", { name: /confirm merge/i }));
    await waitFor(() => expect(onMergeBranch).toHaveBeenCalledWith(TUNNEL.id));
  });
});

// ---------------------------------------------------------------------------
// Provenance — a fallback must not pass for a model call
// ---------------------------------------------------------------------------

describe("MergePreviewPanel says where the preview came from", () => {
  it("marks a deterministic fallback as such", async () => {
    await openPreview();
    expect(screen.getByText(/AI model not called/i)).toBeInTheDocument();
  });

  it("credits watsonx when a model actually answered", async () => {
    stubRoute("watsonx");
    await openPreview();

    expect(screen.getByText(/watsonx\.ai/i)).toBeInTheDocument();
    expect(screen.queryByText(/AI model not called/i)).not.toBeInTheDocument();
  });
});
