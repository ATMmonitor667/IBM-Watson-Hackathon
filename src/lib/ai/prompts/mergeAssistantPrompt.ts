/**
 * src/lib/ai/prompts/mergeAssistantPrompt.ts
 *
 * Builds the prompt string sent to the configured model for merge assistance.
 * Pure function — no I/O, easily unit-tested.
 */

import type { CanonContext } from "../schemas";

/**
 * Returns a structured prompt that instructs the model to respond with
 * valid JSON matching MergeAssistantResponseSchema.
 *
 * The model is instructed to produce a PREVIEW only — it must set
 * previewOnly to true. This is enforced at the schema level (z.literal(true)).
 */
export function buildMergeAssistantPrompt(ctx: CanonContext): string {
  const canonFactLines =
    ctx.canonFacts.length > 0
      ? ctx.canonFacts
          .map((f) => `  • [scene ${f.lockedInScene}] ${f.key}: ${f.value}`)
          .join("\n")
      : "  (none)";

  const branchFactLines =
    ctx.branchFacts.length > 0
      ? ctx.branchFacts
          .map((f) => `  • [scene ${f.lockedInScene}] ${f.key}: ${f.value}`)
          .join("\n")
      : "  (none)";

  const sceneHistoryLines = ctx.sceneHistory
    .map((title, i) => `  ${i + 1}. ${title}`)
    .join("\n");

  return `You are a merge assistant for a collaborative visual story editor.
Your task: analyse the branch described below against the approved canon timeline and
produce a structured merge preview with 2–3 strategies for the human author to choose from.
You must NEVER execute any merge — produce a preview only.

=== CANON FACTS (approved, immutable) ===
${canonFactLines}

=== BRANCH-SPECIFIC FACTS (potential conflicts) ===
${branchFactLines}

=== SCENE HISTORY ===
${sceneHistoryLines}

=== LOCKED CHARACTER SUMMARY ===
${ctx.characterSummary}

=== INSTRUCTIONS ===
1. Identify all branch changes that integrate cleanly (no canon fact violations).
2. Identify all changes that directly conflict with canon facts (trueConflicts).
3. Propose exactly 2 or 3 ranked merge strategies for the human to choose from.
4. Each strategy must have a unique id, a short label, a description, and tradeoffs.
5. Each strategy must list the specific scene IDs from the branch it would include.
6. branchSummary should be 1–3 sentences describing what the branch changes overall.
7. Always set previewOnly to true — the AI must never execute a merge.
8. Respond ONLY with a single valid JSON object. No markdown, no prose before or after.

=== RESPONSE FORMAT ===
{
  "branchName": "${ctx.branchName}",
  "branchSummary": "<1–3 sentence summary of what the branch changes>",
  "compatibleChanges": ["<change 1>", "..."],
  "trueConflicts": ["<conflict 1>", "..."],
  "strategies": [
    {
      "id": "<kebab-case-id>",
      "label": "<short human-readable label>",
      "description": "<what this strategy does>",
      "tradeoffs": "<pros and cons>",
      "includedSceneIds": ["<scene-id>", "..."]
    }
  ],
  "previewOnly": true
}`;
}
