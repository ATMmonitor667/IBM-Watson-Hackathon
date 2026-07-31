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
 *   - Contradictions the rule engine already computed, with their evidence
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

  // ------------------------------------------------------------------
  // Findings the deterministic rule engine already computed (issue #8 / D3).
  //
  // When they are present the model's job changes: it EXPLAINS a contradiction
  // that has already been found from scene fields, instead of hunting for one.
  // That is the whole split — rules are reliable at tracking object and entity
  // state across scenes and cannot write; the model writes and cannot be
  // trusted to track. Sending the evidence with the finding is also what keeps
  // the explanation grounded (PRD §20): the model has nothing to invent.
  // ------------------------------------------------------------------
  const findings = ctx.ruleFindings ?? [];
  const findingsSection =
    findings.length > 0
      ? `
=== CONTRADICTIONS ALREADY DETECTED BY THE RULE ENGINE ===
${findings
  .map(
    (f) =>
      `  • [${f.severity}] ${f.title} (scene ${f.affectedScene})\n` +
      f.evidence.map((e) => `      evidence: ${e}`).join("\n"),
  )
  .join("\n")}
`
      : "";

  const task =
    findings.length > 0
      ? `Your task: explain the contradictions listed below, which a deterministic
rule engine has already detected from the scene data. Do NOT re-detect them and
do NOT invent additional evidence — every finding you return must correspond to
one of them and cite its evidence.`
      : `Your task: identify any continuity errors in the branch described below.`;

  return `You are a continuity editor for a collaborative visual story.
${task}
${findingsSection}
=== CANON FACTS (approved, immutable) ===
${canonFactLines}

=== BRANCH-SPECIFIC FACTS (may contradict canon) ===
${branchFactLines}

=== SCENE HISTORY ===
${sceneHistoryLines}

=== LOCKED CHARACTER SUMMARY ===
${ctx.characterSummary}

=== INSTRUCTIONS ===
1. ${
    findings.length > 0
      ? "Produce one ContinuityFinding for each detected contradiction above, in the same order."
      : "Compare every branch fact against the canon facts, and produce a ContinuityFinding for each contradiction."
  }
2. Fill every field. Set affectedScene to the scene number given${findings.length > 0 ? " in the detection" : ""}.
3. canonEvidence must quote the evidence supplied${findings.length > 0 ? " above" : ""} or an exact canon fact key and scene number. Do not paraphrase it into something a reviewer cannot check.
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
