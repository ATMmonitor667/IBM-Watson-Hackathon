import { sceneLabel } from "@/lib/format";
import type {
  Character,
  ContinuityFinding,
  SceneWithVersion,
  WorldFact,
} from "@/lib/types/schemas";

/**
 * THE CONTINUITY RULE ENGINE — stage 1 of step A3.
 *
 * Deterministic state tracking across a timeline's scenes. It finds
 * contradictions; the language model (stage 2) explains them and proposes
 * fixes. Each half does the job it is actually good at:
 *
 *   Rules alone   read like a hardcoded if-statement and cannot explain
 *                 themselves in narrative terms.
 *   A model alone is unreliable at tracking object state across scenes and
 *                 will sometimes miss the contradiction on the take that counts.
 *
 * Splitting them also means the app degrades gracefully: with the model
 * unavailable the finding still appears, labelled source:'rule'.
 *
 * ---------------------------------------------------------------------------
 * THE RULE THIS FILE IMPLEMENTS
 *
 *   A prop cannot appear in a scene unless whoever holds it is in that scene.
 *
 * That is ordinary continuity logic, and it is checkable because possession is
 * structural data: `props_used` says the prop is in the scene,
 * `characters_present` says who is there, and the canon bible says who is
 * holding it. No prose comprehension required.
 * ---------------------------------------------------------------------------
 */

/**
 * The fact grammar the canon bible is written in.
 *
 * The rule engine reads a deliberately narrow vocabulary — a transfer verb
 * plus two cast members means the prop changed hands; a possession verb plus
 * one means it did not. Anything outside this vocabulary is invisible to the
 * engine BY DESIGN, and that is the boundary where stage 2 takes over. It is
 * better to detect a narrow class of contradiction reliably than a wide class
 * unreliably, and the limitation is documented rather than hidden.
 */
const TRANSFER_VERBS =
  /\b(gave|gives|giving|given|hands|handed|passes|passed|presses|pressed|surrenders|surrendered|leaves|left)\b/i;

const POSSESSION_VERBS =
  /\b(possession|carries|carrying|holds|holding|keeps|kept|wears|wearing|has)\b/i;

type PossessionEvent = {
  /** Scene order this takes effect at. -1 means "before this timeline began". */
  at: number;
  holderId: string;
  fact: WorldFact;
};

export type RuleEngineInput = {
  /** The timeline's scenes, in order_index order. */
  scenes: SceneWithVersion[];
  /** Facts true on every timeline. */
  canonFacts: WorldFact[];
  /** Facts true only on this timeline. These override canon from their scene onward. */
  branchFacts: WorldFact[];
  /** The project's cast, used to resolve names in fact statements to ids. */
  characters: Character[];
};

/**
 * Run every rule over a timeline and return findings with hard evidence.
 *
 * Findings come back with source:'rule' and a plain deterministic explanation.
 * Stage 2 rewrites `explanation` and `suggested_fix` and flips `source` to
 * 'rule+model'; nothing else about the finding changes, because the evidence
 * is not the model's to revise.
 */
export function findContinuityIssues(
  input: RuleEngineInput,
): ContinuityFinding[] {
  return [...findPropPossessionIssues(input)];
}

/* -------------------------------------------------------------------------- */
/* Rule: a prop cannot be in a scene without its holder                        */
/* -------------------------------------------------------------------------- */

