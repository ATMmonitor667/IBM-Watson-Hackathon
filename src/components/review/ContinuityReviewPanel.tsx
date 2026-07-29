"use client";

import { AlertTriangle, CircleAlert, Info } from "lucide-react";
import type { ContinuityFinding, FindingSeverity } from "@/types/review";

const SEVERITY_STYLES: Record<FindingSeverity, { badge: string; icon: React.ReactNode }> = {
  high: {
    badge: "bg-red-500/20 text-red-300 border-red-500/30",
    icon: <AlertTriangle className="size-3.5" aria-hidden="true" />,
  },
  medium: {
    badge: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    icon: <CircleAlert className="size-3.5" aria-hidden="true" />,
  },
  low: {
    badge: "bg-slate-700 text-slate-300 border-white/10",
    icon: <Info className="size-3.5" aria-hidden="true" />,
  },
};

interface ContinuityReviewPanelProps {
  findings: ContinuityFinding[];
  sceneTitleById: Record<string, string>;
}

export function ContinuityReviewPanel({ findings, sceneTitleById }: ContinuityReviewPanelProps) {
  if (findings.length === 0) {
    return (
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
        No continuity issues found in this branch.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {findings.map((finding) => {
        const style = SEVERITY_STYLES[finding.severity];
        return (
          <div
            key={finding.id}
            className={`rounded-lg border p-3 ${style.badge.split(" ").slice(-1)[0]} bg-slate-800`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${style.badge}`}
                >
                  {style.icon}
                  {finding.severity}
                </span>
              </div>
              <span className="shrink-0 text-[10px] text-slate-500">
                {sceneTitleById[finding.affectedSceneId] ?? "Unknown scene"}
              </span>
            </div>

            <h4 className="mt-2 text-sm font-medium text-white">{finding.title}</h4>

            <p className="mt-1 rounded-md border border-white/10 bg-slate-900 p-2 text-xs italic leading-relaxed text-slate-300">
              {finding.evidence}
            </p>

            <p className="mt-2 text-xs leading-relaxed text-slate-400">{finding.explanation}</p>

            <p className="mt-2 text-xs leading-relaxed text-violet-300">
              <span className="font-semibold">Suggested fix: </span>
              {finding.suggestedFix}
            </p>
          </div>
        );
      })}
    </div>
  );
}
