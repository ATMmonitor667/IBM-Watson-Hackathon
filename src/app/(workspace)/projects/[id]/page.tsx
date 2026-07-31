import { ProjectPageClient } from "@/components/workspace/ProjectPageClient";
import { parseWorkspaceView } from "@/lib/workspaceRoutes";

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string | string[] }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  return (
    <ProjectPageClient id={id} initialMode={parseWorkspaceView(query.view)} />
  );
}
