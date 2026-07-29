import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * FieldDiff — GitHub's line-level diff, applied to scene fields instead of
 * source lines. See STORYVERSE_DESIGN.txt §5.11.
 *
 * The `props_used` row is the one that visibly carries the compass
 * contradiction in the demo. It must never be the row that gets collapsed.
 */
function FieldDiff({
  field,
  before,
  after,
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div"> & {
  field: string;
  before?: string;
  after?: string;
}) {
  return (
    <div className={cn("space-y-1", className)} {...props}>
      <p className="font-mono text-micro text-sv-muted">{field}</p>

      {before !== undefined ? (
        <p className="flex gap-2 rounded-sm border-l-2 border-l-sv-del-edge bg-sv-del-bg py-1 pl-2 pr-2 text-ui text-sv-text">
          <span
            aria-hidden="true"
            className="select-none font-mono text-micro leading-[18px] text-sv-del-text"
          >
            −
          </span>
          <span className="min-w-0 flex-1">{before}</span>
        </p>
      ) : null}

      {after !== undefined ? (
        <p className="flex gap-2 rounded-sm border-l-2 border-l-sv-add-edge bg-sv-add-bg py-1 pl-2 pr-2 text-ui text-sv-text">
          <span
            aria-hidden="true"
            className="select-none font-mono text-micro leading-[18px] text-sv-add-text"
          >
            +
          </span>
          <span className="min-w-0 flex-1">{after}</span>
        </p>
      ) : null}
    </div>
  );
}

export { FieldDiff };
