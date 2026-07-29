import { fixtures } from "@/lib/demo/fixtures";
import type {
  ActivityEvent,
  AiReview,
  Branch,
  Character,
  CharacterVersion,
  Project,
  SceneVersion,
  SceneWithVersion,
  WorldFact,
} from "@/lib/types/schemas";

/**
 * THE ONLY PLACE THAT READS DATA — step P2 in STORYVERSE_IMPLEMENTATION_PLAN.txt §0.2.
 *
 * THE RULE: nothing outside src/lib/db/* imports from @supabase. Every screen,
 * component, and AI prompt reads through this module. Today every function
 * returns fixtures; at step P5 the fixture branch is replaced with real
 * queries and not one component changes.
 *
 * NEXT_PUBLIC_USE_FIXTURES stays wired all the way to submission — it is also
 * the offline fallback if Supabase has a bad night during the recording.
 *
 * These functions are async even though the fixture path is synchronous. That
 * is deliberate: every caller is written against the shape it will have when
 * the data is coming over the wire, so P5 is a swap and not a refactor.
 */

/** Fixtures are the default. You have to opt OUT, so a missing env var can never blank the demo. */
export const USE_FIXTURES = process.env.NEXT_PUBLIC_USE_FIXTURES !== "0";

/**
 * Placeholder for the Supabase path. Throws loudly with the step that fills it
 * in, so an accidental NEXT_PUBLIC_USE_FIXTURES=0 fails at the call site with
 * a useful message instead of rendering an empty workspace.
 */
function notYet(fn: string): never {
  throw new Error(
    `queries.${fn}: the Supabase path lands at step P5. ` +
      `Unset NEXT_PUBLIC_USE_FIXTURES (or set it to 1) to use fixtures.`,
  );
}

/** Scene order is a product guarantee, not a database accident. */
function byOrder(a: SceneWithVersion, b: SceneWithVersion) {
  return a.order_index - b.order_index;
}

/* -------------------------------------------------------------------------- */
/* Project and members                                                         */
/* -------------------------------------------------------------------------- */

export async function getProject(projectId: string): Promise<Project | null> {
  if (!USE_FIXTURES) return notYet("getProject");
  return fixtures.project.id === projectId ? fixtures.project : null;
}

export async function getProjectMemberNames(
  projectId: string,
): Promise<Record<string, string>> {
  if (!USE_FIXTURES) return notYet("getProjectMemberNames");
  const memberIds = new Set(
    fixtures.members
      .filter((m) => m.project_id === projectId)
      .map((m) => m.user_id),
  );
  return Object.fromEntries(
    fixtures.profiles
      .filter((p) => memberIds.has(p.id))
      .map((p) => [p.id, p.display_name]),
  );
}

/* -------------------------------------------------------------------------- */
/* Branches                                                                    */
/* -------------------------------------------------------------------------- */

export async function getBranches(projectId: string): Promise<Branch[]> {
  if (!USE_FIXTURES) return notYet("getBranches");
  // Canon first — it is the spine of the tree and the default selection.
  return fixtures.branches
    .filter((b) => b.project_id === projectId)
    .sort((a, b) => Number(b.is_canon) - Number(a.is_canon));
}

export async function getCanonBranch(
  projectId: string,
): Promise<Branch | null> {
  if (!USE_FIXTURES) return notYet("getCanonBranch");
  return (
    fixtures.branches.find((b) => b.project_id === projectId && b.is_canon) ??
    null
  );
}

/* -------------------------------------------------------------------------- */
/* Scenes                                                                      */
/* -------------------------------------------------------------------------- */

export async function getBranchScenes(
  branchId: string,
): Promise<SceneWithVersion[]> {
  if (!USE_FIXTURES) return notYet("getBranchScenes");
  return fixtures.scenesWithVersions
    .filter((s) => s.branch_id === branchId)
    .sort(byOrder);
}

export async function getScene(
  sceneId: string,
): Promise<SceneWithVersion | null> {
  if (!USE_FIXTURES) return notYet("getScene");
  return fixtures.scenesWithVersions.find((s) => s.id === sceneId) ?? null;
}

/** Newest first — this is what the right sidebar's revision history renders. */
export async function getSceneVersions(
  sceneId: string,
): Promise<SceneVersion[]> {
  if (!USE_FIXTURES) return notYet("getSceneVersions");
  return fixtures.sceneVersions
    .filter((v) => v.scene_id === sceneId)
    .sort((a, b) => b.version_no - a.version_no);
}

/* -------------------------------------------------------------------------- */
/* Characters                                                                  */
/* -------------------------------------------------------------------------- */

export async function getCharacters(projectId: string): Promise<Character[]> {
  if (!USE_FIXTURES) return notYet("getCharacters");
  return fixtures.characters.filter((c) => c.project_id === projectId);
}

