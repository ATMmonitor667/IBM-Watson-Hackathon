"use client";

import {
  FileText,
  GitBranch,
  GitMerge,
  History,
  Lock,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import * as React from "react";

import { BranchChip } from "@/components/story/state-chip";
import { Box, BoxBody, BoxHeader, BoxRow } from "@/components/ui/box";
import { RelativeTime } from "@/components/ui/relative-time";
import { useWorkspace } from "@/lib/store/workspace";
import { useWorkspaceData } from "@/lib/store/workspace-data";
import type { ActivityKind } from "@/lib/types/schemas";
import { cn } from "@/lib/utils";

const KIND_ICONS: Record<ActivityKind, LucideIcon> = {
  scene_created: FileText,
  scene_updated: FileText,
  branch_created: GitBranch,
  branch_state_changed: GitBranch,
  character_locked: Lock,
  review_run: Sparkles,
  merge_completed: GitMerge,
};

/**
 * The activity feed — who changed what, on which timeline, when.
 *
 * Every mutation writes an activity_events row in the same transaction that
 * makes the change (plan §4, decision 4), so this pane is the audit trail for
 * "AI proposed, a human approved" as much as it is a changelog.
 */
export function ActivityFeed() {
  const { activity, branches, memberNames, scenesByBranch } =
    useWorkspaceData();
  const openTab = useWorkspace((s) => s.openTab);
  const selectScene = useWorkspace((s) => s.selectScene);

  const [filter, setFilter] = React.useState<string | null>(null);

  const branchNames = Object.fromEntries(branches.map((b) => [b.id, b.name]));
  const scenes = Object.fromEntries(
    Object.values(scenesByBranch)
      .flat()
      .map((s) => [s.id, s.title]),
  );

  const shown = filter
    ? activity.filter((event) => event.branch_id === filter)
    : activity;

  return (
    <div className="mx-auto max-w-3xl p-6">
      <Box>
        <BoxHeader
          actions={
            <div className="flex items-center gap-1">
              <FilterButton
                label="All"
                active={filter === null}
                onClick={() => setFilter(null)}
              />
              {branches.map((branch) => (
                <FilterButton
                  key={branch.id}
                  label={branch.name}
                  active={filter === branch.id}
                  onClick={() => setFilter(branch.id)}
                />
              ))}
            </div>
          }
        >
          <History className="size-4 text-sv-muted" aria-hidden="true" />
          Activity
        </BoxHeader>

        <BoxBody divided>
          {shown.length === 0 ? (
            <BoxRow>
              <span className="text-sv-muted">
                Nothing has happened on this timeline yet.
              </span>
            </BoxRow>
          ) : (
            shown.map((event) => {
              const Icon = KIND_ICONS[event.kind];
              const sceneTitle = event.subject_id
                ? scenes[event.subject_id]
                : undefined;

              return (
                <BoxRow key={event.id} className="items-start">
                  <Icon
                    className="mt-0.5 size-4 shrink-0 text-sv-muted"
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-ui text-sv-text">
                      <span className="font-medium">
                        {memberNames[event.actor_id] ?? event.actor_id}
                      </span>{" "}
                      <span className="text-sv-muted">{event.summary}</span>
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {event.branch_id ? (
                        <BranchChip
                          name={branchNames[event.branch_id] ?? event.branch_id}
                          canon={
                            branches.find((b) => b.id === event.branch_id)
                              ?.is_canon ?? false
                          }
                        />
                      ) : null}
                      {sceneTitle ? (
                        <button
                          type="button"
                          onClick={() => {
                            selectScene(event.subject_id!);
                            openTab({
                              id: event.subject_id!,
                              title: sceneTitle,
                              kind: "scene",
                            });
                          }}
                          className="text-meta text-sv-link hover:underline"
                        >
                          {sceneTitle}
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <RelativeTime
                    iso={event.created_at}
                    className="shrink-0 text-micro text-sv-faint"
                  />
                </BoxRow>
              );
            })
          )}
        </BoxBody>
      </Box>
    </div>
  );
}

function FilterButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "max-w-[180px] truncate rounded-md border px-2 py-0.5 font-mono text-micro transition-colors duration-120",
        active
          ? "border-sv-accent-edge bg-sv-accent-fill text-sv-accent"
          : "border-sv-edge text-sv-muted hover:bg-sv-raised hover:text-sv-text",
      )}
    >
      {label}
    </button>
  );
}
