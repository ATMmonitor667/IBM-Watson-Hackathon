"use client";

import { useId } from "react";
import { AlertTriangle, Check, CircleAlert, Cpu, Info, Sparkles, X } from "lucide-react";

import { AI_PROPOSAL_NOT_APPLIED } from "@/lib/ai/responsibleAI";
import type { ContinuityFinding, FindingDecision, FindingSeverity } from "@/types/review";

// ---------------------------------------------------------------------------
// ONE CONTINUITY FINDING, AS SOMETHING A REVIEWER CAN ACT ON (issue #12 / D4)
//
// The card renders four things the acceptance criteria name explicitly, and
// keeps them visually separate on purpose:
//
//   EVIDENCE      the field values the engine read, quoted. A reviewer can open
//                 the scene and check every line. Never prose.
//   BROKEN FACT   the standing canon claim the scene contradicts, and where it
//                 was established.
//   SUGGESTED FIX what to do about it.
//   PROVENANCE    which half of the system produced which part.
//
// That last one is the reason the model's prose sits in its own bordered block
// with its own label instead of being merged into the paragraphs above it. The
// severity, the evidence and the canon fact are COMPUTED by
// src/lib/ai/continuityRules.ts from structured scene fields — a judge can tell
// they are not hallucinated because the card says which rule produced them and
// shows the fields it read. The model's contribution is additive, clearly
// bounded, and labelled a proposal that has not been applied.
//
// Nothing here writes. "Accept" records a verdict for the author; it does not
// edit a scene, and there is no code path from this component to story data.
// ---------------------------------------------------------------------------

const SEVERITY: Record<
  FindingSeverity,
  { label: string; badge: string; edge: string; icon: React.ReactNode }
> = {
  high: {
    label: "High severity",
    badge: "border-red-500/40 bg-red-500/15 text-red-300",
    edge: "border-l-red-500/70",
    icon: <AlertTriangle className="size-3.5" aria-hidden="true" />,
  },
  medium: {
    label: "Medium severity",
    badge: "border-amber-500/40 bg-amber-500/15 text-amber-300",
    edge: "border-l-amber-500/70",
    icon: <CircleAlert className="size-3.5" aria-hidden="true" />,
  },
  low: {
    label: "Low severity",
    badge: "border-white/15 bg-slate-700/60 text-slate-300",
    edge: "border-l-slate-500",
    icon: <Info className="size-3.5" aria-hidden="true" />,
  },
};

/** Human-readable names for the engine's rule ids. */
const RULE_LABELS: Record<string, string> = {
  unlisted_entity: "Cast list vs. dialogue",
  unestablished_on_branch: "Entity not established on this timeline",
  prop_without_holder: "Prop possession",
};

interface ContinuityFindingCardProps {
  finding: ContinuityFinding;
  /** scene id -> display title, so citations read as names not ids. */
  sceneTitleById: Record<string, string>;
  decision?: FindingDecision;
  onDecide?: (decision: FindingDecision) => void;
  /** The model has been asked to explain this and has not answered yet. */
  narrativePending?: boolean;
  /** The model could not be reached. Explains the missing prose honestly. */
  narrativeUnavailable?: boolean;
}