function findPropPossessionIssues({
  scenes,
  canonFacts,
  branchFacts,
  characters,
}: RuleEngineInput): ContinuityFinding[] {
  const findings: ContinuityFinding[] = [];
  const orderOf = sceneOrderLookup(scenes);
  const names = castLookup(characters);
  const nameOf = new Map(characters.map((c) => [c.id, c.name]));

  // Group possession events by prop, oldest first.
  const timeline = new Map<string, PossessionEvent[]>();
  for (const fact of [...canonFacts, ...branchFacts]) {
    if (fact.kind !== "prop") continue;

    const holderId = readHolder(fact.statement, names);
    if (!holderId) continue;

    const at = fact.established_in_scene_id
      ? // A fact established in a scene this timeline does not contain was
        // inherited from the parent timeline, so it predates every scene here.
        (orderOf.get(fact.established_in_scene_id) ?? -1)
      : -1;

    const events = timeline.get(fact.subject) ?? [];
    events.push({ at, holderId, fact });
    timeline.set(fact.subject, events);
  }

  for (const events of timeline.values()) {
    events.sort((a, b) => a.at - b.at);
  }

  for (const scene of scenes) {
    for (const prop of scene.version.props_used) {
      const events = timeline.get(prop);
      if (!events) continue;

      // Who holds it as of this scene? The most recent event at or before it.
      const current = lastBefore(events, scene.order_index);
      if (!current) continue;

      // The holder is here, so the prop can be too. No contradiction.
      if (scene.version.characters_present.includes(current.holderId)) continue;

      const holderName = nameOf.get(current.holderId) ?? current.holderId;
      const source = current.fact.established_in_scene_id;

      findings.push({
        id: `rule-prop-${scene.id}-${slug(prop)}`,
        severity: "high",
        kind: "prop_state",
        affected_scene_id: scene.id,
        evidence: [
          ...(source
            ? [
                {
                  scene_id: source,
                  quote_or_field: `${current.fact.statement} — established here`,
                },
              ]
            : []),
          {
            scene_id: scene.id,
            quote_or_field: `props_used: [${scene.version.props_used.join(", ")}]`,
          },
          {
            scene_id: scene.id,
            quote_or_field: `characters_present: [${scene.version.characters_present
              .map((id) => nameOf.get(id) ?? id)
              .join(", ")}] — ${holderName} is not in this scene`,
          },
        ],
        broken_fact: {
          subject: current.fact.subject,
          statement: current.fact.statement,
          established_in_scene_id: source,
        },
        explanation:
          `${sceneLabel(scene.title)} uses the ${prop}, but as of this point ` +
          `in the timeline ${holderName} is holding it and ${holderName} is ` +
          `not in the scene. The prop cannot be in two places at once.`,
        suggested_fix:
          `Either remove the ${prop} from ${sceneLabel(scene.title)}'s props, ` +
          `put ${holderName} in the scene, or add a beat before it where the ` +
          `${prop} changes hands again.`,
        source: "rule",
      });
    }
  }

  return findings;
}

/* -------------------------------------------------------------------------- */
/* Fact reading                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Which character ends up holding the prop, according to one fact statement.
 *
 * A transfer verb with two cast members named means the prop moved, and the
 * recipient is named second ("Wren gave the compass to the stranger"). A
 * possession verb with one means that character has it. Anything else returns
 * null and the fact is left for the model.
 */
function readHolder(
  statement: string,
  cast: { id: string; aliases: string[] }[],
): string | null {
  const haystack = statement.toLowerCase();

  const mentions: { id: string; at: number }[] = [];
  for (const member of cast) {
    const at = Math.min(
      ...member.aliases
        .map((alias) => haystack.indexOf(alias))
        .filter((index) => index >= 0),
    );
    if (Number.isFinite(at)) mentions.push({ id: member.id, at });
  }

  if (mentions.length === 0) return null;
  mentions.sort((a, b) => a.at - b.at);

  if (TRANSFER_VERBS.test(statement) && mentions.length >= 2) {
    return mentions[mentions.length - 1].id;
  }

  if (POSSESSION_VERBS.test(statement)) return mentions[0].id;

  return null;
}

/**
 * Names as they appear in prose. "The stranger" is also written "the stranger"
 * and just "stranger", so the article is stripped as an alias rather than
 * requiring the bible to be written in one exact form.
 */
function castLookup(
  characters: Character[],
): { id: string; aliases: string[] }[] {
  return characters.map((character) => {
    const name = character.name.toLowerCase();
    const withoutArticle = name.replace(/^(the|a|an)\s+/, "");
    return {
      id: character.id,
      aliases: Array.from(new Set([name, withoutArticle])),
    };
  });
}

function sceneOrderLookup(scenes: SceneWithVersion[]): Map<string, number> {
  return new Map(scenes.map((scene) => [scene.id, scene.order_index]));
}

function lastBefore(
  events: PossessionEvent[],
  order: number,
): PossessionEvent | null {
  let found: PossessionEvent | null = null;
  for (const event of events) {
    if (event.at > order) break;
    found = event;
  }
  return found;
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
