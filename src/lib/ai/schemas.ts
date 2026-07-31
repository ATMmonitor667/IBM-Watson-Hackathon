/**
 * src/lib/ai/schemas.ts
 *
 * Zod contracts for all AI input/output in Storyverse.
 * Every other module (routes, context builder, mocks, tests) imports from here.
 * No runtime dependencies beyond zod.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Canon context — what every AI call receives about the project state
// ---------------------------------------------------------------------------

/**
 * A single tracked world-fact: character traits, visual rules, object states, etc.
 * `key`   — machine-readable identifier, e.g. "compass_state"
 * `value` — current approved state, e.g. "lost in Scene 4 – given to The Ferryman"
 * `lockedInScene` — scene number where this fact was locked into canon
 */
export const CanonFactSchema = z.object({
  key: z.string().min(1),
  value: z.string().min(1),
  lockedInScene: z.number().int().positive(),
});
export type CanonFact = z.infer<typeof CanonFactSchema>;

/**
 * A contradiction the deterministic rule engine already FOUND (issue #8 / D3).
 *
 * This travels with the context so the model's job is to EXPLAIN a finding, not
 * to discover one. The evidence is field values the engine read; the model is
 * not permitted to revise it, only to say what it means and how to fix it.
 * `rule` is the engine's rule id, kept as a plain string so the two data models
 * in this repo (see issue #11) can both feed this contract.
 */
export const RuleFindingSchema = z.object({
  id: z.string().min(1),
  rule: z.string().min(1),
  severity: z.string().min(1),
  title: z.string().min(1),
  /** Scene number the contradiction lands on, matching `affectedScene`. */
  affectedScene: z.number().int().positive(),
  /** Concrete field values, quoted. Never prose the engine invented. */
  evidence: z.array(z.string()),
});
export type RuleFinding = z.infer<typeof RuleFindingSchema>;

/**
 * The full context object sent to every AI route.
 *
 * `canonFacts`       — approved, immutable project-level facts
 * `branchFacts`      — branch-specific overrides/additions (never silently replace canon)
 * `sceneHistory`     — ordered list of scene titles already in the sequence
 * `characterSummary` — locked character description for continuity checks
 * `branchName`       — the branch being evaluated ("canon" for the main timeline)
 * `ruleFindings`     — contradictions the rule engine already computed. Optional
 *                      so existing callers keep working; when present, the
 *                      continuity prompt asks the model to explain them rather
 *                      than to hunt for its own.
 */
export const CanonContextSchema = z.object({
  projectId: z.string().min(1),
  branchName: z.string().min(1),
  canonFacts: z.array(CanonFactSchema),
  branchFacts: z.array(CanonFactSchema),
  sceneHistory: z.array(z.string()),
  characterSummary: z.string(),
  ruleFindings: z.array(RuleFindingSchema).optional(),
});
export type CanonContext = z.infer<typeof CanonContextSchema>;

// ---------------------------------------------------------------------------
// Continuity review
// ---------------------------------------------------------------------------

export const SeveritySchema = z.enum(["critical", "major", "minor"]);
export type Severity = z.infer<typeof SeveritySchema>;

/**
 * A single issue found by the continuity inspector.
 */
export const ContinuityFindingSchema = z.object({
  severity: SeveritySchema,
  /** Human-readable title, e.g. "Impossible object use after disposal" */
  title: z.string().min(1),
  /** Canonical evidence: which scene established the contradicted fact */
  canonEvidence: z.string().min(1),
  /** The scene number where the contradiction occurs */
  affectedScene: z.number().int().positive(),
  /** Full explanation of why this is a continuity error */
  explanation: z.string().min(1),
  /** Concrete suggestion for how the author can resolve it */
  suggestedFix: z.string().min(1),
});
export type ContinuityFinding = z.infer<typeof ContinuityFindingSchema>;

/**
 * The complete structured response from the continuity inspector route.
 */
export const ContinuityReviewResponseSchema = z.object({
  branchName: z.string().min(1),
  reviewedAt: z.string().datetime(),
  findings: z.array(ContinuityFindingSchema),
  summary: z.string(),
  /** AI must flag when it is uncertain — human review required */
  requiresHumanReview: z.boolean(),
});
export type ContinuityReviewResponse = z.infer<
  typeof ContinuityReviewResponseSchema
>;

// ---------------------------------------------------------------------------
// Merge assistant
// ---------------------------------------------------------------------------

export const MergeStrategySchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().min(1),
  /** Comma-separated or structured tradeoffs */
  tradeoffs: z.string().min(1),
  /** Scene IDs the strategy would include from the branch */
  includedSceneIds: z.array(z.string()),
});
export type MergeStrategy = z.infer<typeof MergeStrategySchema>;

/**
 * Full structured response from the merge assistant route.
 */
export const MergeAssistantResponseSchema = z.object({
  branchName: z.string().min(1),
  branchSummary: z.string().min(1),
  /** Changes that integrate cleanly without touching canon facts */
  compatibleChanges: z.array(z.string()),
  /** Changes that directly conflict with canon and require a decision */
  trueConflicts: z.array(z.string()),
  /** Two or three ranked strategies the author can choose from */
  strategies: z.array(MergeStrategySchema).min(2).max(3),
  /** AI must never execute a merge — always preview only */
  previewOnly: z.literal(true),
});
export type MergeAssistantResponse = z.infer<typeof MergeAssistantResponseSchema>;

// ---------------------------------------------------------------------------
// Character refinement
// ---------------------------------------------------------------------------

/**
 * Proposed update returned by the character-refinement endpoint.
 * Does NOT change the locked canon character — must be explicitly approved.
 */
export const CharacterRefinementResponseSchema = z.object({
  characterId: z.string().min(1),
  proposedDescription: z.string().min(1),
  /** Updated generation instruction for the image pipeline */
  proposedGenerationInstruction: z.string().min(1),
  /** What traits were changed and why */
  changeRationale: z.string().min(1),
  /** AI preview only — requires user approval before locking */
  requiresApproval: z.literal(true),
});
export type CharacterRefinementResponse = z.infer<
  typeof CharacterRefinementResponseSchema
>;

// ---------------------------------------------------------------------------
// Panel generation request
// ---------------------------------------------------------------------------

/**
 * The request contract sent to the panel-generation service (or its fallback).
 * This is what Farin builds and passes to the image pipeline.
 */
export const PanelGenerationRequestSchema = z.object({
  projectId: z.string().min(1),
  sceneId: z.string().min(1),
  /** Locked character description at the time of generation */
  lockedCharacterDescription: z.string().min(1),
  /** Canonical world facts relevant to this panel */
  canonFacts: z.array(CanonFactSchema),
  /** Panel-specific scene description for the image model */
  sceneDescription: z.string().min(1),
  /** Visual style instruction, e.g. "graphic novel, high-contrast ink, muted blues" */
  styleInstruction: z.string().min(1),
  /** When true, return a deterministic prepared asset instead of calling the model */
  useFallback: z.boolean().default(false),
});
export type PanelGenerationRequest = z.infer<typeof PanelGenerationRequestSchema>;
