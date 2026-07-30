import { ImageIcon } from "lucide-react";
import * as React from "react";

import { StateChip } from "@/components/story/state-chip";
import { AppImage } from "@/components/ui/AppImage";
import { RelativeTime } from "@/components/ui/relative-time";
import type { SceneWithVersion } from "@/lib/types/schemas";
import { cn } from "@/lib/utils";

export type SceneCardVariant =
  | "default"
  | "selected"
  | "conflicted"
  | "added"
  | "removed";

const VARIANTS: Record<SceneCardVariant, string> = {
  default: "border-sv-edge hover:border-sv-edge-strong",
  selected: "border-sv-accent-edge bg-sv-accent-fill",
  conflicted: "border-sv-edge border-l-2 border-l-sv-conflict",
  added: "border-sv-edge border-l-2 border-l-sv-add-edge",
  removed: "border-sv-edge border-l-2 border-l-sv-del-edge opacity-60",
};

/**
 * SceneCard — a GitHub box at Obsidian density. The most-seen component in
 * the demo. See STORYVERSE_DESIGN.txt §5.10.
 *
 * Purely presentational: it renders a SceneWithVersion straight from the
 * contract and takes the two id->name lookups it cannot resolve itself. That
 * is what lets the diff view (step C5) reuse it unchanged for the side-by-side
 * comparison.
 */
function SceneCard({
  scene,
  authorName,
  characterNames = {},
  variant = "default",
  className,
  ...props
}: React.ComponentPropsWithoutRef<"article"> & {
  scene: SceneWithVersion;
  authorName?: string;
  characterNames?: Record<string, string>;
  variant?: SceneCardVariant;
}) {
  const version = scene.version;
  const author = authorName ?? version.author_id;
  const cast = version.characters_present.map(
    (id) => characterNames[id] ?? id,
  );

  return (
    <article
      className={cn(
        "group overflow-hidden rounded-lg border bg-sv-box transition-colors duration-120",
        VARIANTS[variant],
        className,
      )}
      {...props}
    >
      {/* Panel. Placeholder carries the scene title so the layout is legible
          long before the real artwork lands. */}
      <div className="relative aspect-video border-b border-sv-edge bg-sv-inset">
        {version.panel_image_url ? (
          <AppImage
            src={version.panel_image_url}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-1.5 text-sv-faint">
            <ImageIcon className="size-5" aria-hidden="true" />
            <span className="px-3 text-center text-meta">{scene.title}</span>
          </div>
        )}

        {variant === "conflicted" ? (
          <StateChip state="conflict" className="absolute right-2 top-2" />
        ) : null}
      </div>

      <div className="space-y-2 p-3">
        <h3 className="truncate text-body font-medium text-sv-text">
          {scene.title}
        </h3>

        <p className="truncate text-meta text-sv-muted">
          {version.setting}
          <span className="px-1.5 text-sv-faint">·</span>
          {version.time_of_day}
          <span className="px-1.5 text-sv-faint">·</span>
          {cast.length} {cast.length === 1 ? "character" : "characters"}
        </p>

        {version.props_used.length > 0 ? (
          <ul className="flex flex-wrap gap-1">
            {version.props_used.map((prop) => (
              <li
                key={prop}
                className="rounded-sm border border-sv-edge bg-sv-inset px-1.5 py-0.5 font-mono text-micro text-sv-muted"
              >
                {prop}
              </li>
            ))}
          </ul>
        ) : null}

        <p className="line-clamp-2 text-meta text-sv-muted">
          {version.emotional_beat}
        </p>
      </div>

      <footer className="flex items-center gap-2 border-t border-sv-edge-muted px-3 py-2">
        <span
          aria-hidden="true"
          className="flex size-4 items-center justify-center rounded-full bg-sv-raised text-[9px] font-medium text-sv-muted"
        >
          {author.slice(0, 1).toUpperCase()}
        </span>
        <span className="truncate text-meta text-sv-muted">{author}</span>
        <span className="rounded-sm border border-sv-edge bg-sv-inset px-1 font-mono text-micro text-sv-muted">
          v{version.version_no}
        </span>
        <RelativeTime
          iso={version.created_at}
          className="ml-auto shrink-0 text-micro text-sv-faint"
        />
      </footer>
    </article>
  );
}

export { SceneCard };
