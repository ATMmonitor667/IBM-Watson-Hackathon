"use client";

import { Sparkles } from "lucide-react";
import * as React from "react";

import { StateChip } from "@/components/story/state-chip";
import { sceneLabel } from "@/lib/format";
import type { ContinuityFinding, FindingSeverity } from "@/lib/types/schemas";
import { cn } from "@/lib/utils";

const SEVERITY: Record<FindingSeverity, { border: string; label: string }> = {
  high: { border: "border-l-sv-conflict", label: "High severity" },
  medium: { border: "border-l-sv-review", label: "Medium severity" },
  low: { border: "border-l-sv-abandoned", label: "Low severity" },
};

const KIND_LABELS: Record<string, string> = {
  prop_state: "Prop continuity",
  timeline: "Timeline",
  character_knowledge: "Character knowledge",
  location: "Location",
  design_drift: "Design drift",
  rule: "World rule",
};

/**
 * A scene citation. Declared at module scope rather than inside FindingCard —
 * a component created during render is a new component type on every render,
 * which resets its state and defeats reconciliation.
 */
function SceneLink({
  sceneId,
  sceneTitles,
  onOpenScene,
}: {
  sceneId: string;
  sceneTitles: Record<string, string>;
  onOpenScene?: (sceneId: string) => void;
}) {
  const label = sceneLabel(sceneTitles[sceneId] ?? sceneId);

  if (!onOpenScene) {
    return <span className="font-mono text-meta text-sv-muted">{label}</span>;
  }

  return (
    <button
      type="button"
      onClick={() => onOpenScene(sceneId)}
      className="font-mono text-meta text-sv-link hover:underline"
    >
      {label}
    </button>
  );
}

export type FindingCardProps = React.ComponentPropsWithoutRef<"article"> & {
  finding: ContinuityFinding;
  /** scene id -> title, so the card can cite scenes by name instead of by id. */
  sceneTitles?: Record<string, string>;
  onOpenScene?: (sceneId: string) => void;
  /** Condensed rendering for the canon panel; full detail everywhere else. */
  compact?: boolean;
};

/**
 * FindingCard — GitHub's review comment, adapted for AI output.
 * See STORYVERSE_DESIGN.txt §5.12.
 *
 * It renders a ContinuityFinding straight from the contract, which means the
 * rule engine's output, the model's output, and the persisted ai_reviews row
 * all render through the same component with no adapter in between.
 *
 * The footer label is not decoration. Visible "AI proposes, human disposes"
 * labelling is a judged criterion, so it appears on every AI-authored surface
 * without exception — and `source` tells the reviewer whether the evidence
 * came from deterministic state tracking or from the model.
 */
function FindingCard({
  finding,
  sceneTitles = {},
  onOpenScene,
  compact = false,
  className,
  ...props
}: FindingCardProps) {
  const severity = SEVERITY[finding.severity];

  const label = (sceneId: string) =>
    sceneLabel(sceneTitles[sceneId] ?? sceneId);

  return (
    <article
      className={cn(
        "overflow-hidden rounded-lg border border-sv-edge border-l-2 bg-sv-box",
        severity.border,
        className,
      )}
      {...props}
    >
      <header
        className={cn(
          "flex flex-wrap items-center gap-2 border-b border-sv-edge-muted",
          compact ? "px-2.5 py-2" : "px-4 py-2.5",
        )}
      >
        <StateChip
          state={finding.severity === "high" ? "conflict" : "under_review"}
          label={compact ? undefined : severity.label}
        />
        {compact ? null : (
          <span className="text-meta text-sv-muted">
            {KIND_LABELS[finding.kind] ?? finding.kind}
          </span>
        )}
        <span className="ml-auto">
          <SceneLink
            sceneId={finding.affected_scene_id}
            sceneTitles={sceneTitles}
            onOpenScene={onOpenScene}
          />
        </span>
      </header>

      <div className={cn("space-y-3", compact ? "p-2.5" : "p-4")}>
        <p className={cn(compact ? "text-ui" : "text-body", "text-sv-text")}>
          {finding.explanation}
        </p>

        {compact ? null : (
          <>
            {/* Evidence — GitHub's blockquote pattern. A finding without it is
                an opinion, so the schema requires at least one entry. */}
            <ul className="space-y-1.5">
              {finding.evidence.map((item, index) => (
                <li
                  key={`${item.scene_id}-${index}`}
                  className="border-l-[3px] border-l-sv-edge-strong bg-sv-inset py-1.5 pl-3 pr-2"
                >
                  <p className="font-mono text-micro text-sv-muted">
                    {label(item.scene_id)}
                  </p>
                  <p className="mt-0.5 font-mono text-meta text-sv-text">
                    {item.quote_or_field}
                  </p>
                </li>
              ))}
            </ul>

            <div>
              <p className="text-micro uppercase tracking-wider text-sv-faint">
                Breaks canon fact
              </p>
              <p className="mt-1 text-ui text-sv-text">
                {finding.broken_fact.statement}{" "}
                {finding.broken_fact.established_in_scene_id ? (
                  <span className="text-sv-muted">
                    (established in{" "}
                    <SceneLink
                      sceneId={finding.broken_fact.established_in_scene_id}
                      sceneTitles={sceneTitles}
                      onOpenScene={onOpenScene}
                    />
                    )
                  </span>
                ) : null}
              </p>
            </div>

            <div className="rounded-md border border-sv-edge bg-sv-inset p-3">
              <p className="text-micro uppercase tracking-wider text-sv-faint">
                Suggested fix
              </p>
              <p className="mt-1 text-ui text-sv-text">
                {finding.suggested_fix}
              </p>
            </div>
          </>
        )}
      </div>

      <footer
        className={cn(
          "flex items-center gap-1.5 border-t border-sv-edge-muted bg-sv-box-header text-micro text-sv-faint",
          compact ? "px-2.5 py-1.5" : "px-4 py-2",
        )}
      >
        <Sparkles className="size-3" aria-hidden="true" />
        AI proposal — not applied
        <span className="ml-auto font-mono">source: {finding.source}</span>
      </footer>
    </article>
  );
}

export { FindingCard };
