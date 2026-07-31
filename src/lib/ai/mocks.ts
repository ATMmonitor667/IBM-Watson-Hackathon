/**
 * src/lib/ai/mocks.ts
 *
 * Deterministic JSON responses for all three AI routes.
 * Used when AI_MOCK=true (default for tests and demo fallback).
 * All values reflect the "flooded city / compass" demo scenario.
 */

import type {
  CanonContext,
  ContinuityFinding,
  ContinuityReviewResponse,
  MergeAssistantResponse,
  CharacterRefinementResponse,
  Severity,
} from "./schemas";
import { findContradictions } from "./contextBuilder";

// ---------------------------------------------------------------------------
// Continuity review — derived from the request, never from a script
//
// This used to be a constant that named a branch ("feature/save-the-stranger")
// and scenes that do not exist in the demo data, and the route returned it
// verbatim. On stage that meant a panel headed "The Tunnel Route" could describe
// a different branch entirely — the mock contradicting the screen it was
// rendered on. Audit finding H2.
//
// It is now a function of the request, so the fallback can only ever talk about
// what it was actually asked about:
//
//   • `ctx.ruleFindings` present  → echo the contradictions the deterministic
//     rule engine already computed (issue #8 / D3), with their evidence.
//   • `ctx.ruleFindings` absent   → derive contradictions from the canon/branch
//     fact collision in the request itself (findContradictions).
//   • neither yields anything     → an honest clean review with no findings.
//
// The distinction between "the engine ran and found nothing" (`[]`) and "no
// engine ran" (`undefined`) is load-bearing: collapsing them is how a demo ends
// up asserting a contradiction in a branch that does not have one.
// ---------------------------------------------------------------------------

/** Fixed so the mock stays deterministic across runs and snapshots. */
const MOCK_REVIEWED_AT = "2026-07-24T12:00:00.000Z";

/** Engine severities -> the response contract's severities. */
const SEVERITY_MAP: Record<string, Severity> = {
  high: "critical",
  medium: "major",
  low: "minor",
};

/**
 * The deterministic continuity response for a given request.
 *
 * Nothing here is written prose about the story. Where the model would explain
 * a contradiction, this says plainly that the engine found it and the model was
 * not called — which is the truth in mock mode, and is what the review surface
 * labels as "computed, not explained".
 */
export function mockContinuityReviewFor(
  ctx: CanonContext,
): ContinuityReviewResponse {
  const findings = ctx.ruleFindings
    ? ctx.ruleFindings.map(fromRuleFinding)
    : findContradictions(ctx).map(fromFactCollision);

  return {
    branchName: ctx.branchName,
    reviewedAt: MOCK_REVIEWED_AT,
    findings,
    summary:
      findings.length === 0
        ? `No contradictions detected on branch "${ctx.branchName}". ` +
          `This is the deterministic fallback — the language model was not called.`
        : `${findings.length} contradiction${findings.length === 1 ? "" : "s"} ` +
          `detected on branch "${ctx.branchName}" from the supplied scene data. ` +
          `This is the deterministic fallback — the language model was not ` +
          `called, so these are statements of what was computed rather than ` +
          `written explanations.`,
    requiresHumanReview: findings.length > 0,
  };
}

/** A contradiction the rule engine already computed, restated in the contract. */
function fromRuleFinding(
  finding: NonNullable<CanonContext["ruleFindings"]>[number],
): ContinuityFinding {
  return {
    severity: SEVERITY_MAP[finding.severity] ?? "major",
    title: finding.title,
    canonEvidence:
      finding.evidence.length > 0
        ? finding.evidence.join(" · ")
        : `rule ${finding.rule} fired on scene ${finding.affectedScene}`,
    affectedScene: finding.affectedScene,
    explanation:
      `Detected deterministically by rule "${finding.rule}" from the scene ` +
      `fields cited above. The language model was not called, so this is the ` +
      `engine's own statement and not a written explanation.`,
    suggestedFix:
      `Reconcile the cited fields in scene ${finding.affectedScene}, or revise ` +
      `the canon fact they contradict. Nothing has been applied.`,
  };
}

/** A canon/branch fact collision found in the request itself. */
function fromFactCollision(
  contradiction: ReturnType<typeof findContradictions>[number],
): ContinuityFinding {
  return {
    severity: "critical",
    title: `Branch fact contradicts canon — ${contradiction.key}`,
    canonEvidence:
      `canon fact ${contradiction.key} = "${contradiction.canonValue}" ` +
      `(locked in scene ${contradiction.canonLockedInScene})`,
    affectedScene: contradiction.branchLockedInScene,
    explanation:
      `Scene ${contradiction.branchLockedInScene} sets ${contradiction.key} to ` +
      `"${contradiction.branchValue}", but canon locked it to ` +
      `"${contradiction.canonValue}" in scene ${contradiction.canonLockedInScene}. ` +
      `A branch may not silently overwrite a canon fact.`,
    suggestedFix:
      `Either change scene ${contradiction.branchLockedInScene} so it leaves ` +
      `${contradiction.key} as canon has it, or raise the change against canon ` +
      `explicitly so it is reviewed rather than absorbed.`,
  };
}

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
