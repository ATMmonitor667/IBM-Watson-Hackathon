import { Users } from "lucide-react";

import { DataSourceBadge } from "@/components/workspace/DataSourceBadge";
import type { ProjectStatus } from "@/types/workspace";

interface ProjectHeaderProps {
  title: string;
  status?: ProjectStatus;
  createdAt: string; // ISO date string
  collaboratorCount?: number;
}

const STATUS_STYLES: Record<string, string> = {
  "In Progress": "bg-cyan-500/10 text-cyan-300 border-cyan-500/20",
  Draft:         "bg-slate-500/10 text-slate-400 border-slate-500/20",
  Complete:      "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  Archived:      "bg-yellow-500/10 text-yellow-300 border-yellow-500/20",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ProjectHeader({
  title,
  status = "In Progress",
  createdAt,
  collaboratorCount = 0,
}: ProjectHeaderProps) {
  const badgeStyle = STATUS_STYLES[status] ?? STATUS_STYLES["Draft"];

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 bg-slate-900/60 px-6 py-4">
      {/* Left: title + status */}
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-white">{title}</h1>
        <span
          className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${badgeStyle}`}
        >
          {status}
        </span>
        <DataSourceBadge />
      </div>

      {/* Right: meta info */}
      <div className="flex items-center gap-5 text-sm text-slate-400">
        {/* Creation date */}
        <span>
          Created{" "}
          <time dateTime={createdAt} className="text-slate-300">
            {formatDate(createdAt)}
          </time>
        </span>

        {/* Collaborator count */}
        <span className="flex items-center gap-1.5">
          <Users className="size-4" aria-hidden="true" />
          <span className="text-slate-300">{collaboratorCount}</span>
          <span className="sr-only">collaborators</span>
        </span>

        {/* Activity link placeholder */}
        <a
          href="#activity"
          className="text-violet-400 transition hover:text-violet-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
        >
          Activity
        </a>
      </div>
    </header>
  );
}
