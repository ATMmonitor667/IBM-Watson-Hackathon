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
  /** Character names appearing in this scene */
  characters: string[];
  /** Emotional beat label, e.g. "Tension", "Hope", "Loss" */
  emotionalBeat: string;
  /** Card review/approval status */
  reviewStatus: SceneReviewStatus;
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
