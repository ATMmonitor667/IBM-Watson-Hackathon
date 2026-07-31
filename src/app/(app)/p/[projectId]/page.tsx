import { redirect } from "next/navigation";

import { workspaceHref } from "@/lib/workspaceRoutes";

/**
 * Preserve previously shared /p links while keeping one workspace
 * implementation and one data model.
 */
export default async function LegacyProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  redirect(workspaceHref(projectId));
}
