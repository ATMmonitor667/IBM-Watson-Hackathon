"use client";

import { ChevronRight, type LucideIcon } from "lucide-react";
import * as React from "react";

import { useWorkspace } from "@/lib/store/workspace";
import { cn } from "@/lib/utils";

/**
 * Explorer primitives — Obsidian's file tree. See STORYVERSE_DESIGN.txt §5.3.
 * 24px rows, 12px indent per level, chevron 12px, label 13px.
 */

export function ExplorerSection({
  id,
  label,
  actions,
  children,
}: {
  id: string;
  label: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const expanded = useWorkspace((s) => s.expanded[id] ?? true);
  const toggleExpanded = useWorkspace((s) => s.toggleExpanded);

  return (
    <section className="pb-2">
      <div className="group/section flex h-8 items-center gap-1 px-2">
        <button
          type="button"
          onClick={() => toggleExpanded(id)}
          aria-expanded={expanded}
          className="flex flex-1 items-center gap-1 rounded-md text-micro font-medium uppercase tracking-wider text-sv-faint transition-colors duration-120 hover:text-sv-muted"
        >
          <ChevronRight
            className={cn(
              "size-3 transition-transform duration-160",
              expanded && "rotate-90",
            )}
            aria-hidden="true"
          />
          {label}
        </button>
        {actions ? (
          <span className="opacity-0 transition-opacity duration-120 group-hover/section:opacity-100 focus-within:opacity-100">
            {actions}
          </span>
        ) : null}
      </div>
      {expanded ? <div>{children}</div> : null}
    </section>
  );
}

export function ExplorerRow({
  label,
  icon: Icon,
  depth = 0,
  selected = false,
  trailing,
  onClick,
  className,
  ...props
}: Omit<React.ComponentPropsWithoutRef<"button">, "onClick"> & {
  label: string;
  icon?: LucideIcon;
  depth?: number;
  selected?: boolean;
  trailing?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={selected ? "true" : undefined}
      style={{ paddingLeft: 8 + depth * 12 }}
      className={cn(
        "flex h-6 w-full items-center gap-1.5 pr-2 text-left text-ui transition-colors duration-120",
        selected
          ? "bg-sv-accent-fill text-sv-accent"
          : "text-sv-muted hover:bg-sv-raised hover:text-sv-text",
        className,
      )}
      {...props}
    >
      {Icon ? (
        <Icon className="size-3.5 shrink-0 opacity-80" aria-hidden="true" />
      ) : null}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {trailing ? <span className="shrink-0">{trailing}</span> : null}
    </button>
  );
}
