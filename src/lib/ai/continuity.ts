import { findContinuityIssues } from "@/lib/ai/rules";
import { getWorldFacts } from "@/lib/db/queries";
import type { WorkspaceSnapshot } from "@/lib/db/queries";
import type { AiReview } from "@/lib/types/schemas";

/**
 * The continuity inspector's deterministic half, run over a whole project.
 *
 * Stage 2 (the watsonx call that explains each finding and proposes a fix)
 * lands at step A4 and will slot in here: it takes these findings, enriches
 * `explanation` and `suggested_fix`, and flips `source` to 'rule+model'. The
 * evidence is not the model's to revise, which is why this stage runs first
 * and unconditionally.
 */

/** Identifies the deterministic path in the UI and in persisted reviews. */
export const RULE_ENGINE_ID = "storyverse-rule-engine";

export async function runRuleReview(
  projectId: string,
  branchId: string,
  snapshot: WorkspaceSnapshot,
  now = new Date().toISOString(),
): Promise<AiReview> {
  const facts = await getWorldFacts(projectId, branchId);

  const findings = findContinuityIssues({
    scenes: snapshot.scenesByBranch[branchId] ?? [],
    canonFacts: facts.canon,
    branchFacts: facts.branch,
    characters: snapshot.characters,
  });

  return {
    id: `review-${branchId}`,
    project_id: projectId,
    branch_id: branchId,
    kind: "continuity",
    status: "complete",
    findings,
    model: RULE_ENGINE_ID,
    created_at: now,
  };
}

/**
 * Replace the snapshot's reviews with freshly computed ones.
 *
 * The findings the workspace renders are COMPUTED from the scene data, not
 * read from a fixture. Edit a scene's props_used and the finding appears or
 * disappears accordingly — which is the difference between a continuity
 * checker and a screenshot of one.
 */
export async function withRuleReviews(
  snapshot: WorkspaceSnapshot,
  now?: string,
): Promise<WorkspaceSnapshot> {
  const reviews: Record<string, AiReview> = {};

  for (const branch of snapshot.branches) {
    const review = await runRuleReview(
      snapshot.project.id,
      branch.id,
      snapshot,
      now,
    );
    // A review with no findings is a clean bill of health, not an absence.
    // Only branches with something to say get a row, so the UI's "no
    // contradictions" state stays meaningful.
    if (review.findings.length > 0) reviews[branch.id] = review;
  }

  return { ...snapshot, reviews };
}
