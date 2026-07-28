/**
 * src/lib/ai/prompts/characterRefinePrompt.ts
 *
 * Builds the prompt string sent to the Watsonx model for character refinement.
 * Pure function — no I/O, easily unit-tested.
 */

import type { CanonContext } from "../schemas";

/**
 * Returns a structured prompt that instructs the model to respond with
 * valid JSON matching CharacterRefinementResponseSchema.
 *
 * The model is instructed to produce a PROPOSAL only.
 * It must set requiresApproval to true — the schema enforces this via z.literal(true).
 */
export function buildCharacterRefinePrompt(
  ctx: CanonContext,
  characterId: string
): string {
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

  return `You are a character design assistant for a collaborative visual story editor.
Your task: propose an updated character description that reflects the latest canon events.
You must NEVER change the locked canon facts. This is a proposal only — a human must approve it.

=== CHARACTER ID ===
${characterId}

=== CURRENT LOCKED CHARACTER SUMMARY ===
${ctx.characterSummary}

=== CANON FACTS (approved, immutable) ===
${canonFactLines}

=== BRANCH-SPECIFIC FACTS ===
${branchFactLines}

=== INSTRUCTIONS ===
1. Read the current character summary and all canon facts carefully.
2. Propose an updated plain-text character description that is consistent with
   ALL canon facts (especially any object states that have changed).
3. Propose an updated image generation instruction — optimised for a text-to-image
   model, graphic-novel style. Be concrete: clothing, expression, surroundings.
4. Explain what changed and why (changeRationale), citing specific canon facts.
5. Always set requiresApproval to true — never change this to false.
6. Respond ONLY with a single valid JSON object. No markdown, no prose.

=== RESPONSE FORMAT ===
{
  "characterId": "${characterId}",
  "proposedDescription": "<updated plain-text character description>",
  "proposedGenerationInstruction": "<updated image generation prompt>",
  "changeRationale": "<what changed and why, citing canon facts>",
  "requiresApproval": true
}`;
}
