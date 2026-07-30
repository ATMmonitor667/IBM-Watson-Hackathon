"use client";

import { Database, FlaskConical } from "lucide-react";

import {
  MOCK_REASON_TEXT,
  useProjectStore,
  type MockReason,
} from "@/store/projectStore";

/**
 * Says where the data on screen came from. Issue #24 / A5.
 *
 * The store degrades to demo data whenever Supabase is unavailable, which is
 * the right behaviour for a demo and a dangerous one while building: a broken
 * RLS policy, an expired key, and a healthy database all looked identical.
 * The realistic bad outcome is recording the demo, narrating "this is coming
 * from Postgres", and being wrong.
 *
 * So the badge is only loud when it needs to be. Reading real data shows a
 * quiet neutral chip; demo data shows an amber one naming the reason, because
 * the reason is the part that tells you what to fix.
 */
export function DataSourceBadge() {
  const dataSource = useProjectStore((s) => s.dataSource);
  const mockReason = useProjectStore((s) => s.mockReason);

  if (dataSource === "supabase") {
    return (
      <span
        className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-300"
        title="Projects loaded from Supabase."
      >
        <Database className="size-3.5" aria-hidden="true" />
        Live data
      </span>
    );
  }

  const explanation = mockReason
    ? MOCK_REASON_TEXT[mockReason as MockReason]
    : "Showing built-in demo data.";

  return (
    <span
      role="status"
      className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-300"
      title={explanation}
    >
      <FlaskConical className="size-3.5" aria-hidden="true" />
      Demo data
      {/* Screen readers get the reason; sighted users get it on hover, and in
          the console, where it is actionable rather than decorative. */}
      <span className="sr-only"> — {explanation}</span>
    </span>
  );
}
