// ---------------------------------------------------------------------------
// Continuity review + merge types — local/temporary stand-in for Farin's
// structured watsonx/Granite response contract (continuity findings + merge
// strategies). Field names are written to match the shapes described in the
// team plan so swapping in the real AI response later is a drop-in.
//
// Owner: Firdosi (review UI) / Farin (AI contract + real responses)
// ---------------------------------------------------------------------------

export type FindingSeverity = "high" | "medium" | "low";

export interface ContinuityFinding {
  id: string;
  severity: FindingSeverity;
  /** Short headline, e.g. "Compass used after it was given away" */
  title: string;
  /** The specific evidence the model cites */
  evidence: string;
  /** Scene id this finding is about */
  affectedSceneId: string;
  explanation: string;
  suggestedFix: string;
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

export interface BranchReview {
  id: string;
  branchId: string;
  findings: ContinuityFinding[];
  strategies: MergeStrategyOption[];
  /** Overall status of the human-reviewed proposal */
  status: "pending" | "approved" | "changes-requested" | "rejected";
}

/** A single scene-level choice the reviewer makes during selective merge */
export interface MergeSelection {
  sceneId: string;
  include: boolean;
}