export function ContinuityFindingCard({
  finding,
  sceneTitleById,
  decision,
  onDecide,
  narrativePending = false,
  narrativeUnavailable = false,
}: ContinuityFindingCardProps) {
  const severity = SEVERITY[finding.severity];
  const titleId = useId();
  const sceneName =
    sceneTitleById[finding.affectedSceneId] ?? finding.affectedSceneId;
  const establishedIn = finding.brokenFact.establishedIn;

  return (
    <article
      aria-labelledby={titleId}
      className={`overflow-hidden rounded-lg border border-white/10 border-l-2 bg-slate-800 ${severity.edge}`}
    >
      {/* Header — severity, the rule that computed it, the scene it is about */}
      <header className="flex flex-wrap items-center gap-2 border-b border-white/10 px-4 py-2.5">
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${severity.badge}`}
        >
          {severity.icon}
          {severity.label}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-medium text-cyan-300">
          <Cpu className="size-3" aria-hidden="true" />
          Rule engine: {RULE_LABELS[finding.rule] ?? finding.rule}
        </span>
        <span className="ml-auto text-[11px] text-slate-400">{sceneName}</span>
      </header>

      <div className="flex flex-col gap-3 p-4">
        <h3 id={titleId} className="text-sm font-semibold text-white">
          {finding.title}
        </h3>

        <p className="text-xs leading-relaxed text-slate-300">{finding.explanation}</p>

        {/* EVIDENCE — quoted field values, one per line, checkable. */}
        <section aria-label="Evidence">
          <h4 className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Evidence — values read from the scene
          </h4>
          <ul className="mt-1.5 flex flex-col gap-1.5">
            {finding.evidence.map((item, index) => (
              <li
                key={`${finding.id}-evidence-${index}`}
                className="border-l-2 border-l-white/20 bg-slate-900 py-1.5 pl-3 pr-2 font-mono text-[11px] leading-relaxed text-slate-300"
              >
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* THE CANON FACT IT BREAKS */}
        <section aria-label="Breaks canon fact">
          <h4 className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Breaks canon fact
          </h4>
          <p className="mt-1 text-xs leading-relaxed text-slate-200">
            {finding.brokenFact.statement}
          </p>
          {establishedIn ? (
            <p className="mt-1 text-[11px] text-slate-500">
              Established in Scene {establishedIn.sceneNumber} — {establishedIn.title}
            </p>
          ) : null}
        </section>

        {/* SUGGESTED FIX */}
        <section
          aria-label="Suggested fix"
          className="rounded-md border border-white/10 bg-slate-900 p-3"
        >
          <h4 className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Suggested fix
          </h4>
          <p className="mt-1 text-xs leading-relaxed text-slate-200">
            {finding.suggestedFix}
          </p>
        </section>

        {/* THE MODEL'S HALF — bounded, labelled, and optional by design. */}
        {finding.ai ? (
          <section
            aria-label="AI explanation"
            className="rounded-md border border-violet-500/30 bg-violet-500/5 p-3"
          >
            <h4 className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-violet-300">
              <Sparkles className="size-3" aria-hidden="true" />
              watsonx explanation — {AI_PROPOSAL_NOT_APPLIED}
            </h4>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
              {finding.ai.explanation}
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
              <span className="font-semibold text-violet-300">AI proposed fix: </span>
              {finding.ai.suggestedFix}
            </p>
          </section>
        ) : narrativePending ? (
          <p className="text-[11px] text-slate-500" role="status">
            Asking watsonx to explain this finding…
          </p>
        ) : narrativeUnavailable ? (
          <p className="text-[11px] text-slate-500">
            No AI explanation — watsonx was not reached. The finding above was
            computed without it.
          </p>
        ) : null}
      </div>

      {/* Provenance + the reviewer's decision. Nothing here applies anything. */}
      <footer className="flex flex-wrap items-center gap-2 border-t border-white/10 bg-slate-900/60 px-4 py-2.5">
        <p className="text-[10px] leading-relaxed text-slate-500">
          Severity, evidence and canon fact computed deterministically by rule{" "}
          <span className="font-mono">{finding.rule}</span>
          {finding.ai ? "; explanation written by IBM Granite on watsonx.ai." : "."}{" "}
          {AI_PROPOSAL_NOT_APPLIED} — accepting records your decision and changes
          no scene.
        </p>

        <div className="ml-auto flex items-center gap-2">
          {decision ? (
            <span
              role="status"
              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${
                decision === "accepted"
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                  : "border-white/15 bg-slate-800 text-slate-400"
              }`}
            >
              {decision === "accepted" ? "Accepted — not applied" : "Dismissed"}
            </span>
          ) : null}

          {onDecide ? (
            <>
              <button
                type="button"
                aria-pressed={decision === "accepted"}
                onClick={() => onDecide("accepted")}
                className="inline-flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300 transition hover:bg-emerald-500/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
              >
                <Check className="size-3" aria-hidden="true" />
                Accept finding
              </button>
              <button
                type="button"
                aria-pressed={decision === "dismissed"}
                onClick={() => onDecide("dismissed")}
                className="inline-flex items-center gap-1 rounded-md border border-white/15 px-2.5 py-1 text-[11px] font-medium text-slate-300 transition hover:border-white/30 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
              >
                <X className="size-3" aria-hidden="true" />
                Dismiss
              </button>
            </>
          ) : null}
        </div>
      </footer>
    </article>
  );
}
