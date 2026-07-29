import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";

// TODO: re-enable auth check when sign-in page is ready (Day 2)
const DEV_BYPASS_AUTH = true;

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user: { email?: string } | null = null;

  if (!DEV_BYPASS_AUTH) {
    const { redirect } = await import("next/navigation");
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) redirect("/sign-in");
    user = data.user;
  } else {
    user = { email: "dev@storyverse.app" };
  }

  return (
    <WorkspaceShell user={user}>
      {children}
    </WorkspaceShell>
  );
}
