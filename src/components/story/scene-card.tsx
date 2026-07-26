import { ImageIcon } from "lucide-react";
import * as React from "react";

import { StateChip } from "@/components/story/state-chip";
import { cn } from "@/lib/utils";

export type SceneCardVariant =
  | "default"
  | "selected"
  | "conflicted"
  | "added"
  | "removed";

export type SceneCardData = {
  id: string;
  title: string;
  location: string;
  timeOfDay: string;
  characters: string[];
  props: string[];
  beat: string;
  author: string;
  version: number;
  when: string;
  imageUrl?: string;
};

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
 */
function SceneCard({
  scene,
  variant = "default",
  className,
  ...props
}: React.ComponentPropsWithoutRef<"article"> & {
  scene: SceneCardData;
  variant?: SceneCardVariant;
}) {
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
        {scene.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={scene.imageUrl}
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
          {scene.location}
          <span className="px-1.5 text-sv-faint">·</span>
          {scene.timeOfDay}
          <span className="px-1.5 text-sv-faint">·</span>
          {scene.characters.length}{" "}
          {scene.characters.length === 1 ? "character" : "characters"}
        </p>

        {scene.props.length > 0 ? (
          <ul className="flex flex-wrap gap-1">
            {scene.props.map((prop) => (
              <li
                key={prop}
                className="rounded-sm border border-sv-edge bg-sv-inset px-1.5 py-0.5 font-mono text-micro text-sv-muted"
              >
                {prop}
              </li>
            ))}
          </ul>
        ) : null}

        <p className="line-clamp-2 text-meta text-sv-muted">{scene.beat}</p>
      </div>

      <footer className="flex items-center gap-2 border-t border-sv-edge-muted px-3 py-2">
        <span
          aria-hidden="true"
          className="flex size-4 items-center justify-center rounded-full bg-sv-raised text-[9px] font-medium text-sv-muted"
        >
          {scene.author.slice(0, 1).toUpperCase()}
        </span>
        <span className="truncate text-meta text-sv-muted">{scene.author}</span>
        <span className="rounded-sm border border-sv-edge bg-sv-inset px-1 font-mono text-micro text-sv-muted">
          v{scene.version}
        </span>
        <span className="ml-auto shrink-0 text-micro text-sv-faint">
          {scene.when}
        </span>
      </footer>
    </article>
  );
}

export { SceneCard };