export async function getCharacterVersions(
  characterId: string,
): Promise<CharacterVersion[]> {
  if (!USE_FIXTURES) return notYet("getCharacterVersions");
  return fixtures.characterVersions
    .filter((v) => v.character_id === characterId)
    .sort((a, b) => a.version_no - b.version_no);
}

/**
 * The locked reference sheets for a project — the constraint every generated
 * panel and every design-drift check is measured against.
 */
export async function getLockedCharacterVersions(
  projectId: string,
): Promise<{ character: Character; version: CharacterVersion }[]> {
  if (!USE_FIXTURES) return notYet("getLockedCharacterVersions");
  const out: { character: Character; version: CharacterVersion }[] = [];
  for (const character of fixtures.characters) {
    if (character.project_id !== projectId || !character.locked_version_id) {
      continue;
    }
    const version = fixtures.characterVersions.find(
      (v) => v.id === character.locked_version_id,
    );
    if (version) out.push({ character, version });
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* World facts                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Canon facts and branch facts come back SEPARATELY and must stay that way all
 * the way into the model prompt. A fact that is true only on the what-if
 * timeline is not canon, and merging the two lists is the fastest route to a
 * continuity check that confidently contradicts itself.
 */
export async function getWorldFacts(
  projectId: string,
  branchId?: string,
): Promise<{ canon: WorldFact[]; branch: WorldFact[] }> {
  if (!USE_FIXTURES) return notYet("getWorldFacts");
  const forProject = fixtures.worldFacts.filter(
    (f) => f.project_id === projectId,
  );
  return {
    canon: forProject.filter((f) => f.branch_id === null),
    branch: branchId
      ? forProject.filter((f) => f.branch_id === branchId)
      : [],
  };
}

/* -------------------------------------------------------------------------- */
/* Reviews and activity                                                        */
/* -------------------------------------------------------------------------- */

export async function getLatestReview(
  branchId: string,
): Promise<AiReview | null> {
  if (!USE_FIXTURES) return notYet("getLatestReview");
  const reviews = fixtures.aiReviews
    .filter((r) => r.branch_id === branchId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  return reviews[0] ?? null;
}

export async function getActivity(
  projectId: string,
  limit = 20,
): Promise<ActivityEvent[]> {
  if (!USE_FIXTURES) return notYet("getActivity");
  return fixtures.activityEvents
    .filter((e) => e.project_id === projectId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit);
}

/* -------------------------------------------------------------------------- */
/* The workspace snapshot                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Everything the Obsidian chrome needs, in one call: the explorer's timelines
 * and scenes, the cast, the canon panel's facts, the open findings, and the
 * activity trail.
 *
 * The shell's sidebars are client components, so the project layout fetches
 * this on the server and hands it down through a provider. That keeps the
 * "nothing outside src/lib/db touches Supabase" rule true by construction —
 * there is no client-side data fetch to leak a key into.
 */
export type WorkspaceSnapshot = {
  project: Project;
  branches: Branch[];
  /** branch id -> that branch's scenes, in order. */
  scenesByBranch: Record<string, SceneWithVersion[]>;
  characters: Character[];
  lockedVersions: Record<string, CharacterVersion>;
  canonFacts: WorldFact[];
  branchFacts: WorldFact[];
  reviews: Record<string, AiReview>;
  activity: ActivityEvent[];
  memberNames: Record<string, string>;
};

export async function getWorkspaceSnapshot(
  projectId: string,
): Promise<WorkspaceSnapshot | null> {
  const project = await getProject(projectId);
  if (!project) return null;

  const [branches, characters, locked, activity, memberNames] =
    await Promise.all([
      getBranches(projectId),
      getCharacters(projectId),
      getLockedCharacterVersions(projectId),
      getActivity(projectId),
      getProjectMemberNames(projectId),
    ]);

  const scenesByBranch: Record<string, SceneWithVersion[]> = {};
  const reviews: Record<string, AiReview> = {};
  const branchFacts: WorldFact[] = [];

  for (const branch of branches) {
    scenesByBranch[branch.id] = await getBranchScenes(branch.id);

    const review = await getLatestReview(branch.id);
    if (review) reviews[branch.id] = review;

    const facts = await getWorldFacts(projectId, branch.id);
    branchFacts.push(...facts.branch);
  }

  const { canon: canonFacts } = await getWorldFacts(projectId);

  return {
    project,
    branches,
    scenesByBranch,
    characters,
    lockedVersions: Object.fromEntries(
      locked.map(({ character, version }) => [character.id, version]),
    ),
    canonFacts,
    branchFacts,
    reviews,
    activity,
    memberNames,
  };
}
