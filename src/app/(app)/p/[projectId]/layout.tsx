/**
 * Compatibility layout for old /p/[projectId] bookmarks.
 * The page redirects to the canonical /projects/[id] workspace.
 */
export default async function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
