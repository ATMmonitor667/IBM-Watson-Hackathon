import { type LucideIcon } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * EmptyState — GitHub's blankslate. See STORYVERSE_DESIGN.txt §5.17.
 * Always offers exactly one action; never a dead end.
 */
function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div"> & {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 px-6 py-10 text-center",
        className,
      )}
      {...props}
    >
      <Icon className="size-8 text-sv-faint" aria-hidden="true" />
      <p className="text-body font-medium text-sv-text">{title}</p>
      <p className="max-w-sm text-ui text-sv-muted">{description}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export { EmptyState };
