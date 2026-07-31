/**
 * src/lib/ai/contextBuilder.ts
 *
 * Builds a CanonContext for an AI request given a branch and the canon branch.
 *
 * Key invariant:
 *   A branch can NEVER silently overwrite a canon fact.
 *   If a branch scene contains a fact key that already exists in canon,
 *   it goes into `branchFacts` (not `canonFacts`), making the conflict
 *   visible to the continuity inspector.
 *
 * This module is pure — no I/O, no network calls.
 * Tests can run without any environment setup.
 */

import { type CanonContext, type CanonFact, type RuleFinding } from "./schemas";
import type { ComputedFinding } from "./continuityRules";
import type { Branch, Scene } from "@/types/workspace";

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

/**
 * Minimal scene representation consumed by the context builder.
 * Matches the subset of src/types/workspace.ts#Scene that the builder needs.
 */
export interface ContextScene {
  /** Workspace scene id, used to resolve rule findings to a scene number. */
  id?: string;
  sceneNumber: number;
  title: string;
  /** Object-state changes established in this scene, keyed by fact key */
  facts?: CanonFact[];
}

/**
 * Minimal branch representation consumed by the context builder.
 */
export interface ContextBranch {
  name: string;
  isCanon: boolean;
  scenes: ContextScene[];
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

/**
 * Builds the CanonContext that is sent to every AI call.
 *
 * @param branch        The branch being evaluated (may or may not be canon).
 * @param canonBranch   The authoritative canon branch of the same project.
 * @param projectId     The project identifier.
 * @param characterSummary  The locked character description.
 *
 * Canon facts are collected from canonBranch.scenes.
 * Branch facts are collected from branch.scenes, but only for keys that
 * DO NOT already exist in the canon set — new branch-only facts are included.
 * Facts whose key matches a canon fact are placed in branchFacts,
 * preserving the contradiction for the inspector to detect.
 */
export function buildCanonContext(
  branch: ContextBranch,
  canonBranch: ContextBranch,
  projectId: string,
  characterSummary: string,
  ruleFindings: ComputedFinding[] = []
): CanonContext {
  // ------------------------------------------------------------------
  // Collect canon facts (last writer wins within canon scenes)
  // ------------------------------------------------------------------
  const canonFactMap = new Map<string, CanonFact>();
  for (const scene of canonBranch.scenes) {
    for (const fact of scene.facts ?? []) {
      canonFactMap.set(fact.key, fact);
    }
  }

  // ------------------------------------------------------------------
  // Collect branch facts — never overwrite canon
  // When the branch IS the canon branch (self-review), there are no
  // branch-specific overrides to detect.
  // ------------------------------------------------------------------
  const branchFactMap = new Map<string, CanonFact>();
  if (branch.name !== canonBranch.name) {
    for (const scene of branch.scenes) {
      for (const fact of scene.facts ?? []) {
        // Place in branchFacts regardless of whether the key exists in canon.
        // If the key matches canon, the inspector can detect the contradiction.
        // If it's new, the scope remains clear (branch-only fact).
        branchFactMap.set(fact.key, fact);
      }
    }
  }

  // ------------------------------------------------------------------
  // Scene history — canon scenes ordered, then branch-only additions
  // ------------------------------------------------------------------
  const canonSceneIds = new Set(canonBranch.scenes.map((s) => s.sceneNumber));
  const canonHistory = [...canonBranch.scenes]
    .sort((a, b) => a.sceneNumber - b.sceneNumber)
    .map((s) => s.title);
  const branchOnlyHistory = [...branch.scenes]
    .filter((s) => !canonSceneIds.has(s.sceneNumber))
    .sort((a, b) => a.sceneNumber - b.sceneNumber)
    .map((s) => `[branch] ${s.title}`);

  return {
    projectId,
    branchName: branch.name,
    canonFacts: Array.from(canonFactMap.values()),
    branchFacts: Array.from(branchFactMap.values()),
    sceneHistory: [...canonHistory, ...branchOnlyHistory],
    characterSummary,
    ruleFindings: toRuleFindings(ruleFindings, [
      ...branch.scenes,
      ...canonBranch.scenes,
    ]),
  };
}

// ---------------------------------------------------------------------------
// Rule findings — what the engine already computed (issue #8 / D3)
// ---------------------------------------------------------------------------

/**
 * Carry the rule engine's findings into the context so the model EXPLAINS them
 * rather than hunting for its own.
 *
 * Only the scene id is translated (to the scene number the response schema and
 * the prompt speak in). Title, severity and evidence pass through untouched:
 * the evidence is the engine's statement about what the fields say, and it is
 * not the model's to revise.
 *
 * A finding whose scene is not in this context is dropped rather than sent with
 * a guessed number — a citation a reviewer cannot follow is worse than silence.
 */
export function toRuleFindings(
  findings: ComputedFinding[],
  scenes: ContextScene[]
): RuleFinding[] {
  const numberOf = new Map(
    scenes.filter((s) => s.id).map((s) => [s.id as string, s.sceneNumber])
  );

  return findings.flatMap((finding) => {
    const affectedScene = numberOf.get(finding.sceneId);
    if (affectedScene === undefined) return [];
    return [
      {
        id: finding.id,
        rule: finding.rule,
        severity: finding.severity,
        title: finding.title,
        affectedScene,
        evidence: finding.evidence,
      },
    ];
  });
}

// ---------------------------------------------------------------------------
// Workspace adapter
// ---------------------------------------------------------------------------

/**
 * Turn a workspace `Branch` into the builder's input, deriving canon facts from
 * the scenes' `propEvents`.
 *
 * This is the fix for the bug where the workspace passed only scene numbers and
 * titles: `buildCanonContext` had nothing to collect, so every continuity
 * request shipped `canonFacts: []` and `branchFacts: []` and the model was
 * asked to check a story it had not been told. The facts are DERIVED, not
 * written out — `propEvents` is the authored story data, the fact rows are a
 * mechanical projection of it, and the same events feed the rule engine.
 */
export function toContextBranch(branch: Branch): ContextBranch {
  return {
    name: branch.name,
    isCanon: branch.isCanon,
    scenes: branch.scenes.map((scene) => ({
      id: scene.id,
      sceneNumber: scene.sceneNumber,
      title: scene.title,
      facts: factsFromScene(scene),
    })),
  };
}

/**
 * `propEvents` as canon-bible rows.
 *
 * One key per prop (`compass_state`), so a branch that moves the compass
 * collides with canon's key and lands in `branchFacts` — which is exactly the
 * contradiction `findContradictions` is built to surface.
 */
export function factsFromScene(scene: Scene): CanonFact[] {
  return (scene.propEvents ?? []).map((event) => ({
    key: `${factKey(event.prop)}_state`,
    value: event.holder
      ? `in ${event.holder}'s possession — ${event.note}`
      : `no longer on this timeline — ${event.note}`,
    lockedInScene: scene.sceneNumber,
  }));
}

function factKey(prop: string): string {
  return prop
    .replace(/^(the|a|an)\s+/i, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

// ---------------------------------------------------------------------------
// Utility: detect contradictions between branch and canon facts
// ---------------------------------------------------------------------------

export interface CanonContradiction {
  key: string;
  canonValue: string;
  branchValue: string;
  canonLockedInScene: number;
  branchLockedInScene: number;
}

/**
 * Returns every fact key where the branch value differs from the canon value.
 * Used by the continuity inspector and tests.
 */
export function findContradictions(ctx: CanonContext): CanonContradiction[] {
  const canonMap = new Map(ctx.canonFacts.map((f) => [f.key, f]));
  const contradictions: CanonContradiction[] = [];

  for (const branchFact of ctx.branchFacts) {
    const canonFact = canonMap.get(branchFact.key);
    if (canonFact && canonFact.value !== branchFact.value) {
      contradictions.push({
        key: branchFact.key,
        canonValue: canonFact.value,
        branchValue: branchFact.value,
        canonLockedInScene: canonFact.lockedInScene,
        branchLockedInScene: branchFact.lockedInScene,
      });
    }
  }

  return contradictions;
}
