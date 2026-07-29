"use client";

import { BranchChip, StateChip } from "@/components/story/state-chip";
import {
  useActiveBranch,
  useActiveScenes,
  useWorkspaceData,
} from "@/lib/store/workspace-data";

/**
 * StatusBar — Obsidian's status bar. See STORYVERSE_DESIGN.txt §5.5.
 *
 * The branch chip is the demo's proof that canon is untouched while the
 * collaborator works on the alternate timeline, so it is always visible.
 */
export function StatusBar() {
  const { reviews } = useWorkspaceData();
  const branch = useActiveBranch();
  const scenes = useActiveScenes();

  const findings = reviews[branch.id]?.findings ?? [];

  return (
    <footer className="flex h-6 shrink-0 items-center gap-4 border-t border-sv-edge bg-sv-chrome px-3 text-micro text-sv-faint">
      <span className="flex items-center gap-1.5">
        <BranchChip name={branch.name} canon={branch.is_canon} />
        <StateChip state={branch.state} />
      </span>

      {findings.length > 0 ? (
        <span className="flex items-center gap-1.5 text-sv-conflict">
          <span
            aria-hidden="true"
            className="block size-1.5 rounded-full bg-sv-conflict"
          />
          {findings.length}{" "}
          {findings.length === 1 ? "contradiction" : "contradictions"}
        </span>
      ) : null}

      <span className="ml-auto flex items-center gap-4">
        <span>
          {scenes.length} {scenes.length === 1 ? "scene" : "scenes"}
        </span>
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="block size-1.5 rounded-full bg-sv-draft"
          />
          watsonx: ready
        </span>
        <span>Saved</span>
      </span>
    </footer>
  );
}
