// ---------------------------------------------------------------------------
// Continuity review + merge types — the contract the review surface renders.
//
// WHAT IS REAL HERE (issues #8 / D3 and #12 / D4)
//
// `ContinuityFinding` is no longer a stand-in. Everything except the `ai` block
// is COMPUTED by src/lib/ai/continuityRules.ts from structured scene fields:
// the severity, the evidence, the canon fact that is contradicted, and a first
// suggested fix. The `ai` block is the only part a language model writes, and
// it is optional — when watsonx cannot be reached the finding still renders in
// full, because nothing in the deterministic half needs the network.
//
// That split is the reason both halves are carried separately rather than being
// flattened into one blob of prose: the review surface labels which is which,
// so a reviewer can tell a computed fact from a model's proposal.
//
// Owner: Firdosi (review UI) / Farin (AI contract + real responses)
// ---------------------------------------------------------------------------

export type FindingSeverity = "high" | "medium" | "low";

/** A scene citation a reviewer can follow. */
export interface FindingSceneRef {
  sceneId: string;
  sceneNumber: number;
  title: string;
}

/**
 * The narrative layer the model adds on top of a computed finding.
 *
 * Present only when /api/ai/continuity answered. Never required to render a
 * finding, and never permitted to replace the computed evidence.
 */
export interface AiNarrative {
  explanation: string;
  suggestedFix: string;
}

export interface ContinuityFinding {
  id: string;
  /** Rule id that computed this finding, e.g. "prop_without_holder". */
  rule: string;
  severity: FindingSeverity;
  /** Short headline, e.g. "The Compass is used after it leaves this timeline" */
  title: string;
  /**
   * Concrete field values the engine read, quoted. One entry per citation so
   * the surface can render them as a list a reviewer checks line by line.
   */
  evidence: string[];
  /** The standing canon claim the scene contradicts. */
  brokenFact: {
    statement: string;
    establishedIn?: FindingSceneRef;
  };
  /** Scene id this finding is about */
  affectedSceneId: string;
  /** The engine's one-line statement of the contradiction. */
  explanation: string;
  /** The engine's mechanical fix. */
  suggestedFix: string;
  /** The model's prose, when it was reached. Always a proposal, never applied. */
  ai?: AiNarrative;
}

export interface MergeStrategyOption {
  id: string;
  label: string;
  description: string;
  /** Scene ids that are safely compatible with canon under this strategy */
  compatibleSceneIds: string[];
  /** Scene ids that create a true conflict with canon under this strategy */
  conflictingSceneIds: string[];
  tradeoffs: string;
}

/**
 * Whether the watsonx narrative layer was reached for this review.
 *
 * Deliberately distinct from "no findings": a review with zero findings is a
 * clean branch, whereas `unavailable` means the computed findings are complete
 * but nobody has written them up. Collapsing the two is what makes a demo lie.
 */
export type NarrativeStatus = "pending" | "ready" | "unavailable";

export interface ReviewNarrative {
  status: NarrativeStatus;
  /** The model's summary of the branch, when it answered. */
  summary?: string;
  /** Why the model layer is missing. Shown to the reviewer verbatim. */
  error?: string;
}

export interface BranchReview {
  id: string;
  branchId: string;
  /** The branch this review is actually about — panels must not mislabel it. */
  branchName: string;
  findings: ContinuityFinding[];
  strategies: MergeStrategyOption[];
  narrative: ReviewNarrative;
  /** Overall status of the human-reviewed proposal */
  status: "pending" | "approved" | "changes-requested" | "rejected";
}

/** A single scene-level choice the reviewer makes during selective merge */
export interface MergeSelection {
  sceneId: string;
  include: boolean;
}

/**
 * The reviewer's verdict on one finding.
 *
 * Recorded, never enacted: accepting a finding does not edit a scene, and there
 * is no code path from here to the story data. The human decides; the merge
 * step is where anything actually changes.
 */
export type FindingDecision = "accepted" | "dismissed";
