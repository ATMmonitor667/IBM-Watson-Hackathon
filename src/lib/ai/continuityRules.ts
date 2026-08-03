import type { Branch, Scene } from "@/types/workspace";

/**
 * THE CONTINUITY RULE ENGINE (workspace model) — issue #8 / D3.
 *
 * Deterministic continuity checks computed from structured scene fields. It
 * FINDS contradictions; the model call explains them and proposes fixes
 * (issue #12 / D4). Each half does what it is actually good at:
 *
 *   Rules alone   cannot explain themselves in narrative terms.
 *   A model alone is unreliable at tracking entity state across scenes and
 *                 will sometimes miss the contradiction on the take that counts.
 *
 * The split also degrades gracefully: with the model unavailable the findings
 * still appear, because nothing here needs the network.
 *
 * ---------------------------------------------------------------------------
 * RELATIONSHIP TO src/lib/ai/rules.ts
 *
 * That file implements the same idea against the OTHER data model in this repo
 * (`@/lib/types/schemas`, which has `props_used` and `WorldFact` rows). This
 * file works against `@/types/workspace`, which is what the workspace UI
 * actually renders — different fields, therefore different rules. The two
 * converge when issue #5 (A3) decides which model survives; until then, this
 * is the one wired to the screen.
 * ---------------------------------------------------------------------------
 *
 * WHY THESE TWO RULES
 *
 * The workspace Scene has no `props` field. What it does have is
 * `characters: string[]` — which the demo data already uses for objects as well
 * as people ("The Compass" is a cast entry in Scene 1). So entity presence is
 * structural data, and two things become checkable without reading prose:
 *
 *   1. The cast list and the dialogue disagree about who or what is present.
 *   2. An entity appears on a timeline that never introduced it.
 *
 * Both cite concrete field values as evidence. A finding a reviewer cannot
 * verify is an opinion (PRD §20).
 */

export type ContinuityRuleId = "unlisted_entity" | "unestablished_on_branch";

export type ComputedSeverity = "high" | "medium" | "low";

export interface ComputedFinding {
  /** Deterministic — the same input always produces the same id. */
  id: string;
  rule: ContinuityRuleId;
  severity: ComputedSeverity;
  sceneId: string;
  /** The character or object the finding is about. */
  entity: string;
  /** Short headline, e.g. "The Compass is missing from the cast list". */
  title: string;
  /** One line, suitable for a scene card's continuity indicator. */
  message: string;
  /** Concrete field values, quoted. Never prose the engine invented. */
  evidence: string[];
  suggestedFix: string;
}

/* -------------------------------------------------------------------------- */
/* Entity matching                                                             */
/* -------------------------------------------------------------------------- */

/**
 * The searchable form of a cast entry: "The Compass" -> "compass".
 *
 * Cast entries are written as display names with articles; dialogue refers to
 * them without one, and sometimes in the plural ("Compasses don't point up").
 * Stripping the article and matching the head noun with an optional plural is
 * enough for this vocabulary and does not require a stemmer.
 */
