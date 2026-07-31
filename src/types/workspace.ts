// ---------------------------------------------------------------------------
// Local workspace types — temporary until Rahat's shared types land
// ---------------------------------------------------------------------------

export type SceneStatus = "canon" | "draft" | "archived";

/** Card-level review/approval lifecycle status */
export type SceneReviewStatus = "Draft" | "Under Review" | "Approved" | "Merged";

export type ProjectStatus = "In Progress" | "Draft" | "Complete" | "Archived";

export interface SceneContributor {
  id: string;
  displayName: string;
  avatarUrl?: string;
}

/**
 * A change of possession for a prop, authored as STORY DATA.
 *
 * This is a canon-bible row, not a finding: it records what the story says
 * happened to an object, in the scene where it happened. The continuity engine
 * (src/lib/ai/continuityRules.ts) walks these in timeline order and computes
 * whether a later scene can still use the prop. Writing the *finding* here
 * instead would be the hardcoding that issue #8 exists to remove.
 */
export interface PropEvent {
  /** The prop, spelled exactly as it appears in `propsUsed`. */
  prop: string;
  /**
   * Who is holding it once this scene is over. `null` means it has left this
   * timeline entirely — dropped, destroyed, lost.
   */
  holder: string | null;
  /** The authored beat this is drawn from. Quoted verbatim as evidence. */
  note: string;
}

export interface Scene {
  id: string;
  projectId: string;
  /** Display number shown on the badge, e.g. 1, 2, 3 */
  sceneNumber: number;
  title: string;
  /** Short location label, e.g. "Flooded Market District" */
  location: string;
  /** Dialogue or prose excerpt shown on the card */
  dialogueExcerpt: string;
  /** Structured action used by the visual diff and continuity review. */
  action?: string;
  /** Character names appearing in this scene */
  characters: string[];
  /** Structured props present in the scene. */
  propsUsed?: string[];
  /**
   * Possession changes this scene establishes. Read by the continuity engine
   * to track where a prop is; a scene that uses a prop whose holder is not
   * present produces a computed finding.
   */
  propEvents?: PropEvent[];
  /** Emotional beat label, e.g. "Tension", "Hope", "Loss" */
  emotionalBeat: string;
  /** Card review/approval status */
  reviewStatus: SceneReviewStatus;
  /**
   * AI-generated continuity finding. When present, a warning indicator is shown
   * on the scene card and branch-tree node. No interaction required — visual only.
   * Example: "Character Mira hasn't appeared since Scene 2 — introduce her again."
   */
  continuityFlag?: string;
  /** Optional panel image URL */
  imageUrl?: string;
  /** Contributor who last touched the scene */
  contributor: SceneContributor;
  /** Revision counter, e.g. 3 */
  revision: number;
  status: SceneStatus;
  order: number;
  parentId: string | null; // null = root scene
  createdAt: string;       // ISO date string
  updatedAt: string;
}

export interface Branch {
  id: string;
  projectId: string;
  name: string;
  sourceSceneId: string;   // scene this branch diverges from
  scenes: Scene[];
  isCanon: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Collaborator {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  ownerId: string;
  collaborators: Collaborator[];
  branches: Branch[];
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Form schemas (kept here until Rahat's Zod schemas land in lib/validations)
// ---------------------------------------------------------------------------

export interface ProjectFormValues {
  title: string;
  description: string;
  status: ProjectStatus;
}
