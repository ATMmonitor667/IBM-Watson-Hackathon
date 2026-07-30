/**
 * src/components/ai/AiDisclaimer.tsx
 *
 * Tiny, reusable disclaimer banner shown next to every AI-produced block.
 * Text comes from responsibleAI.ts so any wording change is made in one place.
 */

import { Info } from "lucide-react";
import {
  RESPONSIBLE_AI_DISCLAIMERS,
  AI_FALLBACK_LABEL,
  AI_GENERATED_LABEL,
  IBM_RESPONSIBLE_AI_URL,
  type ResponsibleAIFeature,
} from "@/lib/ai/responsibleAI";

interface AiDisclaimerProps {
  /** Which AI feature this disclaimer is for. */
  feature: ResponsibleAIFeature;
  /** Optional override class for the wrapper element. */
  className?: string;
}

export function AiDisclaimer({ feature, className = "" }: AiDisclaimerProps) {
  const text = RESPONSIBLE_AI_DISCLAIMERS[feature];

  return (
    <aside
      aria-label={
        feature === "panelGeneration"
          ? AI_FALLBACK_LABEL
          : AI_GENERATED_LABEL
      }
      className={`flex gap-2 rounded-lg border border-violet-500/20 bg-violet-500/5 p-3 text-xs text-slate-400 ${className}`}
    >
      <Info
        className="mt-0.5 size-3.5 shrink-0 text-violet-400"
        aria-hidden="true"
      />
      <p className="leading-relaxed">
        {text}{" "}
        <a
          href={IBM_RESPONSIBLE_AI_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-violet-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
        >
          Learn more
        </a>
      </p>
    </aside>
  );
}
