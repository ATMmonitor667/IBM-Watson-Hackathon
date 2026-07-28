/**
 * Formatting helpers. Intl covers everything the app needs, so there is no
 * date library here — see the plan's note on not installing date-fns for one
 * activity feed.
 */

const RELATIVE = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const SHORT_DATE = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
});
const FULL = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "12 minutes ago", "yesterday", "3 days ago". */
export function relativeTime(iso: string, now: number = Date.now()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";

  const elapsed = then - now;
  const magnitude = Math.abs(elapsed);

  if (magnitude < MINUTE) return "just now";
  if (magnitude < HOUR) return RELATIVE.format(Math.round(elapsed / MINUTE), "minute");
  if (magnitude < DAY) return RELATIVE.format(Math.round(elapsed / HOUR), "hour");
  if (magnitude < 7 * DAY) return RELATIVE.format(Math.round(elapsed / DAY), "day");
  return SHORT_DATE.format(then);
}

/** "Jul 27" — stable across server and client, so it is safe to render first. */
export function shortDate(iso: string): string {
  const at = new Date(iso).getTime();
  return Number.isNaN(at) ? "" : SHORT_DATE.format(at);
}

/**
 * "S4 — Reading the compass in the dark" -> "S4".
 *
 * Scene titles carry their own short code, so evidence links and tree nodes
 * can cite a scene compactly without a second field on the row.
 */
export function sceneLabel(title: string): string {
  const [code] = title.split("—");
  return code.trim() || title;
}

/** Full timestamp for tooltips. */
export function fullDate(iso: string): string {
  const at = new Date(iso).getTime();
  return Number.isNaN(at) ? "" : FULL.format(at);
}
