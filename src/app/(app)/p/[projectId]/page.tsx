import { WorkspacePane } from "@/components/shell/workspace-pane";

/**
 * The workspace's centre column. Which pane is on screen is decided by the
 * active tab, not by the route — see components/shell/workspace-pane.tsx.
 */
export default function ProjectPage() {
  return <WorkspacePane />;
}
