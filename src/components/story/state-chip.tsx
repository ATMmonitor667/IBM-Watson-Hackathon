import {
  AlertTriangle,
  Check,
  CircleDot,
  CircleSlash,
  Eye,
  GitBranch,
  GitMerge,
  type LucideIcon,
} from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * StateChip — GitHub's state pill, resolved against Obsidian's geometry.
 * See STORYVERSE_DESIGN.txt §5.8.
 *
 * GitHub's pills are fully rounded; Obsidian has nothing pill-shaped. We keep
 * GitHub's icon and colour semantics but take the app's 4px radius — the icon
 * plus colour already carries the GitHub reading, and consistency wins.
 */
export type BranchState =
  | "draft"
  | "under_review"
  | "approved"
  | "merged"
  | "abandoned"
  | "conflict";

const STATES: Record<
  BranchState,
  { label: string; icon: LucideIcon; className: string }
> = {
  draft: {
    label: "Draft",
    icon: CircleDot,
    className: "text-sv-draft border-sv-draft/40 bg-sv-draft/15",
  },
  under_review: {
    label: "Under review",
    icon: Eye,
    className: "text-sv-review border-sv-review/40 bg-sv-review/15",
  },
  approved: {
    label: "Approved",
    icon: Check,
    className: "text-sv-canon border-sv-canon/40 bg-sv-canon/15",
  },
  merged: {
    label: "Merged",
    icon: GitMerge,
    className: "text-sv-canon border-sv-canon/40 bg-sv-canon/15",
  },
  abandoned: {
    label: "Abandoned",
    icon: CircleSlash,
    className: "text-sv-abandoned border-sv-abandoned/40 bg-sv-abandoned/15",
  },
  conflict: {
    label: "Contradiction",
    icon: AlertTriangle,
    className: "text-sv-conflict border-sv-conflict/40 bg-sv-conflict/15",
  },
};

function StateChip({
  state,
  label,
  className,
  ...props
}: React.ComponentPropsWithoutRef<"span"> & {
  state: BranchState;
  label?: string;
}) {
  const { label: defaultLabel, icon: Icon, className: tone } = STATES[state];

  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-1 rounded-md border px-1.5 text-micro font-medium",
        tone,
        className,
      )}
      {...props}
    >
      <Icon className="size-3" aria-hidden="true" />
      {label ?? defaultLabel}
    </span>
  );
}

/**
 * BranchChip — GitHub's branch reference. Monospace because a branch name is
 * an identifier, not prose. See STORYVERSE_DESIGN.txt §5.9.
 *
 * The canon branch takes the canon purple so "main" always reads as canon.
 */
function BranchChip({
  name,
  canon = false,
  className,
  ...props
}: React.ComponentPropsWithoutRef<"span"> & {
  name: string;
  canon?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-1 rounded-md border bg-sv-inset px-1.5 font-mono text-meta",
        canon
          ? "border-sv-canon/40 text-sv-canon"
          : "border-sv-edge text-sv-muted",
        className,
      )}
      {...props}
    >
      <GitBranch className="size-3" aria-hidden="true" />
      {name}
    </span>
  );
}

export { StateChip, BranchChip };
