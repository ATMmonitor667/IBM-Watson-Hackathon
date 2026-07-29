/**
 * src/lib/ai/mocks.ts
 *
 * Deterministic JSON responses for all three AI routes.
 * Used when AI_MOCK=true (default for tests and demo fallback).
 * All values reflect the "flooded city / compass" demo scenario.
 */

import type {
  ContinuityReviewResponse,
  MergeAssistantResponse,
  CharacterRefinementResponse,
} from "./schemas";

// ---------------------------------------------------------------------------
// Continuity review — catches the compass contradiction deterministically
// ---------------------------------------------------------------------------

export const MOCK_CONTINUITY_REVIEW: ContinuityReviewResponse = {
  branchName: "feature/save-the-stranger",
  reviewedAt: "2026-07-24T12:00:00.000Z",
  findings: [
    {
      severity: "critical",
      title: "Impossible object use after disposal — compass",
      canonEvidence:
        "Scene 4 'Below the Archive': Kael gives the glowing compass to The Ferryman " +
        "as payment for crossing the archive gate. Canon fact key=compass_state locked " +
        "at scene 4 with value 'lost in Scene 4 – given to The Ferryman'.",
      affectedScene: 5,
      explanation:
        "Scene 5 in this branch ('The Choice at the Gate – Stranger Saved') shows Kael " +
        "pulling out the glowing compass to navigate the flood gate controls. This directly " +
        "contradicts the canon fact established in Scene 4 where the compass was given away " +
        "and is no longer in Kael's possession.",
      suggestedFix:
        "Option A: Remove the compass from Scene 5 — have Kael use memory or another " +
        "mechanism to navigate the gate. " +
        "Option B: Add a short beat in the branch where The Ferryman returns the compass " +
        "with a reason (e.g., 'You'll need this more than I will'). " +
        "Option C: Replace the compass with a different navigational object that was not " +
        "established as lost.",
    },
  ],
  summary:
    "1 critical continuity error detected. The compass is used in Scene 5 of this branch " +
    "after being irrevocably given away in Scene 4 (canon). This must be resolved before " +
    "merging into the canon timeline.",
  requiresHumanReview: true,
};

// ---------------------------------------------------------------------------
// Merge assistant — two strategies for the compass conflict
// ---------------------------------------------------------------------------

export const MOCK_MERGE_ASSISTANT: MergeAssistantResponse = {
  branchName: "feature/save-the-stranger",
  branchSummary:
    "This branch diverges at Scene 5 and introduces a 'save the stranger' outcome. " +
    "Kael chooses not to open the flood gate, instead helping The Stranger escape. " +
    "The branch adds one new scene and modifies Scene 5 dialogue. " +
    "One critical continuity conflict present: compass use after Scene 4.",
  compatibleChanges: [
    "Modified Scene 5 dialogue — The Ferryman's final speech (does not touch canon facts)",
    "New emotional beat in Scene 5: Hope replaces Despair",
    "Branch introduces 'The Stranger' as a named character (no prior canon conflict)",
  ],
  trueConflicts: [
    "Scene 5 branch uses the glowing compass — contradicts canon fact compass_state locked at Scene 4",
  ],
  strategies: [
    {
      id: "remove-compass",
      label: "Remove compass reference from branch Scene 5",
      description:
        "Accept all branch changes except the compass use. Replace with Kael's instinct " +
        "or a city map fragment found in the archive.",
      tradeoffs:
        "Simplest merge with no new content required. Loses the visual callback to the " +
        "compass motif, but preserves the story's internal logic.",
      includedSceneIds: ["scene-branch-5-modified"],
    },
    {
      id: "compass-return",
      label: "Add a compass-return beat before Scene 5",
      description:
        "Insert a short branch scene where The Ferryman returns the compass to Kael with " +
        "justification, then merge Scene 5 as written.",
      tradeoffs:
        "Preserves the compass symbolism and the branch's visual storytelling. Requires " +
        "authoring one additional scene — approximately 2–3 panels.",
      includedSceneIds: ["scene-branch-4b-return", "scene-branch-5-modified"],
    },
  ],
  previewOnly: true,
};

// ---------------------------------------------------------------------------
// Character refinement — Kael after compass loss
// ---------------------------------------------------------------------------

export const MOCK_CHARACTER_REFINEMENT: CharacterRefinementResponse = {
  characterId: "char-kael-1",
  proposedDescription:
    "Kael — explorer, mid-30s, worn brown leather coat with travel stains. " +
    "Empty belt holster where the compass used to hang. Eyes carry the weight of the choice " +
    "made in the archive. Carries only a waterproof notebook and a short knife.",
  proposedGenerationInstruction:
    "Full-body portrait of Kael, a mid-30s explorer. Worn brown leather coat. " +
    "Empty circular belt holster (formerly held the compass — noticeably absent). " +
    "Tired, determined expression. Flooded city background, knee-deep water. " +
    "Graphic-novel style, high-contrast ink lines, muted blues and earth tones. " +
    "No compass visible anywhere on the character.",
  changeRationale:
    "Compass removed from character description and generation instruction following " +
    "canon lock at Scene 4. The empty holster becomes a visual storytelling element " +
    "reinforcing the sacrifice made at the archive.",
  requiresApproval: true,
};
