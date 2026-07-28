import { z } from "zod";

/**
 * THE SHARED CONTRACT — step P1 in STORYVERSE_IMPLEMENTATION_PLAN.txt §5.
 *
 * Zod is the source of truth; every TypeScript type in the app is inferred
 * from a schema here. Three things must satisfy these schemas and stay
 * byte-compatible with each other:
 *
 *   src/lib/demo/fixtures.ts   the demo story, hand-written
 *   supabase/seed/seed.ts      the same story, in Postgres
 *   src/lib/ai/*               what the model is given and what it returns
 *
 * If those three ever disagree, the schema is wrong, not the data.
 *
 * OWNERSHIP: Rahat only. A silent edit here desynchronises four workstreams —
 * propose the change in the team chat first (plan §3).
 */

/* -------------------------------------------------------------------------- */
/* Primitives                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Identifiers are opaque strings, deliberately NOT `z.uuid()`.
 *
 * Postgres generates uuids, but the fixtures use readable slugs ("scene-s3",
 * "branch-what-if") because a failing test that says `expected 'scene-s3'`
 * costs seconds to read and one that says `expected '9f2c…'` costs minutes.
 * Nothing in the app parses an id, so the two coexist safely; the seed script
 * maps slug -> uuid once at insert time.
 */
export const IdSchema = z.string().min(1);

/** ISO-8601 timestamp. Postgres `timestamptz` serialises to exactly this. */
export const TimestampSchema = z.iso.datetime({ offset: true });

/* -------------------------------------------------------------------------- */
/* People and projects                                                         */
/* -------------------------------------------------------------------------- */

export const ProfileSchema = z.object({
  id: IdSchema,
  display_name: z.string().min(1),
  avatar_url: z.url().nullable(),
});

export const ProjectSchema = z.object({
  id: IdSchema,
  owner_id: IdSchema,
  title: z.string().min(1),
  premise: z.string(),
  visual_style: z.string(),
  format: z.enum(["comic", "animation", "storyboard"]),
  created_at: TimestampSchema,
});

export const MemberRoleSchema = z.enum(["owner", "collaborator", "viewer"]);

export const ProjectMemberSchema = z.object({
  project_id: IdSchema,
  user_id: IdSchema,
  role: MemberRoleSchema,
});

/* -------------------------------------------------------------------------- */
/* Branches (timelines)                                                        */
/* -------------------------------------------------------------------------- */

/**
 * User-facing copy calls these "timelines", never "branches" — see plan §11 on
 * not reading as a GitHub clone. The database keeps the engineering noun.
 */
export const BranchStateSchema = z.enum([
  "draft",
  "under_review",
  "approved",
  "merged",
  "abandoned",
]);

export const BranchSchema = z.object({
  id: IdSchema,
  project_id: IdSchema,
  name: z.string().min(1),
  parent_branch_id: IdSchema.nullable(),
  /** The scene the fork happened AT — the last shared scene, not the first divergent one. */
  branched_from_scene_id: IdSchema.nullable(),
  is_canon: z.boolean(),
  state: BranchStateSchema,
  created_by: IdSchema,
  created_at: TimestampSchema,
});

/* -------------------------------------------------------------------------- */
/* Characters                                                                  */
/* -------------------------------------------------------------------------- */

export const CharacterSchema = z.object({
  id: IdSchema,
  project_id: IdSchema,
  name: z.string().min(1),
  summary: z.string(),
  /** Null until a creator explicitly locks a version. The lock is a human act. */
  locked_version_id: IdSchema.nullable(),
});

export const CharacterVersionSchema = z.object({
  id: IdSchema,
  character_id: IdSchema,
  version_no: z.number().int().positive(),
  image_url: z.string().min(1),
  /** Hex swatches, in the order a colourist would read them. */
  palette: z.array(z.string()),
  /** Free-form design traits: { build: "slight", hair: "cropped, dark" }. */
  traits: z.record(z.string(), z.string()),
  clothing_rules: z.array(z.string()),
  created_by: IdSchema,
  created_at: TimestampSchema,
});

/* -------------------------------------------------------------------------- */
/* Scenes                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * A scene is a slot in a branch's ordered sequence; a scene_version is its
 * content at a point in time. Edits ALWAYS write a new version (plan §7, P7),
 * which is what makes the revision history and the visual diff honest.
 */
export const SceneSchema = z.object({
  id: IdSchema,
  project_id: IdSchema,
  branch_id: IdSchema,
  order_index: z.number().int().nonnegative(),
  title: z.string().min(1),
  current_version_id: IdSchema,
  /** Set when this row was copied into a new branch (plan §4, decision 1). */
  forked_from_scene_id: IdSchema.nullable(),
});

