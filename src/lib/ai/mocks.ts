/**
 * src/lib/ai/mocks.ts
 *
 * Deterministic JSON responses for all three AI routes.
 * Used when AI_MOCK=true (default for tests and demo fallback).
 * All values reflect the "flooded city / compass" demo scenario.
 */

import type {
  CanonContext,
  ContinuityReviewResponse,
  MergeAssistantResponse,
  MergeStrategy,
  CharacterRefinementResponse,
} from "./schemas";
import { findContradictions } from "./contextBuilder";

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
// Merge assistant — a preview computed from the branch actually being merged
//
// WHY THIS IS A FUNCTION AND NOT A CONSTANT
//
// It used to be a frozen object describing a branch called
// "feature/save-the-stranger" and its compass conflict. Returned verbatim, a
// merge panel headed "The Tunnel Route" would describe a different branch and
// scenes that do not exist — the demo's most visible surface confidently
// talking about nothing. Anything shown to a human has to be about what they
// clicked.
//
// So the fallback is derived from the CanonContext of the request: the branch's
// own name, its scenes, and the fact-key collisions findContradictions() finds
// against canon. It is deterministic and cites only values that came in with
// the request — no model, and nothing invented. `branchSummary` says
// "no model call" in its first clause so the response stays self-labelling even
// if the X-Storyverse-AI-Source header is lost in transit.
// ---------------------------------------------------------------------------

const BRANCH_PREFIX = "[branch] ";

/** Scene titles this branch adds that canon does not have. */
function branchOnlyScenes(ctx: CanonContext): string[] {
  return ctx.sceneHistory
    .filter((title) => title.startsWith(BRANCH_PREFIX))
    .map((title) => title.slice(BRANCH_PREFIX.length));
}

/**
 * The deterministic merge preview for `ctx`.
 *
 * Used when Watsonx credentials are absent (AI_MOCK=true or unset keys), so the
 * demo degrades to something coherent instead of an error page. Same shape as a
 * real response, so the UI has one code path.
 */
export function mockMergeAssistantFor(ctx: CanonContext): MergeAssistantResponse {
  const added = branchOnlyScenes(ctx);
  const contradictions = findContradictions(ctx);
  const conflictKeys = new Set(contradictions.map((c) => c.key));

  const trueConflicts = contradictions.map(
    (c) =>
      `${c.key} — this branch establishes "${c.branchValue}" (Scene ${c.branchLockedInScene}), ` +
      `but canon holds "${c.canonValue}" (Scene ${c.canonLockedInScene}).`
  );

  const compatibleChanges = [
    ...added.map(
      (title) => `Adds scene "${title}", which canon does not have — nothing in canon to contradict.`
    ),
    ...ctx.branchFacts
      .filter((f) => !conflictKeys.has(f.key))
      .map((f) => `New on this branch: ${f.value}`),
  ].slice(0, 8);

  const summary =
    `Deterministic preview — no model call. "${ctx.branchName}" adds ${added.length} scene(s) ` +
    `canon does not have and declares ${ctx.branchFacts.length} branch fact(s) against ` +
    `${ctx.canonFacts.length} canon fact(s). ` +
    (contradictions.length > 0
      ? `${contradictions.length} of them contradict canon and need a decision before merging.`
      : `None of them contradict canon.`);

  // includedSceneIds carries scene TITLES here: CanonContext identifies scenes
  // by title, not id, so a title is the most specific thing this response can
  // honestly name.
  const strategies: MergeStrategy[] =
    contradictions.length > 0
      ? [
          {
            id: "accept-branch",
            label: `Accept "${ctx.branchName}" as written`,
            description:
              `Merge every scene on this branch into canon unchanged, including the ` +
              `${added.length} scene(s) canon does not have.`,
            tradeoffs:
              `Fastest, and keeps the branch's version of the story intact. Leaves ` +
              `${contradictions.length} contradiction(s) standing in canon, and every scene ` +
              `written after the merge inherits them.`,
            includedSceneIds: added,
          },
          {
            id: "canon-wins",
            label: "Merge the scenes, keep canon's version of the disputed facts",
            description:
              `Take the branch's scenes but rewrite the beats listed under conflicts so they ` +
              `agree with canon (${[...conflictKeys].join(", ")}).`,
            tradeoffs:
              `Canon stays internally consistent. Costs a rewrite of each conflicting beat, ` +
              `and the branch loses whatever the disputed fact was doing for it dramatically.`,
            includedSceneIds: added,
          },
          {
            id: "defer-conflicts",
            label: "Merge nothing that touches the disputed facts",
            description:
              `Merge only the compatible changes listed above and leave the conflicting beats ` +
              `on the branch until the author decides which timeline is right.`,
            tradeoffs:
              `Nothing contradictory enters canon and no rewrite is needed now. The branch stays ` +
              `open, so the decision is postponed rather than made.`,
            includedSceneIds: [],
          },
        ]
      : [
          {
            id: "accept-branch",
            label: `Accept "${ctx.branchName}" as written`,
            description:
              `Merge every scene on this branch into canon unchanged. No fact declared on this ` +
              `branch contradicts a canon fact.`,
            tradeoffs:
              `Fastest path, and nothing detected needs rewriting. A clean fact check is not a ` +
              `read of the prose — tone and pacing are still unreviewed.`,
            includedSceneIds: added,
          },
          {
            id: "scene-by-scene",
            label: "Merge scene by scene",
            description:
              `Bring the branch's scenes into canon one at a time, re-checking continuity after ` +
              `each, instead of merging all ${added.length} at once.`,
            tradeoffs:
              `Any problem the fact check cannot see surfaces against a smaller change, so it is ` +
              `cheaper to undo. Slower, and canon is briefly half-merged.`,
            includedSceneIds: added,
          },
        ];

  return {
    branchName: ctx.branchName,
    branchSummary: summary,
    compatibleChanges,
    trueConflicts,
    strategies,
    previewOnly: true,
  };
}

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
