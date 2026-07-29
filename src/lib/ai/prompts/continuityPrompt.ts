/**
 * src/lib/ai/prompts/continuityPrompt.ts
 *
 * Builds the prompt string sent to the Watsonx model for continuity review.
 * Pure function — no I/O, easily unit-tested.
 */

import type { CanonContext } from "../schemas";

/**
 * Returns a structured prompt that instructs the model to respond with
 * valid JSON matching ContinuityReviewResponseSchema.
 *
 * The prompt embeds:
 *   - All locked canon facts
 *   - Branch-specific facts (potential contradictions)
 *   - The scene history
 *   - The locked character summary
 */
export function buildContinuityPrompt(ctx: CanonContext): string {
  const canonFactLines = ctx.canonFacts
    .map((f) => `  • [scene ${f.lockedInScene}] ${f.key}: ${f.value}`)
    .join("\n");

  const branchFactLines =
    ctx.branchFacts.length > 0
      ? ctx.branchFacts
          .map((f) => `  • [scene ${f.lockedInScene}] ${f.key}: ${f.value}`)
          .join("\n")
      : "  (none)";

  const sceneHistoryLines = ctx.sceneHistory
    .map((title, i) => `  ${i + 1}. ${title}`)
    .join("\n");

  return `You are a continuity editor for a collaborative visual story.
Your task: identify any continuity errors in the branch described below.

=== CANON FACTS (approved, immutable) ===
${canonFactLines}

=== BRANCH-SPECIFIC FACTS (may contradict canon) ===
${branchFactLines}

=== SCENE HISTORY ===
${sceneHistoryLines}

=== LOCKED CHARACTER SUMMARY ===
${ctx.characterSummary}

=== INSTRUCTIONS ===
1. Compare every branch fact against the canon facts.
2. For each contradiction, produce a ContinuityFinding with all fields filled.
3. Be specific: cite the exact canon fact key and scene number as evidence.
4. Suggest a concrete fix for each finding.
5. Set requiresHumanReview to true if any finding is critical or major.
6. Respond ONLY with a single valid JSON object. No markdown, no prose before or after.

=== RESPONSE FORMAT ===
{
  "branchName": "${ctx.branchName}",
  "reviewedAt": "<ISO 8601 datetime>",
  "findings": [
    {
      "severity": "critical" | "major" | "minor",
      "title": "<short title>",
      "canonEvidence": "<exact canon fact and scene>",
      "affectedScene": <scene number>,
      "explanation": "<why this is a continuity error>",
      "suggestedFix": "<concrete resolution>"
    }
  ],
  "summary": "<one or two sentence summary>",
  "requiresHumanReview": true | false
}`;
}
