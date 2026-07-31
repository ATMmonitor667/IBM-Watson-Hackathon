import type { Branch, PropEvent, Scene } from "@/types/workspace";

/**
 * THE CONTINUITY RULE ENGINE (workspace model) — issue #8 / D3.
 *
 * Deterministic continuity checks computed from structured scene fields. It
 * FINDS contradictions; the watsonx call explains them and proposes fixes
 * (issue #12 / D4). Each half does what it is actually good at:
 *
 *   Rules alone   cannot explain themselves in narrative terms.
 *   A model alone is unreliable at tracking entity state across scenes and
 *                 will sometimes miss the contradiction on the take that counts.
 *
 * The split also degrades gracefully: with watsonx unavailable the findings
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
 * WHY THESE THREE RULES
 *
 * Everything they read is structural. `characters: string[]` is the cast (the
 * demo data uses it for objects as well as people — "The Compass" is a cast
 * entry in Scene 1), `propsUsed: string[]` is what is physically in the scene,
 * and `propEvents` is the canon bible's record of who ends up holding what. So
 * three things become checkable without reading prose:
 *
 *   1. The cast list and the dialogue disagree about who or what is present.
 *   2. An entity appears on a timeline that never introduced it.
 *   3. A scene uses a prop that, on this timeline, is not there to be used.
 *
 * All three cite concrete field values as evidence. A finding a reviewer cannot
 * verify is an opinion (PRD §20).
 */

export type ContinuityRuleId =
  | "unlisted_entity"
  | "unestablished_on_branch"
  | "prop_without_holder";

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
/* Rule 3 — a prop is used where nobody on this timeline can be holding it     */
/* -------------------------------------------------------------------------- */

/** Where a prop is, as of some point in a timeline. */
interface Possession {
  /** Who has it. `null` means it has left this timeline altogether. */
  holder: string | null;
  /** The scene that established this — cited as evidence. */
  establishedIn: Scene;
  event: PropEvent;
}

/**
 * Walk the timeline in order, carrying prop possession forward, and flag any
 * scene that uses a prop it cannot have.
 *
 * This is the rule that catches the demo's headline contradiction. It is
 * checkable from fields alone: `propEvents` says who ended up with the prop,
 * `propsUsed` says the prop is in this scene, and `characters` says who is
 * here. Nothing is inferred from prose.
 *
 * Possession is evaluated as the state ENTERING a scene, then the scene's own
 * events are applied. A scene in which the prop changes hands is therefore not
 * in contradiction with itself.
 *
 * It runs over the LINEAGE, not the branch in isolation, which is the whole
 * point: a branch inherits canon's possession state up to its divergence point
 * and then diverges from it. Canon has the same rule applied to it and stays
 * silent because canon never separates the compass from Kael — the silence is
 * computed, not assumed.
 */
function propPossession(lineage: Scene[]): ComputedFinding[] {
  const findings: ComputedFinding[] = [];
  const held = new Map<string, Possession>();

  for (const scene of lineage) {
    for (const prop of scene.propsUsed ?? []) {
      const current = held.get(prop);

      // Never established on this timeline, so there is no possession claim to
      // contradict. Props appearing for the first time is ordinary authoring.
      if (!current) continue;

      // The holder is in the scene, so the prop can be too.
      if (current.holder && scene.characters.includes(current.holder)) continue;

      const where = current.establishedIn;
      const gone = current.holder === null;

      findings.push({
        id: `rule-prop-${scene.id}-${slug(prop)}`,
        rule: "prop_without_holder",
        severity: "high",
        sceneId: scene.id,
        entity: prop,
        title: gone
          ? `${prop} is used after it leaves this timeline`
          : `${prop} is used while ${current.holder} is not in the scene`,
        message: gone
          ? `${scene.title} uses ${prop}, but on this timeline ` +
            `"${where.title}" (Scene ${where.sceneNumber}) took it out of the ` +
            `story. It is not there to be picked up.`
          : `${scene.title} uses ${prop}, but as of "${where.title}" ` +
            `(Scene ${where.sceneNumber}) ${current.holder} is holding it and ` +
            `${current.holder} is not in this scene.`,
        evidence: [
          `${scene.title} — propsUsed: [${(scene.propsUsed ?? []).join(", ")}]`,
          `"${current.event.note}" — established in "${where.title}" (Scene ${where.sceneNumber})`,
          gone
            ? `${where.title} left ${prop} with no holder on this timeline`
            : `${scene.title} — characters: [${scene.characters.join(", ")}] — ${current.holder} is absent`,
        ],
        suggestedFix: gone
          ? `Remove ${prop} from ${scene.title}'s props, or add a beat before ` +
            `it where ${prop} is recovered.`
          : `Remove ${prop} from ${scene.title}'s props, put ${current.holder} ` +
            `in the scene, or add a beat where ${prop} changes hands again.`,
      });

      // Said once. Repeating it for every later scene buries the finding that
      // actually needs a decision — same reasoning as rule 2.
      held.delete(prop);
    }

    for (const event of scene.propEvents ?? []) {
      held.set(event.prop, {
        holder: event.holder,
        establishedIn: scene,
        event,
      });
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
    // Rule 3 needs the inherited history to know where a prop started, but a
    // finding it raises on an inherited canon scene belongs to canon's review,
    // not this branch's — the filter below drops those.
    ...propPossession(lineage),
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
