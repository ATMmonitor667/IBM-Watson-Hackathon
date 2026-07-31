import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ContinuityReviewPanel } from "@/components/review/ContinuityReviewPanel";
import { DEMO_BRANCHES } from "@/lib/mock/demoBranches";
import { buildBranchReview } from "@/lib/review/branchReview";
import type { BranchReview } from "@/types/review";

/**
 * THE ACCEPTANCE CRITERION FOR ISSUE #12 / D4, ASSERTED DIRECTLY.
 *
 *   "A reviewer opens a branch, runs a canon review, and sees each finding with
 *    evidence, the fact it breaks, and a suggested fix — each labelled an AI
 *    proposal that has not been applied."
 *
 * Every review below is built by buildBranchReview() over the real demo
 * branches, so these are the findings the rule engine actually computes. If the
 * engine stops producing them, or the surface stops rendering one of the four
 * required elements, this file fails.
 *
 * The negative assertions carry as much weight as the positive ones: that
 * accepting a finding changes nothing, and that a clean branch never reads like
 * an unchecked one.
 */

const TUNNEL = DEMO_BRANCHES.find((b) => b.id === "branch-tunnel")!;
const CANON = DEMO_BRANCHES.find((b) => b.isCanon)!;

const SCENE_TITLES: Record<string, string> = Object.fromEntries(
  DEMO_BRANCHES.flatMap((branch) =>
    branch.scenes.map((scene) => [scene.id, `#${scene.sceneNumber} — ${scene.title}`]),
  ),
);

function tunnelReview(): BranchReview {
  return buildBranchReview(TUNNEL, DEMO_BRANCHES);
}

/** The compass finding — the demo's headline contradiction. */
function compassCard() {
  return screen.getByRole("article", { name: /The Compass is used after it leaves/ });
}

function renderReady(review: BranchReview, extra: Record<string, unknown> = {}) {
  return render(
    <ContinuityReviewPanel
      review={review}
      isLoading={false}
      error={null}
      sceneTitleById={SCENE_TITLES}
      {...extra}
    />,
  );
}

describe("each finding carries the four things a reviewer needs", () => {
  it("shows the severity and the scene the finding is about", () => {
    renderReady(tunnelReview());
    const card = compassCard();

    expect(within(card).getByText("High severity")).toBeInTheDocument();
    expect(
      within(card).getByText("#7 — The Drowned Engine Room"),
    ).toBeInTheDocument();
  });

  it("quotes the evidence as concrete field values, not prose", () => {
    renderReady(tunnelReview());
    const evidence = within(compassCard()).getByLabelText("Evidence");

    // Field values a reviewer can open the scene and check, one per list item.
    expect(
      within(evidence).getByText(/propsUsed: \[The Compass, Engine controls\]/),
    ).toBeInTheDocument();
    expect(within(evidence).getByText(/aqueduct current/)).toBeInTheDocument();
    expect(within(evidence).getAllByRole("listitem").length).toBeGreaterThan(1);
  });

  it("names the canon fact the scene breaks, and where it was established", () => {
    renderReady(tunnelReview());
    const broken = within(compassCard()).getByLabelText("Breaks canon fact");

    expect(within(broken).getByText(/The Compass left this timeline/)).toBeInTheDocument();
    expect(
      within(broken).getByText(/Established in Scene 6 — The Hidden Tunnel/),
    ).toBeInTheDocument();
  });

  it("offers a suggested fix", () => {
    renderReady(tunnelReview());
    const fix = within(compassCard()).getByLabelText("Suggested fix");

    expect(within(fix).getByText(/Remove The Compass/)).toBeInTheDocument();
  });

  it("labels every finding an AI proposal that has not been applied", () => {
    const review = tunnelReview();
    renderReady(review);

    // One label per finding — a reviewer scrolling a list is never more than
    // one card away from it.
    expect(screen.getAllByText(/AI proposal — not applied/)).toHaveLength(
      review.findings.length,
    );
    expect(
      screen.getByLabelText("AI-generated — requires human review"),
    ).toBeInTheDocument();
  });

  it("says which half of the system produced the finding", () => {
    renderReady(tunnelReview());
    const card = compassCard();

    // The provenance split is the differentiator: a judge can see the finding
    // was computed, not hallucinated.
    expect(within(card).getByText(/Rule engine: Prop possession/)).toBeInTheDocument();
    expect(within(card).getByText(/computed deterministically by rule/)).toBeInTheDocument();
    expect(within(card).getByText("prop_without_holder")).toBeInTheDocument();
  });

  it("renders one list item per finding, in severity order", () => {
    const review = tunnelReview();
    renderReady(review);

    expect(screen.getAllByRole("listitem").length).toBeGreaterThanOrEqual(
      review.findings.length,
    );
    expect(screen.getAllByRole("article")).toHaveLength(review.findings.length);
  });
});

