"use client";

import { useState, useCallback } from "react";
import { X } from "lucide-react";
import { AppNav } from "@/components/workspace/AppNav";
import { WorkspaceSidebar } from "@/components/workspace/WorkspaceSidebar";

interface WorkspaceShellProps {
  user: { email?: string } | null;
  children: React.ReactNode;
}

/**
 * Client-side shell that wraps AppNav + WorkspaceSidebar and manages the
 * mobile drawer state. Extracted from the server layout so we can use hooks.
 */
export function WorkspaceShell({ user, children }: WorkspaceShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const openMenu  = useCallback(() => setMobileNavOpen(true), []);
  const closeMenu = useCallback(() => setMobileNavOpen(false), []);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Top navigation */}
      <AppNav user={user} onMenuToggle={openMenu} />

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar — hidden on mobile */}
        <div className="hidden md:block">
          <WorkspaceSidebar />
        </div>

        {/* Mobile sidebar drawer */}
        {mobileNavOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40 bg-black/60 md:hidden"
              aria-hidden="true"
              onClick={closeMenu}
            />

            {/* Drawer panel */}
            <div className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-slate-900 md:hidden">
              {/* Close button row */}
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <span className="text-sm font-semibold text-violet-400">
                  Storyverse
                </span>
                <button
                  type="button"
                  onClick={closeMenu}
                  aria-label="Close navigation menu"
                  className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
                >
                  <X className="size-4" />
                </button>
              </div>
              <WorkspaceSidebar />
            </div>
          </>
        )}

        {/* Main content slot */}
        <main className="flex-1 overflow-auto bg-slate-950">
          {children}
        </main>
      </div>
    </div>
  );
}
