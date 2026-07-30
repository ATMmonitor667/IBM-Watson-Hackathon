import type { BranchReview } from "@/types/review";

// ---------------------------------------------------------------------------
// Demo continuity review for the "The Tunnel Route" branch (branch-tunnel).
//
// Referenced by src/store/reviewStore.ts (runContinuityReview). Branch and
// scene ids match src/lib/mock/demoBranches.ts and demoScenes.ts.
//
// MOCK: this is the shape Farin's continuity inspector + merge assistant must
// return. It is a stand-in for the response, NOT a stand-in for the detection —
// issue #8 in STORYVERSE_TODO.txt replaces the finding below with one computed
// by the rule engine from scene data. Keep the shape; replace the source.
//
// Every finding cites a specific scene and quotes concrete evidence, because a
// finding a reviewer cannot verify is an opinion (PRD §20).
// ---------------------------------------------------------------------------

export const DEMO_BRANCH_REVIEW: BranchReview = {
  id: "review-branch-tunnel",
  branchId: "branch-tunnel",
  status: "pending",
  findings: [
    {
      id: "finding-compass-possession",
      severity: "high",
      title: "The compass is used after it was handed over",
      evidence:
        'scene-alt-2a hands the compass to the Ferryman ("Take it — I can find ' +
        'the gate without it"), but scene-alt-2b still lists "The Compass" in ' +
        "its characters and has Kael read a bearing from it.",
      affectedSceneId: "scene-alt-2b",
      explanation:
        "Canon establishes the compass in Kael's possession from Scene 1. This " +
        "branch transfers it to the Ferryman and then keeps using it two scenes " +
        "later. The prop cannot be in both hands at once, so one of the two " +
        "scenes has to give.",
      suggestedFix:
        "Either have the Ferryman return the compass before the gate, or " +
        "rewrite the bearing so Kael navigates by Mira's signal instead — " +
        "which also pays off the cost of giving it away.",
    },
    {
      id: "finding-ferryman-setup",
      severity: "medium",
      title: "The Ferryman acts on knowledge he was never given",
      evidence:
        "scene-alt-2a has the Ferryman name the Northern Flood Gate, but no " +
        "earlier scene on this branch tells him where Kael is going.",
      affectedSceneId: "scene-alt-2a",
      explanation:
        "A character knowledge gap. The Ferryman is introduced in Scene 2 and " +
        "does not overhear the destination in any scene that precedes this one.",
      suggestedFix:
        "Add a half-panel in Scene 2 where Kael says the gate out loud, or have " +
        "the Ferryman guess and be corrected.",
    },
  ],
  strategies: [
    {
      id: "strategy-safe",
      label: "Take the setup, leave the contradiction",
      description:
        "Merge the Ferryman's expanded role but leave the tunnel ending on the " +
        "branch until the compass problem is resolved.",
      compatibleSceneIds: ["scene-alt-2a"],
      conflictingSceneIds: ["scene-alt-2b"],
      tradeoffs:
        "Canon gains the stronger Ferryman setup and stays consistent. The " +
        "alternate ending stays unmerged, so the branch remains open.",
    },
    {
      id: "strategy-full",
      label: "Take the whole branch and fix the compass",
      description:
        "Merge both scenes and apply the suggested fix to the bearing in " +
        "scene-alt-2b before it lands on canon.",
      compatibleSceneIds: ["scene-alt-2a", "scene-alt-2b"],
      conflictingSceneIds: [],
      tradeoffs:
        "Canon gets the complete alternate route in one step, but the fix has " +
        "to be written now rather than deferred, and it changes how the gate " +
        "scene reads.",
    },
    {
      id: "strategy-none",
      label: "Keep exploring",
      description:
        "Merge nothing yet. Record the review against the branch and revisit " +
        "once the knowledge gap is addressed.",
      compatibleSceneIds: [],
      conflictingSceneIds: ["scene-alt-2a", "scene-alt-2b"],
      tradeoffs:
        "Canon is untouched and nothing is lost — the branch keeps its history. " +
        "The cost is that the Ferryman setup stays unavailable to other branches.",
    },
  ],
};
