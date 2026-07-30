"use client";

import {
  ArrowRight,
  Check,
  GitCompareArrows,
  ImageIcon,
  Plus,
} from "lucide-react";

import { FieldDiff } from "@/components/story/field-diff";
import { AppImage } from "@/components/ui/AppImage";
import {
  compareBranchToCanon,
  type SceneComparison,
  type SceneDiffStatus,
} from "@/lib/story/branchDiff";
import { cn } from "@/lib/utils";
import type { Branch, Scene } from "@/types/workspace";

interface BranchDiffViewProps {
  canonBranch: Branch;
  branch: Branch;
}

const STATUS_STYLES: Record<
  SceneDiffStatus,
  { label: string; className: string; icon: React.ReactNode }
> = {
  unchanged: {
    label: "Unchanged",
    className: "border-slate-600 bg-slate-700/50 text-slate-300",
    icon: <Check className="size-3" aria-hidden="true" />,
  },
  changed: {
    label: "Changed",
    className: "border-amber-500/40 bg-amber-500/10 text-amber-300",
    icon: <GitCompareArrows className="size-3" aria-hidden="true" />,
  },
  added: {
    label: "Added",
    className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    icon: <Plus className="size-3" aria-hidden="true" />,
  },
};

function ScenePane({
  scene,
  label,
  emptyMessage,
}: {
  scene?: Scene;
  label: string;
  emptyMessage: string;
}) {
  return (
    <section
      aria-label={scene ? `${label} scene ${scene.sceneNumber}` : `${label}: ${emptyMessage}`}
      className={cn(
        "min-w-0 overflow-hidden rounded-lg border bg-slate-900/70",
        scene ? "border-white/10" : "border-dashed border-white/10",
      )}
    >
      <div className="border-b border-white/10 px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          {label}
        </p>
      </div>

      {scene ? (
        <>
          <div className="relative h-32 w-full bg-slate-950 sm:h-36">
            {scene.imageUrl ? (
              <AppImage
                src={scene.imageUrl}
                alt={`Panel for ${scene.title}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-1 text-slate-600">
                <ImageIcon className="size-6" aria-hidden="true" />
                <span className="text-[10px]">No panel image</span>
              </div>
            )}
            <span className="absolute left-2 top-2 rounded-full bg-slate-950/85 px-2 py-0.5 text-[10px] font-semibold text-slate-300 backdrop-blur-sm">
              Scene {scene.sceneNumber}
            </span>
          </div>

          <div className="space-y-2 p-3">
            <div>
              <h3 className="text-sm font-medium text-white">{scene.title}</h3>
              <p className="mt-0.5 text-[11px] text-slate-500">{scene.location}</p>
            </div>
            <p className="text-xs leading-relaxed text-slate-400">
              {scene.dialogueExcerpt}
            </p>
            <dl className="grid grid-cols-1 gap-2 border-t border-white/10 pt-2 text-[11px] sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">Emotional beat</dt>
                <dd className="text-slate-300">{scene.emotionalBeat}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Characters</dt>
                <dd className="text-slate-300">{scene.characters.join(", ") || "None"}</dd>
              </div>
            </dl>
          </div>
        </>
      ) : (
        <div className="flex min-h-64 items-center justify-center p-6 text-center text-xs text-slate-500">
          {emptyMessage}
        </div>
      )}
    </section>
  );
}

function ComparisonCard({
  comparison,
  canonName,
  branchName,
}: {
  comparison: SceneComparison;
  canonName: string;
  branchName: string;
}) {
  const status = STATUS_STYLES[comparison.status];
  const title = comparison.branchScene.title;

  return (
    <article
      aria-label={`${title}: ${status.label}`}
      className="overflow-hidden rounded-xl border border-white/10 bg-slate-900/40"
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-2.5 sm:px-4">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-slate-200">{title}</p>
          <p className="mt-0.5 text-[10px] text-slate-500">
            {comparison.status === "unchanged"
              ? "Shared story history"
              : comparison.status === "added"
                ? "New on this branch"
                : `${comparison.changes.length} changed field${comparison.changes.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
            status.className,
          )}
        >
          {status.icon}
          {status.label}
        </span>
      </header>

      <div className="grid grid-cols-1 gap-2 p-2 sm:p-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-stretch">
        <ScenePane
          scene={comparison.canonScene}
          label={canonName}
          emptyMessage="This scene does not exist in canon."
        />

        <div className="flex items-center justify-center py-1 text-slate-600">
          <ArrowRight
            className="size-4 rotate-90 md:rotate-0"
            aria-hidden="true"
          />
          <span className="sr-only">compared with</span>
        </div>

        <ScenePane
          scene={comparison.branchScene}
          label={branchName}
          emptyMessage="This scene does not exist on the branch."
        />
      </div>

      {comparison.changes.length > 0 && (
        <section
          aria-label={`Changed fields for ${title}`}
          className="border-t border-white/10 bg-slate-950/50 p-3 sm:p-4"
        >
          <h4 className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Field changes
          </h4>
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {comparison.changes.map((change) => (
              <FieldDiff
                key={change.field}
                field={change.label}
                before={change.before}
                after={change.after}
              />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}

export function BranchDiffView({ canonBranch, branch }: BranchDiffViewProps) {
  const diff = compareBranchToCanon(canonBranch, branch);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-slate-900/60 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium text-slate-200">
            Comparing {canonBranch.name} with {branch.name}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Creative fields are compared after the branch point. Review metadata is ignored.
          </p>
        </div>

        <dl
          aria-label="Diff summary"
          className="flex flex-wrap items-center gap-2 text-[10px]"
        >
          {(Object.keys(STATUS_STYLES) as SceneDiffStatus[]).map((key) => (
            <div
              key={key}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-1",
                STATUS_STYLES[key].className,
              )}
            >
              <dt>{STATUS_STYLES[key].label}</dt>
              <dd className="font-semibold">{diff.counts[key]}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="flex flex-col gap-4">
        {diff.comparisons.map((comparison) => (
          <ComparisonCard
            key={comparison.id}
            comparison={comparison}
            canonName={canonBranch.name}
            branchName={branch.name}
          />
        ))}
      </div>
    </div>
  );
}
