"use client";

import { Sparkles } from "lucide-react";
import * as React from "react";

import { StateChip } from "@/components/story/state-chip";
import { cn } from "@/lib/utils";

export type FindingSeverity = "high" | "medium" | "low";

export type Finding = {
  id: string;
  severity: FindingSeverity;
  kind: string;
  affectedScene: string;
  explanation: string;
  evidence: { scene: string; field: string; value: string }[];
  brokenFact: { statement: string; establishedIn: string };
  suggestedFix: string;
  /** Which stage produced this. See STORYVERSE_IMPLEMENTATION_PLAN.txt step A3. */
  source: "rule" | "model" | "rule+model";
};

const SEVERITY: Record<FindingSeverity, { border: string; label: string }> = {
  high: { border: "border-l-sv-conflict", label: "High severity" },
  medium: { border: "border-l-sv-review", label: "Medium severity" },
  low: { border: "border-l-sv-abandoned", label: "Low severity" },
};

/**
 * FindingCard — GitHub's review comment, adapted for AI output.
 * See STORYVERSE_DESIGN.txt §5.12.
 *
 * The footer label is not decoration. Visible "AI proposes, human disposes"
 * labelling is a judged criterion, so it appears on every AI-authored surface
 * without exception.
 */
function FindingCard({
  finding,
  className,
  ...props
}: React.ComponentPropsWithoutRef<"article"> & { finding: Finding }) {
  const severity = SEVERITY[finding.severity];

  return (
    <article
      className={cn(
        "overflow-hidden rounded-lg border border-sv-edge border-l-2 bg-sv-box",
        severity.border,
        className,
      )}
      {...props}
    >
      <header className="flex flex-wrap items-center gap-2 border-b border-sv-edge-muted px-4 py-2.5">
        <StateChip
          state={finding.severity === "high" ? "conflict" : "under_review"}
          label={severity.label}
        />
        <span className="text-meta text-sv-muted">{finding.kind}</span>
        <a
          href="#"
          className="ml-auto font-mono text-meta text-sv-link"
          onClick={(event) => event.preventDefault()}
        >
          {finding.affectedScene}
        </a>
      </header>

      <div className="space-y-3 p-4">
        <p className="text-body text-sv-text">{finding.explanation}</p>

        {/* Evidence — GitHub's blockquote pattern. */}
        <ul className="space-y-1.5">
          {finding.evidence.map((item) => (
            <li
              key={`${item.scene}-${item.field}`}
              className="border-l-[3px] border-l-sv-edge-strong bg-sv-inset py-1.5 pl-3 pr-2"
            >
              <p className="font-mono text-micro text-sv-muted">
                {item.scene} · {item.field}
              </p>
              <p className="mt-0.5 font-mono text-meta text-sv-text">
                {item.value}
              </p>
            </li>
          ))}
        </ul>

        <div>
          <p className="text-micro uppercase tracking-wider text-sv-faint">
            Breaks canon fact
          </p>
          <p className="mt-1 text-ui text-sv-text">
            {finding.brokenFact.statement}{" "}
            <span className="text-sv-muted">
              (established in{" "}
              <a
                href="#"
                className="font-mono text-sv-link"
                onClick={(event) => event.preventDefault()}
              >
                {finding.brokenFact.establishedIn}
              </a>
              )
            </span>
          </p>
        </div>

        <div className="rounded-md border border-sv-edge bg-sv-inset p-3">
          <p className="text-micro uppercase tracking-wider text-sv-faint">
            Suggested fix
          </p>
          <p className="mt-1 text-ui text-sv-text">{finding.suggestedFix}</p>
        </div>
      </div>

      <footer className="flex items-center gap-1.5 border-t border-sv-edge-muted bg-sv-box-header px-4 py-2 text-micro text-sv-faint">
        <Sparkles className="size-3" aria-hidden="true" />
        AI proposal — not applied
        <span className="ml-auto font-mono">source: {finding.source}</span>
      </footer>
    </article>
  );
}

export { FindingCard };
