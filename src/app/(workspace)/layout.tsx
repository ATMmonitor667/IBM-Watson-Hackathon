import { AppNav } from "@/components/workspace/AppNav";
import { WorkspaceSidebar } from "@/components/workspace/WorkspaceSidebar";

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
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Top navigation */}
      <AppNav user={user} />

      <div className="flex flex-1 overflow-hidden">
        {/* Functional sidebar */}
        <WorkspaceSidebar />

        {/* Main content slot */}
        <main className="flex-1 overflow-auto bg-slate-950">
          {children}
        </main>
      </div>
    </div>
  );
}
