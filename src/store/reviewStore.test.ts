import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useReviewStore } from "@/store/reviewStore";
import { DEMO_BRANCHES } from "@/lib/mock/demoBranches";
import type { ContinuityReviewResponse } from "@/lib/ai/schemas";

/**
 * AUDIT FINDING H3 — every branch gets a real review, and a real failure looks
 * like one.
 *
 * The store used to read
 *
 *     const review = branchId === "branch-tunnel" ? DEMO_BRANCH_REVIEW : null;
 *
 * so any other branch produced an empty review with no error: a reviewer who
 * used "Branch from here" — reachable in two clicks during the demo — was told
 * their branch was clean by a code path that had never looked at it. These
 * tests are the guard against that returning.
 */

function modelResponse(overrides: Partial<ContinuityReviewResponse> = {}) {
  const body: ContinuityReviewResponse = {
    branchName: "The Tunnel Route",
    reviewedAt: "2026-07-24T12:00:00.000Z",
    findings: [
      {
        severity: "critical",
        title: "Compass used after loss",
        canonEvidence: "propsUsed: [The Compass, Engine controls]",
        affectedScene: 7,
        explanation: "MODEL EXPLANATION",
        suggestedFix: "MODEL FIX",
      },
    ],
    summary: "MODEL SUMMARY",
    requiresHumanReview: true,
    ...overrides,
  };
  return body;
}

function stubOk(body: ContinuityReviewResponse) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ),
  );
}

beforeEach(() => {
  useReviewStore.getState().reset();
  stubOk(modelResponse());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("runContinuityReview computes a review for any branch", () => {
  it("reviews the tunnel branch from its own scene data", async () => {
    await useReviewStore.getState().runContinuityReview("branch-tunnel");
    const { review, error } = useReviewStore.getState();

    expect(error).toBeNull();
    expect(review?.branchName).toBe("The Tunnel Route");
    expect(review?.findings.map((f) => f.rule)).toEqual([
      "unestablished_on_branch",
      "prop_without_holder",
    ]);
    expect(review?.findings[1].evidence.join(" ")).toContain("aqueduct current");
    expect(review?.findings[1].brokenFact.statement).toContain("The Hidden Tunnel");
  });

  it("reviews the canon branch too — no branch is special-cased", async () => {
    await useReviewStore.getState().runContinuityReview("branch-canon");
    const { review, error } = useReviewStore.getState();

    expect(error).toBeNull();
    expect(review?.branchId).toBe("branch-canon");
    // Canon's own finding: the compass drives Scene 3 without being in its cast.
    expect(review?.findings.map((f) => f.affectedSceneId)).toEqual(["scene-demo-3"]);
    // MOCK strategies were written for the tunnel branch's scenes, so canon is
    // offered none rather than being offered strategies about scenes it lacks.
    expect(review?.strategies).toEqual([]);
  });

  it("errors honestly on a branch the demo created but never persisted", async () => {
    // What "Branch from here" produces today: a client-side id that never
    // reaches the branch fixtures. The store cannot review it — and the point
    // of this test is that it SAYS so. Before the H3 fix this exact id yielded
    // a silent empty review, which reads as "your branch is clean".
    const createdId = `branch-${Date.now()}`;
    expect(DEMO_BRANCHES.some((b) => b.id === createdId)).toBe(false);

    await useReviewStore.getState().runContinuityReview(createdId);
    const { review, error } = useReviewStore.getState();

    expect(review).toBeNull();
    expect(error).toContain(createdId);
    expect(error).toMatch(/not found/i);
  });
});

describe("a failure surfaces as an error, never as an empty success", () => {
  it("errors on an unknown branch instead of reporting no findings", async () => {
    await useReviewStore.getState().runContinuityReview("branch-does-not-exist");
    const { review, error, isLoading } = useReviewStore.getState();

    expect(isLoading).toBe(false);
    expect(review).toBeNull();
    expect(error).not.toBeNull();
    expect(error).toContain("branch-does-not-exist");
  });

  it("clears a previous branch's review before running the next one", async () => {
    await useReviewStore.getState().runContinuityReview("branch-tunnel");
    expect(useReviewStore.getState().review).not.toBeNull();

    await useReviewStore.getState().runContinuityReview("branch-nope");
    // Stale findings from another branch are worse than none — a panel headed
    // with one branch must not describe another.
    expect(useReviewStore.getState().review).toBeNull();
    expect(useReviewStore.getState().error).not.toBeNull();
  });
});

describe("the model explains what the engine already found", () => {
  it("layers the model's prose onto the matching computed finding", async () => {
    await useReviewStore.getState().runContinuityReview("branch-tunnel");
    const { review } = useReviewStore.getState();

    expect(review?.narrative.status).toBe("ready");
    expect(review?.narrative.summary).toBe("MODEL SUMMARY");

    const narrated = review!.findings.filter((f) => f.ai);
    expect(narrated).toHaveLength(1);
    expect(narrated[0].ai?.explanation).toBe("MODEL EXPLANATION");
    // The computed half is untouched by the model.
    expect(narrated[0].evidence.length).toBeGreaterThan(0);
    expect(narrated[0].brokenFact.statement).not.toContain("MODEL");
  });

  it("keeps every computed finding when the model call fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    await useReviewStore.getState().runContinuityReview("branch-tunnel");
    const { review, error } = useReviewStore.getState();

    // Degrades to "computed but not written up" — never to "not checked".
    expect(error).toBeNull();
    expect(review?.findings).toHaveLength(2);
    expect(review?.narrative.status).toBe("unavailable");
    expect(review?.narrative.error).toBe("offline");
    expect(review?.findings.every((f) => f.ai === undefined)).toBe(true);
  });

  it("drops a model finding that matches nothing the engine computed", async () => {
    stubOk(
      modelResponse({
        findings: [
          {
            severity: "critical",
            title: "Invented problem",
            canonEvidence: "none",
            affectedScene: 99,
            explanation: "HALLUCINATION",
            suggestedFix: "HALLUCINATION",
          },
        ],
      }),
    );

    await useReviewStore.getState().runContinuityReview("branch-tunnel");
    const { review } = useReviewStore.getState();

    expect(review?.findings).toHaveLength(2);
    expect(review?.findings.every((f) => f.ai === undefined)).toBe(true);
  });
});

describe("decisions are recorded, not enacted", () => {
  it("stores a verdict without touching the review", async () => {
    await useReviewStore.getState().runContinuityReview("branch-tunnel");
    const before = useReviewStore.getState().review;
    const target = before!.findings[0];

    useReviewStore.getState().decideFinding(target.id, "accepted");

    expect(useReviewStore.getState().decisions[target.id]).toBe("accepted");
    // Same object: accepting a finding does not rewrite the story data.
    expect(useReviewStore.getState().review).toBe(before);
    expect(useReviewStore.getState().mergeComplete).toBe(false);
  });
});
