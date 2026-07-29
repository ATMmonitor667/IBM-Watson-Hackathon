"use client";

import { GripVertical } from "lucide-react";
import * as React from "react";
import { Group, Panel, Separator } from "react-resizable-panels";

import { cn } from "@/lib/utils";

/**
 * Hand-written wrapper over react-resizable-panels v4.
 *
 * v4 renamed the API — PanelGroup -> Group, PanelResizeHandle -> Separator,
 * and `direction` -> `orientation` — so the shadcn registry file (which still
 * targets v3) does not compile against it. Keep this file: re-running
 * `shadcn add resizable` will overwrite it with the broken version.
 *
 * Used by the Obsidian sidebars and pane splits.
 */

function ResizablePanelGroup({
  className,
  ...props
}: React.ComponentProps<typeof Group>) {
  return <Group className={cn("flex h-full w-full", className)} {...props} />;
}

const ResizablePanel = Panel;

function ResizableHandle({
  withHandle = false,
  className,
  ...props
}: React.ComponentProps<typeof Separator> & { withHandle?: boolean }) {
  return (
    <Separator
      className={cn(
        // Invisible until hover, then accent — an Obsidian detail.
        "relative flex shrink-0 items-center justify-center bg-sv-edge transition-colors duration-120 hover:bg-sv-accent data-disabled:pointer-events-none",
        className,
      )}
      {...props}
    >
      {withHandle ? (
        <span className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border border-sv-edge bg-sv-raised">
          <GripVertical className="size-2.5 text-sv-muted" aria-hidden="true" />
        </span>
      ) : null}
    </Separator>
  );
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