export const SceneVersionSchema = z.object({
  id: IdSchema,
  scene_id: IdSchema,
  version_no: z.number().int().positive(),
  panel_image_url: z.string().nullable(),
  setting: z.string(),
  time_of_day: z.string(),
  characters_present: z.array(IdSchema),
  dialogue: z.string(),
  action: z.string(),
  emotional_beat: z.string(),
  story_purpose: z.string(),
  /**
   * THE FIELD THE WHOLE DEMO TURNS ON.
   *
   * Prop possession is tracked structurally, so the continuity contradiction is
   * detectable deterministically instead of by asking a model to notice it in
   * prose. Alternate S3 gives the compass away; alternate S4 still lists it
   * here. That mismatch is the finding (plan §4, decision 2).
   */
  props_used: z.array(z.string()),
  author_id: IdSchema,
  created_at: TimestampSchema,
});

/**
 * What the UI actually renders: a scene joined to its current version.
 * No component should ever have to fetch a version separately.
 */
export const SceneWithVersionSchema = SceneSchema.extend({
  version: SceneVersionSchema,
});

/* -------------------------------------------------------------------------- */
/* World facts (the canon bible)                                               */
/* -------------------------------------------------------------------------- */

export const WorldFactKindSchema = z.enum([
  "character",
  "prop",
  "location",
  "rule",
  "event",
]);

export const WorldFactStatusSchema = z.enum([
  "canon",
  "branch",
  "draft",
  "rejected",
]);

export const WorldFactSchema = z.object({
  id: IdSchema,
  project_id: IdSchema,
  /** Null means the fact is canon — true on every branch until contradicted. */
  branch_id: IdSchema.nullable(),
  kind: WorldFactKindSchema,
  subject: z.string().min(1),
  statement: z.string().min(1),
  established_in_scene_id: IdSchema.nullable(),
  status: WorldFactStatusSchema,
});

/* -------------------------------------------------------------------------- */
/* Activity                                                                    */
/* -------------------------------------------------------------------------- */

export const ActivityKindSchema = z.enum([
  "scene_created",
  "scene_updated",
  "branch_created",
  "branch_state_changed",
  "character_locked",
  "review_run",
  "merge_completed",
]);

export const ActivityEventSchema = z.object({
  id: IdSchema,
  project_id: IdSchema,
  branch_id: IdSchema.nullable(),
  actor_id: IdSchema,
  kind: ActivityKindSchema,
  subject_id: IdSchema.nullable(),
  summary: z.string().min(1),
  created_at: TimestampSchema,
});

/* -------------------------------------------------------------------------- */
/* AI: what goes to the model                                                  */
/* -------------------------------------------------------------------------- */

/**
 * CanonContext is the grounding payload — the "R" in this project's RAG. It is
 * assembled from the database, never from free text, and canon facts are kept
 * separate from branch facts so the model can tell "always true" from "true
 * only on this timeline". Collapsing those two lists is the single easiest way
 * to make the continuity check wrong.
 */
export const CanonFactRefSchema = z.object({
  kind: WorldFactKindSchema,
  subject: z.string(),
  statement: z.string(),
  established_in: z.string().nullable(),
});

export const CanonContextSchema = z.object({
  project: z.object({
    title: z.string(),
    premise: z.string(),
    visual_style: z.string(),
  }),
  lockedCharacters: z.array(
    z.object({
      name: z.string(),
      traits: z.record(z.string(), z.string()),
      clothing_rules: z.array(z.string()),
      palette: z.array(z.string()),
    }),
  ),
  canonFacts: z.array(CanonFactRefSchema),
  branchFacts: z.array(CanonFactRefSchema.extend({ branch: z.string() })),
  scenes: z.array(
    z.object({
      id: IdSchema,
      order: z.number().int().nonnegative(),
      title: z.string(),
      setting: z.string(),
      time_of_day: z.string(),
      characters_present: z.array(z.string()),
      props_used: z.array(z.string()),
      action: z.string(),
      dialogue: z.string(),
    }),
  ),
});

/* -------------------------------------------------------------------------- */
/* AI: what comes back                                                         */
/* -------------------------------------------------------------------------- */

export const FindingSeveritySchema = z.enum(["high", "medium", "low"]);

export const FindingKindSchema = z.enum([
  "prop_state",
  "timeline",
  "character_knowledge",
  "location",
  "design_drift",
  "rule",
]);

