import { reviewBranch, type ComputedFinding } from "@/lib/ai/continuityRules";
import { DEMO_BRANCHES } from "@/lib/mock/demoBranches";
import type { BranchReview, ContinuityFinding } from "@/types/review";

// ---------------------------------------------------------------------------
// Continuity review for "The Tunnel Route" (branch-tunnel).
//
// THE FINDINGS ARE COMPUTED, NOT WRITTEN (issue #8 / D3). They come from
// src/lib/ai/continuityRules.ts reading the scene data in demoScenes.ts and
// demoBranches.ts. Change a scene's cast or dialogue and this review changes
// with it — which is the entire point. Do not paste findings in here by hand.
//
// The MERGE STRATEGIES below are still written out. Those are the merge
// assistant's job (issue #25 / D5), not the rule engine's — an engine can find
// a contradiction but it cannot weigh what a team should do about it. They are
// the next thing to become real.
//
// Referenced by src/store/reviewStore.ts (runContinuityReview).
// ---------------------------------------------------------------------------

const TUNNEL_BRANCH_ID = "branch-tunnel";

/**
 * Adapt the engine's output to the review UI's contract.
 *
 * The engine emits evidence as a list of field values; the review type wants a
 * single string. They are joined rather than summarised, because the whole
 * value of the evidence is that a reviewer can check it against the scene.
 */
function toReviewFinding(finding: ComputedFinding): ContinuityFinding {
  return {
    id: finding.id,
    severity: finding.severity,
    title: finding.title,
    evidence: finding.evidence.join(" · "),
    affectedSceneId: finding.sceneId,
    explanation: finding.message,
    suggestedFix: finding.suggestedFix,
  };
}

const tunnel = DEMO_BRANCHES.find((b) => b.id === TUNNEL_BRANCH_ID);

export const DEMO_BRANCH_REVIEW: BranchReview = {
  id: "review-branch-tunnel",
  branchId: TUNNEL_BRANCH_ID,
  status: "pending",
  findings: tunnel
    ? reviewBranch(tunnel, DEMO_BRANCHES).map(toReviewFinding)
    : [],
  strategies: [
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
  ],
};
