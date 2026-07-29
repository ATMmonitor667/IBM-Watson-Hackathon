import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Box — GitHub's core container, and the workhorse of every content surface.
 * See STORYVERSE_DESIGN.txt §5.7.
 *
 * Anatomy: container (1px border, 6px radius) > header (40px, tinted) > body
 * or rows > footer. Use `divided` when the body holds rows rather than prose.
 */
function Box({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"section">) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-lg border border-sv-edge bg-sv-box",
        className,
      )}
      {...props}
    />
  );
}

function BoxHeader({
  className,
  children,
  actions,
  ...props
}: React.ComponentPropsWithoutRef<"header"> & { actions?: React.ReactNode }) {
  return (
    <header
      className={cn(
        "flex h-10 items-center justify-between gap-2 border-b border-sv-edge bg-sv-box-header px-4",
        className,
      )}
      {...props}
    >
      <div className="flex min-w-0 items-center gap-2 text-ui font-medium text-sv-text">
        {children}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-1">{actions}</div>
      ) : null}
    </header>
  );
}

function BoxBody({
  className,
  divided = false,
  ...props
}: React.ComponentPropsWithoutRef<"div"> & { divided?: boolean }) {
  return (
    <div
      className={cn(
        divided
          ? "divide-y divide-sv-edge-muted"
          : "p-4 text-body text-sv-text",
        className,
      )}
      {...props}
    />
  );
}

function BoxRow({
  className,
  interactive = false,
  ...props
}: React.ComponentPropsWithoutRef<"div"> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 text-ui",
        interactive &&
          "cursor-pointer transition-colors duration-120 hover:bg-sv-raised",
        className,
      )}
      {...props}
    />
  );
}

function BoxFooter({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"footer">) {
  return (
    <footer
      className={cn(
        "flex items-center justify-between gap-2 border-t border-sv-edge bg-sv-box-header px-4 py-2.5",
        className,
      )}
      {...props}
    />
  );
}

export { Box, BoxHeader, BoxBody, BoxRow, BoxFooter };
