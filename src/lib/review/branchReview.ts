import { reviewBranch, type ComputedFinding } from "@/lib/ai/continuityRules";
import type { ContinuityReviewResponse } from "@/lib/ai/schemas";
import type { Branch } from "@/types/workspace";
import type {
  BranchReview,
  ContinuityFinding,
  MergeStrategyOption,
} from "@/types/review";

// ---------------------------------------------------------------------------
// BRANCH REVIEW ASSEMBLY (issue #12 / D4)
//
// The review a reviewer reads is built in two passes, and this module is where
// the seam between them lives:
//
//   PASS 1 — reviewBranch() computes the findings from scene fields. Severity,
//            evidence and the contradicted canon fact all come from here.
//            No network, so this pass cannot fail for external reasons.
//   PASS 2 — applyNarrative() layers the model's prose on top of pass 1,
//            matching each returned finding to a computed one by scene number.
//            The model may add explanation; it may not add findings.
//
// Pass 2 dropping a model finding that matches nothing computed is deliberate.
// If the model volunteers a contradiction the engine did not find, we have no
// evidence for it and no scene fields to point at, and a finding a reviewer
// cannot check is exactly what PRD §20 forbids.
//
// This file is NOT mock data. The strategies passed in still are — see
// src/lib/mock/demoReview.ts.
// ---------------------------------------------------------------------------

/**
 * Adapt one engine finding to the review UI's contract.
 *
 * Everything is carried across structurally. The evidence stays a list rather
 * than being joined into a sentence, because the reviewer checks it line by
 * line against the scene, and the canon fact stays separate from the
 * explanation so the surface can label one computed and the other authored.
 */
export function toReviewFinding(finding: ComputedFinding): ContinuityFinding {
  return {
    id: finding.id,
    rule: finding.rule,
    severity: finding.severity,
    title: finding.title,
    evidence: finding.evidence,
    brokenFact: {
      statement: finding.brokenFact.statement,
      establishedIn: finding.brokenFact.establishedIn,
    },
    affectedSceneId: finding.sceneId,
    explanation: finding.message,
    suggestedFix: finding.suggestedFix,
  };
}

/**
 * The deterministic half of a branch review — every branch, not just the one
 * the demo script visits.
 *
 * `strategies` is an argument rather than a lookup because merge strategies are
 * the merge assistant's job (issue #25 / D5), not the rule engine's. Passing
 * none is honest: it means nobody has proposed what to do yet.
 */
export function buildBranchReview(
  branch: Branch,
  branches: Branch[],
  strategies: MergeStrategyOption[] = [],
): BranchReview {
  return {
    id: `review-${branch.id}`,
    branchId: branch.id,
    branchName: branch.name,
    status: "pending",
    findings: reviewBranch(branch, branches).map(toReviewFinding),
    strategies,
    narrative: { status: "pending" },
  };
}

/**
 * Layer the model's explanation onto the computed findings.
 *
 * Matching is by scene number, in order, which is the same identity the prompt
 * asks the model to echo back ("Set affectedScene to the scene number given").
 * When two findings land on the same scene they are matched in the order the
 * engine produced them, which is the order the prompt listed them in.
 *
 * Returns a new review. The computed evidence and canon fact are never
 * overwritten — only `ai` is added.
 */
export function applyNarrative(
  review: BranchReview,
  response: ContinuityReviewResponse,
  sceneNumberById: Record<string, number>,
): BranchReview {
  // Findings waiting for prose, queued per scene number.
  const queues = new Map<number, ContinuityFinding[]>();
  for (const finding of review.findings) {
    const sceneNumber = sceneNumberById[finding.affectedSceneId];
    if (sceneNumber === undefined) continue;
    const queue = queues.get(sceneNumber) ?? [];
    queue.push(finding);
    queues.set(sceneNumber, queue);
  }

  const narrated = new Map<string, ContinuityFinding["ai"]>();
  for (const modelFinding of response.findings) {
    const queue = queues.get(modelFinding.affectedScene);
    const target = queue?.shift();
    if (!target) continue; // nothing computed here — see the note at the top.
    narrated.set(target.id, {
      explanation: modelFinding.explanation,
      suggestedFix: modelFinding.suggestedFix,
    });
  }

  return {
    ...review,
    findings: review.findings.map((finding) => {
      const ai = narrated.get(finding.id);
      return ai ? { ...finding, ai } : finding;
    }),
    narrative: { status: "ready", summary: response.summary },
  };
}

/**
 * Record that the model could not be reached, without losing anything.
 *
 * The computed findings stay exactly as they were: the reviewer still sees the
 * contradiction, the evidence and the canon fact. Only the prose is missing,
 * and the surface says so rather than implying the branch was not checked.
 */
export function withUnavailableNarrative(
  review: BranchReview,
  error: string,
): BranchReview {
  return { ...review, narrative: { status: "unavailable", error } };
}

/** scene id -> scene number, across every branch in the project. */
export function sceneNumbersOf(branches: Branch[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const branch of branches) {
    for (const scene of branch.scenes) map[scene.id] = scene.sceneNumber;
  }
  return map;
}
