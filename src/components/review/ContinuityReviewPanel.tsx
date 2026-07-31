"use client";

import { CheckCircle2, Cpu, Loader2, ScanSearch, ShieldAlert, Sparkles } from "lucide-react";

import { AiDisclaimer } from "@/components/ai/AiDisclaimer";
import { ContinuityFindingCard } from "@/components/review/ContinuityFindingCard";
import type { BranchReview, FindingDecision } from "@/types/review";

// ---------------------------------------------------------------------------
// THE CANON REVIEW SURFACE (issue #12 / D4, PRD §8.5)
//
// FOUR STATES, NEVER COLLAPSED INTO THREE
//
//   not checked   no review has been run. Says so.
//   checking      the deterministic pass is running.
//   error         the review could not be produced. Says why, in an alert.
//   clean         the engine ran and found no contradictions.
//
// "Clean" and "not checked" look identical if you are careless with them, and
// the difference is the entire trustworthiness of the screen: one means the
// branch is safe to merge and the other means nobody has looked.
//
// The narrative banner is the same distinction one level down. Findings are
// computed locally, so they are always complete; the model's write-up is a
// separate thing that can be missing, and the banner says which it is rather
// than letting an absent explanation read as an absent problem.
// ---------------------------------------------------------------------------

interface ContinuityReviewPanelProps {
  /** null means no review has been run for this branch yet. */
  review: BranchReview | null;
  isLoading: boolean;
  /** The model is still writing explanations for findings already on screen. */
  isNarrativeLoading?: boolean;
  error: string | null;
  sceneTitleById: Record<string, string>;
  decisions?: Record<string, FindingDecision>;
  onDecide?: (findingId: string, decision: FindingDecision) => void;
}

export function ContinuityReviewPanel({
  review,
  isLoading,
  isNarrativeLoading = false,
  error,
  sceneTitleById,
  decisions = {},
  onDecide,
}: ContinuityReviewPanelProps) {
  // ---- error -------------------------------------------------------------
  if (error) {
    return (
      <div
        role="alert"
        className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300"
      >
        <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-medium">Canon review could not be run</p>
          <p className="mt-1 text-xs leading-relaxed text-red-200/80">{error}</p>
        </div>
      </div>
    );
  }

  // ---- checking ----------------------------------------------------------
  if (isLoading) {
    return (
      <div role="status" className="flex flex-col gap-2">
        <p className="flex items-center gap-2 text-xs text-slate-400">
          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          Running canon review on this branch…
        </p>
        {[1, 2].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-slate-800" aria-hidden="true" />
        ))}
      </div>
    );
  }

  // ---- not checked -------------------------------------------------------
  if (!review) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-white/10 bg-slate-800/60 p-4 text-sm text-slate-400">
        <ScanSearch className="mt-0.5 size-4 shrink-0 text-slate-500" aria-hidden="true" />
        <p className="text-xs leading-relaxed">
          This branch has not been checked yet. Run a canon review to see whether
          it contradicts the canon timeline.
        </p>
      </div>
    );
  }

  const { findings, narrative } = review;

  return (
    <div className="flex flex-col gap-3">
      {/* What produced this review, and whether the model got to speak. */}
      <div className="flex flex-col gap-2 rounded-lg border border-white/10 bg-slate-800/60 p-3">
        <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <Cpu className="size-3.5 shrink-0 text-cyan-400" aria-hidden="true" />
          <span>
            {findings.length === 0
              ? "The rule engine checked every scene on this branch against canon."
              : `${findings.length} contradiction${findings.length === 1 ? "" : "s"} computed from scene data on "${review.branchName}".`}
          </span>
        </p>

        {narrative.status === "ready" && narrative.summary ? (
          <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-400">
            <Sparkles className="mt-0.5 size-3.5 shrink-0 text-violet-400" aria-hidden="true" />
            <span>
              <span className="font-semibold text-violet-300">watsonx summary: </span>
              {narrative.summary}
            </span>
          </p>
        ) : null}

        {narrative.status === "pending" || isNarrativeLoading ? (
          <p role="status" className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            Asking watsonx to explain these findings…
          </p>
        ) : null}

        {narrative.status === "unavailable" ? (
          <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-amber-300/80">
            <ShieldAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            <span>
              AI explanations unavailable ({narrative.error}). The findings below
              were computed without the model and are complete as shown.
            </span>
          </p>
        ) : null}
      </div>

      {/* ---- clean ---------------------------------------------------- */}
      {findings.length === 0 ? (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-medium">No contradictions found</p>
            <p className="mt-1 text-xs leading-relaxed text-emerald-200/80">
              The rule engine compared this branch against canon and found
              nothing to raise. This is a completed check, not an unchecked
              branch.
            </p>
          </div>
        </div>
      ) : (
        <ol className="flex list-none flex-col gap-3">
          {findings.map((finding) => (
            <li key={finding.id}>
              <ContinuityFindingCard
                finding={finding}
                sceneTitleById={sceneTitleById}
                decision={decisions[finding.id]}
                onDecide={
                  onDecide ? (decision) => onDecide(finding.id, decision) : undefined
                }
                narrativePending={narrative.status === "pending" || isNarrativeLoading}
                narrativeUnavailable={narrative.status === "unavailable"}
              />
            </li>
          ))}
        </ol>
      )}

      <AiDisclaimer feature="continuityReview" />
    </div>
  );
}