/**
 * `source` records which half of the two-stage inspector produced the finding
 * (plan §7, A3). The rule engine finds contradictions deterministically; the
 * model explains them and proposes a fix. Surfacing that split in the UI is a
 * transparency feature, not debug output — a reviewer should be able to see
 * that the evidence came from state tracking, not from a model's say-so.
 */
export const FindingSourceSchema = z.enum(["rule", "model", "rule+model"]);

export const ContinuityFindingSchema = z.object({
  id: IdSchema,
  severity: FindingSeveritySchema,
  kind: FindingKindSchema,
  affected_scene_id: IdSchema,
  evidence: z
    .array(
      z.object({
        scene_id: IdSchema,
        quote_or_field: z.string(),
      }),
    )
    .min(1, "a finding without evidence is an opinion"),
  broken_fact: z.object({
    subject: z.string(),
    statement: z.string(),
    established_in_scene_id: IdSchema.nullable(),
  }),
  explanation: z.string(),
  suggested_fix: z.string(),
  source: FindingSourceSchema,
});

export const AiReviewSchema = z.object({
  id: IdSchema,
  project_id: IdSchema,
  branch_id: IdSchema,
  kind: z.enum(["continuity", "merge"]),
  status: z.enum(["pending", "complete", "failed"]),
  findings: z.array(ContinuityFindingSchema),
  model: z.string(),
  created_at: TimestampSchema,
});

/* -------------------------------------------------------------------------- */
/* AI: the merge assistant (read-only — it may never write canon)              */
/* -------------------------------------------------------------------------- */

export const MergeStrategySchema = z.object({
  id: IdSchema,
  label: z.string(),
  description: z.string(),
  includes_scene_version_ids: z.array(IdSchema),
  tradeoffs: z.string(),
  canon_impact: z.string(),
});

export const MergeAssistantResponseSchema = z.object({
  source_summary: z.string(),
  target_summary: z.string(),
  compatible_changes: z.array(
    z.object({ scene_id: IdSchema, reason: z.string() }),
  ),
  true_conflicts: z.array(
    z.object({ scene_id: IdSchema, reason: z.string() }),
  ),
  strategies: z.array(MergeStrategySchema).min(1).max(3),
});

export const MergeSchema = z.object({
  id: IdSchema,
  project_id: IdSchema,
  source_branch_id: IdSchema,
  target_branch_id: IdSchema,
  selected_scene_version_ids: z.array(IdSchema),
  reviewer_id: IdSchema,
  explanation: z.string(),
  created_at: TimestampSchema,
});

/* -------------------------------------------------------------------------- */
/* Inferred types                                                              */
/* -------------------------------------------------------------------------- */

export type Id = z.infer<typeof IdSchema>;
export type Profile = z.infer<typeof ProfileSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type MemberRole = z.infer<typeof MemberRoleSchema>;
export type ProjectMember = z.infer<typeof ProjectMemberSchema>;
export type BranchState = z.infer<typeof BranchStateSchema>;
export type Branch = z.infer<typeof BranchSchema>;
export type Character = z.infer<typeof CharacterSchema>;
export type CharacterVersion = z.infer<typeof CharacterVersionSchema>;
export type Scene = z.infer<typeof SceneSchema>;
export type SceneVersion = z.infer<typeof SceneVersionSchema>;
export type SceneWithVersion = z.infer<typeof SceneWithVersionSchema>;
export type WorldFactKind = z.infer<typeof WorldFactKindSchema>;
export type WorldFactStatus = z.infer<typeof WorldFactStatusSchema>;
export type WorldFact = z.infer<typeof WorldFactSchema>;
export type ActivityKind = z.infer<typeof ActivityKindSchema>;
export type ActivityEvent = z.infer<typeof ActivityEventSchema>;
export type CanonFactRef = z.infer<typeof CanonFactRefSchema>;
export type CanonContext = z.infer<typeof CanonContextSchema>;
export type FindingSeverity = z.infer<typeof FindingSeveritySchema>;
export type FindingKind = z.infer<typeof FindingKindSchema>;
export type FindingSource = z.infer<typeof FindingSourceSchema>;
export type ContinuityFinding = z.infer<typeof ContinuityFindingSchema>;
export type AiReview = z.infer<typeof AiReviewSchema>;
export type MergeStrategy = z.infer<typeof MergeStrategySchema>;
export type MergeAssistantResponse = z.infer<
  typeof MergeAssistantResponseSchema
>;
export type Merge = z.infer<typeof MergeSchema>;
