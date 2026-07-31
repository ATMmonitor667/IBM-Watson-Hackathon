export const DEMO_PROJECT_ID = "demo-1";
export const DEMO_PROJECT_TITLE = "The Flooded City";

const LEGACY_DEMO_PROJECT_ID = "project-drowned-compass";

export type WorkspaceView = "story" | "characters" | "review";

/**
 * One canonical workspace route keeps the landing page, sign-in flow, legacy
 * bookmarks, and in-app navigation from drifting toward different shells.
 */
export function workspaceHref(projectId: string): string {
  const canonicalId =
    projectId === LEGACY_DEMO_PROJECT_ID ? DEMO_PROJECT_ID : projectId;

  return `/projects/${encodeURIComponent(canonicalId)}`;
}

export function workspaceViewHref(
  projectId: string,
  view: WorkspaceView,
): string {
  const baseHref = workspaceHref(projectId);
  return view === "story" ? baseHref : `${baseHref}?view=${view}`;
}

export function parseWorkspaceView(
  value: string | string[] | undefined,
): WorkspaceView {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate === "characters" || candidate === "review"
    ? candidate
    : "story";
}
