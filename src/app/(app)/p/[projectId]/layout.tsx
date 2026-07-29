import { notFound } from "next/navigation";

import { WorkspaceShell } from "@/components/shell/workspace-shell";
import { withRuleReviews } from "@/lib/ai/continuity";
import { getWorkspaceSnapshot } from "@/lib/db/queries";
import { WorkspaceDataProvider } from "@/lib/store/workspace-data";

/**
 * The project workspace. This server component is the ONLY place the
 * workspace reads data: it fetches one snapshot and hands it to the client
 * tree, so every sidebar, canvas, and panel below renders from props rather
 * than fetching for itself.
 *
 * When the Supabase path lands at step P5, only getWorkspaceSnapshot changes.
 */
export default async function ProjectLayout({
  params,
  children,
}: {
  params: Promise<{ projectId: string }>;
  children: React.ReactNode;
}) {
  const { projectId } = await params;
  const stored = await getWorkspaceSnapshot(projectId);

  if (!stored) notFound();

  // Continuity findings are computed from the scene data on every load, not
  // read back from a fixture — so what the workspace shows is always what the
  // rule engine currently thinks, and a scene edit changes it.
  const snapshot = await withRuleReviews(stored);

  return (
    <WorkspaceDataProvider snapshot={snapshot}>
      <WorkspaceShell>{children}</WorkspaceShell>
    </WorkspaceDataProvider>
  );
}
