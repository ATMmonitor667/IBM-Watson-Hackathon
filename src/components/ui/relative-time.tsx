"use client";

import * as React from "react";

import { fullDate, relativeTime, shortDate } from "@/lib/format";

/** Never changes after mount, so the subscription is a no-op. */
const subscribe = () => () => {};

/**
 * A timestamp that reads as "12 minutes ago".
 *
 * It renders the absolute short date on the server and during hydration, then
 * the relative form once mounted. "N minutes ago" depends on the instant it is
 * computed, so rendering it directly makes the server's HTML and the client's
 * first render disagree the moment a minute ticks over between them — a real
 * hydration mismatch, not a theoretical one.
 *
 * useSyncExternalStore is React's supported way to ask "am I hydrated yet":
 * the server snapshot and the client snapshot differ by design, and React
 * schedules the swap itself instead of us bouncing state through an effect.
 */
export function RelativeTime({
  iso,
  className,
}: {
  iso: string;
  className?: string;
}) {
  const hydrated = React.useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  return (
    <time dateTime={iso} title={fullDate(iso)} className={className}>
      {hydrated ? relativeTime(iso) : shortDate(iso)}
    </time>
  );
}
