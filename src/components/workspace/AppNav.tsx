"use client";

import { useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function getInitials(email?: string): string {
  if (!email) return "?";
  const [local] = email.split("@");
  const parts = local.split(/[._-]/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return local.slice(0, 2).toUpperCase();
}

interface AppNavProps {
  user: { email?: string } | null;
  /** Controlled by the workspace layout on mobile */
  onMenuToggle?: () => void;
}

export function AppNav({ user, onMenuToggle }: AppNavProps) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/sign-in");
  }

  return (
    <nav className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-slate-900 px-4 md:px-5">
      {/* Left: hamburger (mobile only) + wordmark */}
      <div className="flex items-center gap-3">
        {/* Hamburger — visible below md breakpoint */}
        <button
          type="button"
          aria-label="Open navigation menu"
          onClick={onMenuToggle}
          className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400 md:hidden"
        >
          <Menu className="size-5" />
        </button>

        <span className="text-lg font-bold tracking-tight text-violet-400">
          Storyverse
        </span>
      </div>

      {/* Right side: avatar + sign-out */}
      <div className="flex items-center gap-3">
        {/* Initials badge */}
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-xs font-semibold text-white"
          title={user?.email ?? "Unknown user"}
          aria-label={`Signed in as ${user?.email ?? "unknown"}`}
        >
          {getInitials(user?.email)}
        </div>

        {/* Sign-out button */}
        <button
          onClick={handleSignOut}
          className="rounded-md border border-white/10 px-3 py-1.5 text-xs text-slate-300 transition hover:border-white/20 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
