import {
  getBranchScenes,
  getBranches,
  getLockedCharacterVersions,
  getProject,
  getWorldFacts,
} from "@/lib/db/queries";
import {
  CanonContextSchema,
  type CanonContext,
  type SceneWithVersion,
} from "@/lib/types/schemas";

/**
 * The grounding payload — step A2 in STORYVERSE_IMPLEMENTATION_PLAN.txt.
 *
 * This is the "retrieval" half of this project's RAG: instead of embedding
 * prose and hoping the right paragraph comes back, the context is assembled
 * from structured rows the creator actually authored — the canon bible, the
 * locked character sheets, and the scene sequence in order.
 *
 * THE ONE RULE: canonFacts and branchFacts stay separate, all the way into the
 * prompt. A fact that is true only on a what-if timeline is not canon, and
 * flattening the two lists is the fastest way to get a continuity check that
 * confidently contradicts itself.
 */
export async function buildCanonContext(
  projectId: string,
  branchId: string,
): Promise<CanonContext> {
  const [project, branches, facts, locked, scenes] = await Promise.all([
    getProject(projectId),
    getBranches(projectId),
    getWorldFacts(projectId, branchId),
    getLockedCharacterVersions(projectId),
    getBranchScenes(branchId),
  ]);

  if (!project) throw new Error(`canon-context: no project ${projectId}`);

  const branch = branches.find((b) => b.id === branchId);
  if (!branch) throw new Error(`canon-context: no branch ${branchId}`);

  // Scene ids are opaque; the model reasons far better about "S3" than about
  // "scene-wf-s3", and evidence citations come back in the same vocabulary.
  const context: CanonContext = {
    project: {
      title: project.title,
      premise: project.premise,
      visual_style: project.visual_style,
    },
    lockedCharacters: locked.map(({ character, version }) => ({
      name: character.name,
      traits: version.traits,
      clothing_rules: version.clothing_rules,
      palette: version.palette,
    })),
    canonFacts: facts.canon.map((fact) => ({
      kind: fact.kind,
      subject: fact.subject,
      statement: fact.statement,
      established_in: fact.established_in_scene_id,
    })),
    branchFacts: facts.branch.map((fact) => ({
      kind: fact.kind,
      subject: fact.subject,
      statement: fact.statement,
      established_in: fact.established_in_scene_id,
      branch: branch.name,
    })),
    scenes: scenes.map(toContextScene),
  };

  // Parse on the way out as well as on the way in. This payload is about to
  // become a prompt, and a malformed one fails as a confidently wrong answer
  // rather than as an error.
  return CanonContextSchema.parse(context);
}

function toContextScene(scene: SceneWithVersion) {
  return {
    id: scene.id,
    order: scene.order_index,
    title: scene.title,
    setting: scene.version.setting,
    time_of_day: scene.version.time_of_day,
    characters_present: scene.version.characters_present,
    props_used: scene.version.props_used,
    action: scene.version.action,
    dialogue: scene.version.dialogue,
  };
}

/**
 * The context as the text the model actually sees.
 *
 * Kept next to the builder so the two can never drift, and written as labelled
 * sections rather than raw JSON — instruction-tuned models follow a sectioned
 * brief more reliably than a wall of braces, and a human can read this in a
 * log when a finding looks wrong.
 */
export function renderCanonContext(context: CanonContext): string {
  const lines: string[] = [];

  lines.push(`PROJECT: ${context.project.title}`);
  lines.push(`PREMISE: ${context.project.premise}`);
  lines.push(`VISUAL STYLE: ${context.project.visual_style}`);
  lines.push("");

  if (context.lockedCharacters.length > 0) {
    lines.push("LOCKED CHARACTER DESIGNS (must not drift):");
    for (const character of context.lockedCharacters) {
      const traits = Object.entries(character.traits)
        .map(([key, value]) => `${key}: ${value}`)
        .join("; ");
      lines.push(`- ${character.name} — ${traits}`);
      for (const rule of character.clothing_rules) {
        lines.push(`    rule: ${rule}`);
      }
    }
    lines.push("");
  }

  lines.push("CANON FACTS (true on every timeline unless contradicted):");
  for (const fact of context.canonFacts) {
    const where = fact.established_in ? ` [${fact.established_in}]` : "";
    lines.push(`- (${fact.kind}) ${fact.subject}: ${fact.statement}${where}`);
  }
  lines.push("");

  if (context.branchFacts.length > 0) {
    lines.push("THIS TIMELINE ONLY (not canon):");
    for (const fact of context.branchFacts) {
      const where = fact.established_in ? ` [${fact.established_in}]` : "";
      lines.push(`- (${fact.kind}) ${fact.subject}: ${fact.statement}${where}`);
    }
    lines.push("");
  }

  lines.push("SCENES, IN ORDER:");
  for (const scene of context.scenes) {
    lines.push(`[${scene.id}] ${scene.title}`);
    lines.push(`  setting: ${scene.setting} — ${scene.time_of_day}`);
    lines.push(`  characters: ${scene.characters_present.join(", ") || "none"}`);
    lines.push(`  props_used: ${scene.props_used.join(", ") || "none"}`);
    lines.push(`  action: ${scene.action}`);
  }

  return lines.join("\n");
}
