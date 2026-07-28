/**
 * The signed-in area. The Obsidian shell itself lives one level down, in
 * p/[projectId]/layout.tsx, because the shell's sidebars render project data
 * and a layout can only pass data downward — putting the shell here would
 * leave the sidebars above the provider that feeds them.
 */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
