// ---------------------------------------------------------------------------
// Local workspace types — temporary until Rahat's shared types land
// ---------------------------------------------------------------------------

export type SceneStatus = "canon" | "draft" | "archived";

export type ProjectStatus = "In Progress" | "Draft" | "Complete" | "Archived";

export interface Scene {
  id: string;
  projectId: string;
  title: string;
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