describe("the model's prose is separated from the computed facts", () => {
  it("shows the AI explanation in its own labelled block when it exists", () => {
    const review = tunnelReview();
    const narrated: BranchReview = {
      ...review,
      narrative: { status: "ready", summary: "Two problems on this branch." },
      findings: review.findings.map((finding) => ({
        ...finding,
        ai: {
          explanation: "The compass is in the water by the time this scene runs.",
          suggestedFix: "Cut the compass from the engine room.",
        },
      })),
    };

    renderReady(narrated);
    const ai = within(compassCard()).getByLabelText("AI explanation");

    expect(within(ai).getByText(/by the time this scene runs/)).toBeInTheDocument();
    expect(within(ai).getByText(/Cut the compass/)).toBeInTheDocument();
    expect(screen.getByText(/Two problems on this branch/)).toBeInTheDocument();
  });

  it("keeps the computed findings when watsonx cannot be reached", () => {
    const review = tunnelReview();
    renderReady({
      ...review,
      narrative: { status: "unavailable", error: "HTTP 503" },
    });

    // The findings are complete without the model — that is the whole point of
    // computing them first.
    expect(compassCard()).toBeInTheDocument();
    expect(screen.getByText(/AI explanations unavailable \(HTTP 503\)/)).toBeInTheDocument();
    expect(screen.queryByLabelText("AI explanation")).not.toBeInTheDocument();
  });
});

describe("nothing is applied automatically", () => {
  it("records the reviewer's decision without changing the finding", async () => {
    const user = userEvent.setup();
    const onDecide = vi.fn();
    const review = tunnelReview();

    renderReady(review, { onDecide });

    const card = compassCard();
    await user.click(within(card).getByRole("button", { name: /Accept finding/ }));

    expect(onDecide).toHaveBeenCalledTimes(1);
    expect(onDecide).toHaveBeenCalledWith(
      expect.stringContaining("rule-prop-scene-alt-2b"),
      "accepted",
    );

    // The store owns the decision; the card did not mutate the review it was
    // handed, and no scene text changed.
    expect(review.findings.every((f) => f.ai === undefined)).toBe(true);
    expect(within(card).getByLabelText("Evidence")).toBeInTheDocument();
  });

  it("shows an accepted finding as recorded, not as applied", () => {
    const review = tunnelReview();
    const target = review.findings.find((f) => f.rule === "prop_without_holder")!;

    renderReady(review, {
      decisions: { [target.id]: "accepted" },
      onDecide: vi.fn(),
    });

    expect(
      within(compassCard()).getByText("Accepted — not applied"),
    ).toBeInTheDocument();
  });

  it("offers accept and dismiss as keyboard-reachable buttons", () => {
    renderReady(tunnelReview(), { onDecide: vi.fn() });
    const card = compassCard();

    const accept = within(card).getByRole("button", { name: /Accept finding/ });
    const dismiss = within(card).getByRole("button", { name: /Dismiss/ });

    expect(accept).toHaveAttribute("aria-pressed", "false");
    expect(dismiss).toHaveAttribute("aria-pressed", "false");
  });
});

describe("loading, empty, error and unchecked are four different screens", () => {
  it("distinguishes a clean branch from an unchecked one", () => {
    // Same component, two states that must never read the same way.
    const { unmount } = render(
      <ContinuityReviewPanel
        review={{ ...tunnelReview(), findings: [], narrative: { status: "ready" } }}
        isLoading={false}
        error={null}
        sceneTitleById={SCENE_TITLES}
      />,
    );

    expect(screen.getByText("No contradictions found")).toBeInTheDocument();
    expect(screen.getByText(/completed check, not an unchecked branch/)).toBeInTheDocument();
    unmount();

    render(
      <ContinuityReviewPanel
        review={null}
        isLoading={false}
        error={null}
        sceneTitleById={SCENE_TITLES}
      />,
    );

    expect(screen.getByText(/has not been checked yet/)).toBeInTheDocument();
    expect(screen.queryByText("No contradictions found")).not.toBeInTheDocument();
  });

  it("announces the failure as an alert rather than an empty result", () => {
    render(
      <ContinuityReviewPanel
        review={null}
        isLoading={false}
        error={'Branch "branch-1770" was not found in this project.'}
        sceneTitleById={SCENE_TITLES}
      />,
    );

    const alert = screen.getByRole("alert");
    expect(within(alert).getByText("Canon review could not be run")).toBeInTheDocument();
    expect(within(alert).getByText(/branch-1770/)).toBeInTheDocument();
    expect(screen.queryByText("No contradictions found")).not.toBeInTheDocument();
  });

  it("reports progress while the deterministic pass runs", () => {
    render(
      <ContinuityReviewPanel
        review={null}
        isLoading
        error={null}
        sceneTitleById={SCENE_TITLES}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(/Running canon review/);
  });

  it("says the model is still writing while findings are already readable", () => {
    const review = tunnelReview();
    renderReady({ ...review, narrative: { status: "pending" } }, {
      isNarrativeLoading: true,
    });

    expect(compassCard()).toBeInTheDocument();
    expect(screen.getAllByRole("status")[0]).toHaveTextContent(/Asking watsonx/);
  });
});

describe("the surface works for any branch, not just the demo's", () => {
  it("renders canon's own computed finding", () => {
    renderReady(buildBranchReview(CANON, DEMO_BRANCHES));

    expect(
      screen.getByRole("article", { name: /The Compass is in the dialogue/ }),
    ).toBeInTheDocument();
    expect(screen.getByText("Medium severity")).toBeInTheDocument();
  });
});
