"use client";

import * as React from "react";

import type { WorkspaceSnapshot } from "@/lib/db/queries";
import type { Branch, SceneWithVersion } from "@/lib/types/schemas";
import { useWorkspace } from "@/lib/store/workspace";

/**
 * The server-fetched domain snapshot, handed to the client tree.
 *
 * Two stores, deliberately split:
 *   store/workspace.ts       UI state — what is open, what is selected
 *   store/workspace-data.tsx domain data — read-only, fetched on the server
 *
 * The shell's sidebars are client components, so the project layout does the
 * fetching (through src/lib/db/queries.ts) and passes the result down here.
 * Nothing on the client ever queries, which is what keeps the "only
 * src/lib/db touches Supabase" rule true by construction rather than by
 * discipline.
 */

const WorkspaceDataContext = React.createContext<WorkspaceSnapshot | null>(
  null,
);

export function WorkspaceDataProvider({
  snapshot,
  children,
}: {
  snapshot: WorkspaceSnapshot;
  children: React.ReactNode;
}) {
  return (
    <WorkspaceDataContext.Provider value={snapshot}>
      {children}
    </WorkspaceDataContext.Provider>
  );
}

export function useWorkspaceData(): WorkspaceSnapshot {
  const snapshot = React.useContext(WorkspaceDataContext);
  if (!snapshot) {
    throw new Error(
      "useWorkspaceData must be used inside <WorkspaceDataProvider>",
    );
  }
  return snapshot;
}

/**
 * The timeline the workspace is currently on. Falls back to canon, so a null
 * or stale persisted branch id can never leave the workspace pointing at
 * nothing — the status bar always has a branch to show.
 */
export function useActiveBranch(): Branch {
  const { branches } = useWorkspaceData();
  const activeBranchId = useWorkspace((s) => s.activeBranchId);

  return React.useMemo(() => {
    const chosen = branches.find((b) => b.id === activeBranchId);
    return chosen ?? branches.find((b) => b.is_canon) ?? branches[0];
  }, [branches, activeBranchId]);
}

export function useActiveScenes(): SceneWithVersion[] {
  const { scenesByBranch } = useWorkspaceData();
  const branch = useActiveBranch();
  return scenesByBranch[branch.id] ?? [];
}

/**
 * The selected scene, resolved against the active timeline. Switching
 * timelines clears the selection rather than carrying a foreign scene id
 * across, so this falls back to the branch's opening scene.
 */
export function useSelectedScene(): SceneWithVersion | null {
  const scenes = useActiveScenes();
  const selectedSceneId = useWorkspace((s) => s.selectedSceneId);

  return React.useMemo(() => {
    return scenes.find((s) => s.id === selectedSceneId) ?? scenes[0] ?? null;
  }, [scenes, selectedSceneId]);
}

/** Display name for an author id — falls back to the id so nothing renders blank. */
export function useMemberName(userId: string): string {
  const { memberNames } = useWorkspaceData();
  return memberNames[userId] ?? userId;
}
