import { buildBranchReview } from "@/lib/review/branchReview";
import { DEMO_BRANCHES } from "@/lib/mock/demoBranches";
import type { BranchReview, MergeStrategyOption } from "@/types/review";

// ---------------------------------------------------------------------------
// Continuity review for "The Tunnel Route" (branch-tunnel).
//
// THE FINDINGS ARE COMPUTED, NOT WRITTEN (issue #8 / D3). They come from
// src/lib/ai/continuityRules.ts reading the scene data in demoScenes.ts and
// demoBranches.ts, assembled by src/lib/review/branchReview.ts. Change a
// scene's cast or dialogue and this review changes with it — which is the
// entire point. Do not paste findings in here by hand.
//
// MOCK: the MERGE STRATEGIES below are still written out, and they are the only
// hand-authored thing in this file. Those are the merge assistant's job (issue
// #25 / D5), not the rule engine's — an engine can find a contradiction but it
// cannot weigh what a team should do about it. Because they are written for
// this branch's two scenes specifically, they are attached to this branch
// specifically: src/store/reviewStore.ts passes them only for branch-tunnel and
// passes none for any other branch, rather than showing a reviewer strategies
// about scenes their branch does not contain.
// ---------------------------------------------------------------------------

const TUNNEL_BRANCH_ID = "branch-tunnel";

/** MOCK: hand-authored, pending the merge assistant (issue #25 / D5). */
export const DEMO_MERGE_STRATEGIES: MergeStrategyOption[] = [
  {
    id: "strategy-safe",
    label: "Take the tunnel, leave the Archivist",
    description:
      "Merge the aqueduct route but hold the engine-room scene back until " +
      "the Archivist has been introduced on this timeline.",
    compatibleSceneIds: ["scene-alt-2a"],
    conflictingSceneIds: ["scene-alt-2b"],
    tradeoffs:
      "Canon gains the alternate route and stays internally consistent. The " +
      "engine room stays unmerged, so the branch remains open.",
  },
  {
    id: "strategy-full",
    label: "Take the whole branch and add an introduction",
    description:
      "Merge both scenes, and add a beat to the aqueduct scene that " +
      "introduces the Archivist before the engine room.",
    compatibleSceneIds: ["scene-alt-2a", "scene-alt-2b"],
    conflictingSceneIds: [],
    tradeoffs:
      "Canon gets the complete route in one step, but the introduction has " +
      "to be written now rather than deferred, and it lengthens the branch.",
  },
  {
    id: "strategy-rebranch",
    label: "Re-branch from Scene 4 instead",
    description:
      "Abandon this divergence point and branch again after the Archivist " +
      "is established in canon, so the introduction is inherited.",
    compatibleSceneIds: [],
    conflictingSceneIds: ["scene-alt-2a", "scene-alt-2b"],
    tradeoffs:
      "Nothing is lost — the branch keeps its history — and the continuity " +
      "problem disappears rather than being patched. The cost is that both " +
      "scenes need rewriting against a later point in the story.",
  },
];

/**
 * Strategies for one branch, or none.
 *
 * Used by the review store so that every branch gets a real computed review
 * while only the branch these strategies were written about is offered them.
 */
export function demoStrategiesFor(branchId: string): MergeStrategyOption[] {
  return branchId === TUNNEL_BRANCH_ID ? DEMO_MERGE_STRATEGIES : [];
}

const tunnel = DEMO_BRANCHES.find((b) => b.id === TUNNEL_BRANCH_ID);

/**
 * The tunnel branch's review, assembled at module load.
 *
 * Kept as an export because the engine's tests assert against it — it is the
 * evidence that what the UI shows is what the engine computed.
 */
export const DEMO_BRANCH_REVIEW: BranchReview = tunnel
  ? buildBranchReview(tunnel, DEMO_BRANCHES, DEMO_MERGE_STRATEGIES)
  : {
      id: "review-branch-tunnel",
      branchId: TUNNEL_BRANCH_ID,
      branchName: "The Tunnel Route",
      status: "pending",
      findings: [],
      strategies: DEMO_MERGE_STRATEGIES,
      narrative: { status: "pending" },
    };