function searchTerm(entity: string): string {
  return entity
    .replace(/^(the|a|an)\s+/i, "")
    .trim()
    .toLowerCase();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Does `text` refer to `entity`? Word-boundary match, optional plural. */
export function mentions(text: string, entity: string): boolean {
  const term = searchTerm(entity);
  if (!term) return false;
  return new RegExp(`\\b${escapeRegExp(term)}(?:s|es)?\\b`, "i").test(text);
}

/* -------------------------------------------------------------------------- */
/* Lineage                                                                     */
/* -------------------------------------------------------------------------- */

function byOrder(a: Scene, b: Scene): number {
  return a.order - b.order;
}

export function canonBranchOf(branches: Branch[]): Branch | undefined {
  return branches.find((b) => b.isCanon);
}

/**
 * The scenes a viewer of this branch has actually seen, in order.
 *
 * For canon that is simply its own scenes. For an alternate timeline it is the
 * canon scenes up to and including the divergence point, followed by the
 * branch's own scenes — which is the whole reason rule 2 can find anything:
 * canon scenes AFTER the branch point are not part of this timeline's history.
 */
export function lineageOf(branch: Branch, branches: Branch[]): Scene[] {
  const own = [...branch.scenes].sort(byOrder);
  if (branch.isCanon) return own;

  const canon = canonBranchOf(branches);
  if (!canon) return own;

  const canonScenes = [...canon.scenes].sort(byOrder);
  const forkedAt = canonScenes.find((s) => s.id === branch.sourceSceneId);

  // An unknown source scene means we cannot bound the shared history, so treat
  // the branch as standalone rather than guessing.
  if (!forkedAt) return own;

  const shared = canonScenes.filter((s) => s.order <= forkedAt.order);
  return [...shared, ...own];
}

/** Every entity named anywhere in the project — the known vocabulary. */
export function projectVocabulary(branches: Branch[]): string[] {
  const seen = new Set<string>();
  for (const branch of branches) {
    for (const scene of branch.scenes) {
      for (const entity of scene.characters) seen.add(entity);
    }
  }
  return [...seen];
}

/* -------------------------------------------------------------------------- */
/* Rule 1 — the cast list and the dialogue disagree                            */
/* -------------------------------------------------------------------------- */

/**
 * An entity the dialogue clearly involves is missing from `characters`.
 *
 * This is what makes a prop silently vanish from the story's structured data
 * while still driving the scene — the exact failure the canon bible is supposed
 * to prevent. It is checkable because both halves are fields: the quote and the
 * cast list.
 */
function unlistedEntities(scenes: Scene[], vocabulary: string[]): ComputedFinding[] {
  const findings: ComputedFinding[] = [];

  for (const scene of scenes) {
    const present = new Set(scene.characters);

    for (const entity of vocabulary) {
      if (present.has(entity)) continue;
      if (!mentions(scene.dialogueExcerpt, entity)) continue;

      findings.push({
        id: `rule-unlisted-${scene.id}-${slug(entity)}`,
        rule: "unlisted_entity",
        severity: "medium",
        sceneId: scene.id,
        entity,
        title: `${entity} is in the dialogue but not in the cast list`,
        message:
          `${entity} drives the dialogue in this scene but is missing from its ` +
          `cast list, so nothing downstream knows it is here.`,
        evidence: [
          `dialogueExcerpt: "${scene.dialogueExcerpt}"`,
          `characters: [${scene.characters.join(", ")}] — ${entity} is absent`,
        ],
        suggestedFix:
          `Add ${entity} to this scene's characters, or rewrite the line so the ` +
          `scene no longer depends on it being present.`,
      });
    }
  }

  return findings;
}

/* -------------------------------------------------------------------------- */
/* Rule 2 — an entity appears on a timeline that never introduced it           */
/* -------------------------------------------------------------------------- */

/**
 * Branching copies history up to the divergence point and no further. An entity
 * canon introduces AFTER that point has never been met by anyone reading this
 * timeline — so using it here is a continuity break that only exists because of
 * the branch, and cannot be seen by looking at either timeline alone.
 *
 * Canon has no divergence point, so this rule is silent on canon by
 * construction.
 */
function unestablishedOnBranch(
  branch: Branch,
  branches: Branch[],
): ComputedFinding[] {
  if (branch.isCanon) return [];

  const canon = canonBranchOf(branches);
  if (!canon) return [];

  const canonScenes = [...canon.scenes].sort(byOrder);
  const forkedAt = canonScenes.find((s) => s.id === branch.sourceSceneId);
  if (!forkedAt) return [];

  // Everything the audience has met by the time the timeline diverges.
  const known = new Set<string>();
  for (const scene of canonScenes.filter((s) => s.order <= forkedAt.order)) {
    for (const entity of scene.characters) known.add(entity);
  }

  const findings: ComputedFinding[] = [];

  for (const scene of [...branch.scenes].sort(byOrder)) {
    for (const entity of scene.characters) {
      if (known.has(entity)) continue;

      // Where does canon introduce it, if at all? That turns a vague "who is
      // this?" into a specific, checkable statement about the divergence.
      const canonDebut = canonScenes.find((s) => s.characters.includes(entity));

      findings.push({
        id: `rule-unestablished-${scene.id}-${slug(entity)}`,
        rule: "unestablished_on_branch",
        severity: "high",
        sceneId: scene.id,
        entity,
        title: `${entity} appears on this timeline without being introduced`,
        message: canonDebut
          ? `${entity} appears here, but canon only introduces them in Scene ` +
            `${canonDebut.sceneNumber} — after this timeline diverged at Scene ` +
            `${forkedAt.sceneNumber}. On this branch nobody has met them.`
          : `${entity} appears here without ever being introduced on this ` +
            `timeline or in canon.`,
        evidence: [
          `${scene.title} — characters: [${scene.characters.join(", ")}]`,
          `branch diverged at "${forkedAt.title}" (Scene ${forkedAt.sceneNumber})`,
          canonDebut
            ? `canon introduces ${entity} in "${canonDebut.title}" (Scene ${canonDebut.sceneNumber})`
            : `${entity} does not appear in canon at all`,
        ],
        suggestedFix: canonDebut
          ? `Introduce ${entity} on this timeline before this scene, or branch ` +
            `from Scene ${canonDebut.sceneNumber} instead so their introduction ` +
            `is inherited.`
          : `Add a scene that introduces ${entity} before this one.`,
      });

      // Introduced now, however awkwardly — do not flag every later scene.
      known.add(entity);
    }
  }

  return findings;
}

/* -------------------------------------------------------------------------- */
/* Public API                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Every continuity finding for one branch, computed from scene data.
 *
 * Ordered high severity first, then by scene order, so the worst problem in a
 * timeline is the first thing a reviewer reads.
 */
export function reviewBranch(
  branch: Branch,
  branches: Branch[],
): ComputedFinding[] {
  const lineage = lineageOf(branch, branches);
  const vocabulary = projectVocabulary(branches);

  // Rule 1 runs over this branch's own scenes only. Canon's scenes are canon's
  // problem, and reporting them on every branch would bury the branch's own.
  const own = [...branch.scenes].sort(byOrder);
  const ownIds = new Set(own.map((s) => s.id));

  const findings = [
    ...unlistedEntities(branch.isCanon ? lineage : own, vocabulary),
    ...unestablishedOnBranch(branch, branches),
  ].filter((f) => ownIds.has(f.sceneId) || branch.isCanon);

  const rank: Record<ComputedSeverity, number> = { high: 0, medium: 1, low: 2 };
  const orderOf = new Map(lineage.map((s, i) => [s.id, i]));

  return findings.sort(
    (a, b) =>
      rank[a.severity] - rank[b.severity] ||
      (orderOf.get(a.sceneId) ?? 0) - (orderOf.get(b.sceneId) ?? 0),
  );
}

/**
 * Findings reduced to one line per scene, for `Scene.continuityFlag`.
 *
 * This is what replaces the hand-written strings that used to sit in the demo
 * data. The scene card and the branch-tree node already render that field, so
 * they light up from computation with no change to either component.
 */
export function continuityFlagsFor(
  branch: Branch,
  branches: Branch[],
): Record<string, string> {
  const flags: Record<string, string> = {};

  // reviewBranch is already severity-ordered, so the first finding for a scene
  // is the most serious one — that is the one worth a single line.
  for (const finding of reviewBranch(branch, branches)) {
    if (!flags[finding.sceneId]) flags[finding.sceneId] = finding.message;
  }

  return flags;
}

/** Apply computed flags to a scene list without mutating the originals. */
export function withComputedFlags(
  scenes: Scene[],
  flags: Record<string, string>,
): Scene[] {
  return scenes.map((scene) =>
    flags[scene.id] ? { ...scene, continuityFlag: flags[scene.id] } : scene,
  );
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
