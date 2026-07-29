/**
 * src/lib/supabase/db.ts
 *
 * Typed helpers for every Storyverse read/write operation.
 * All functions accept a browser SupabaseClient so they can be used from
 * both client components and (with the server client) server actions.
 *
 * Column names follow the database schema (snake_case) and are mapped to
 * the frontend workspace types (camelCase) in the `map*` functions below.
 *
 * No network calls are ever made server-side from these helpers — they are
 * pure wrappers that let the caller decide which client to pass.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Project, Branch, Scene, SceneStatus, SceneReviewStatus, ProjectStatus } from "@/types/workspace";

// ---------------------------------------------------------------------------
// Row types — match the database schema exactly
// ---------------------------------------------------------------------------

interface ProjectRow {
  id: string;
  title: string;
  description: string;
  status: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

interface BranchRow {
  id: string;
  project_id: string;
  name: string;
  source_scene_id: string | null;
  is_canon: boolean;
  created_at: string;
  updated_at: string;
  scenes?: SceneRow[];
}

interface SceneRow {
  id: string;
  project_id: string;
  branch_id: string;
  scene_number: number;
  title: string;
  location: string;
  dialogue_excerpt: string;
  characters: string[];
  emotional_beat: string;
  review_status: string;
  continuity_flag: string | null;
  image_url: string | null;
  contributor_name: string;
  revision: number;
  status: string;
  order: number;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Mappers — db rows → frontend types
// ---------------------------------------------------------------------------

function mapScene(row: SceneRow): Scene {
  return {
    id: row.id,
    projectId: row.project_id,
    sceneNumber: row.scene_number,
    title: row.title,
    location: row.location,
    dialogueExcerpt: row.dialogue_excerpt,
    characters: row.characters ?? [],
    emotionalBeat: row.emotional_beat,
    reviewStatus: row.review_status as SceneReviewStatus,
    continuityFlag: row.continuity_flag ?? undefined,
    imageUrl: row.image_url ?? undefined,
    contributor: { id: "db", displayName: row.contributor_name },
    revision: row.revision,
    status: row.status as SceneStatus,
    order: row.order,
    parentId: row.parent_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapBranch(row: BranchRow): Branch {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    sourceSceneId: row.source_scene_id ?? "",
    scenes: (row.scenes ?? []).map(mapScene),
    isCanon: row.is_canon,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapProject(row: ProjectRow): Project {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status as ProjectStatus,
    ownerId: row.owner_id,
    collaborators: [],
    branches: [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

/** Load all projects the current user is a member of or owns. */
export async function fetchProjects(client: SupabaseClient): Promise<Project[]> {
  const { data, error } = await client
    .from("projects")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);
  return ((data ?? []) as ProjectRow[]).map(mapProject);
}

/** Insert a new project (owner defaults to the signed-in user). */
export async function insertProject(
  client: SupabaseClient,
  values: { title: string; description: string; status: ProjectStatus },
): Promise<Project> {
  const { data: userData } = await client.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Not authenticated");

  const { data, error } = await client
    .from("projects")
    .insert({
      title: values.title,
      description: values.description,
      status: values.status,
      owner_id: userId,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Also add as owner in project_members
  await client
    .from("project_members")
    .insert({ project_id: (data as ProjectRow).id, user_id: userId, role: "owner" })
    .throwOnError();

  return mapProject(data as ProjectRow);
}

// ---------------------------------------------------------------------------
// Branches for a project (with nested scenes)
// ---------------------------------------------------------------------------

export async function fetchBranches(
  client: SupabaseClient,
  projectId: string,
): Promise<Branch[]> {
  const { data, error } = await client
    .from("branches")
    .select(`
      *,
      scenes (*)
    `)
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return ((data ?? []) as BranchRow[]).map(mapBranch);
}

// ---------------------------------------------------------------------------
// Scenes for a project (flat list, all branches)
// ---------------------------------------------------------------------------

export async function fetchScenes(
  client: SupabaseClient,
  projectId: string,
): Promise<Scene[]> {
  const { data, error } = await client
    .from("scenes")
    .select("*")
    .eq("project_id", projectId)
    .order("order", { ascending: true });

  if (error) throw new Error(error.message);
  return ((data ?? []) as SceneRow[]).map(mapScene);
}

/** Insert a new scene row. */
export async function insertScene(
  client: SupabaseClient,
  scene: Omit<Scene, "contributor">,
  contributorName: string,
): Promise<Scene> {
  const { data, error } = await client
    .from("scenes")
    .insert({
      id: scene.id,
      project_id: scene.projectId,
      branch_id: scene.projectId,   // caller should pass the real branch_id via scene.id workaround
      scene_number: scene.sceneNumber,
      title: scene.title,
      location: scene.location,
      dialogue_excerpt: scene.dialogueExcerpt,
      characters: scene.characters,
      emotional_beat: scene.emotionalBeat,
      review_status: scene.reviewStatus,
      continuity_flag: scene.continuityFlag ?? null,
      image_url: scene.imageUrl ?? null,
      contributor_name: contributorName,
      revision: scene.revision,
      status: scene.status,
      order: scene.order,
      parent_id: scene.parentId,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapScene(data as SceneRow);
}

/** Insert a new branch row. */
export async function insertBranch(
  client: SupabaseClient,
  branch: Omit<Branch, "scenes">,
): Promise<Branch> {
  const { data, error } = await client
    .from("branches")
    .insert({
      id: branch.id,
      project_id: branch.projectId,
      name: branch.name,
      source_scene_id: branch.sourceSceneId || null,
      is_canon: branch.isCanon,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapBranch({ ...(data as BranchRow), scenes: [] });
}

// ---------------------------------------------------------------------------
// Activity events
// ---------------------------------------------------------------------------

export async function insertActivity(
  client: SupabaseClient,
  projectId: string,
  type: "merge" | "branch" | "scene" | "info",
  message: string,
): Promise<void> {
  const { data: userData } = await client.auth.getUser();
  await client
    .from("activity_events")
    .insert({
      project_id: projectId,
      user_id: userData.user?.id ?? null,
      type,
      message,
    })
    .throwOnError();
}
