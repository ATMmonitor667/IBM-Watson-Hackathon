"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { BookOpen, FolderOpen, GitBranch, LayoutDashboard, Plus, ScanSearch, Settings, Users } from "lucide-react";

import { CreateProjectForm } from "@/components/workspace/CreateProjectForm";
import { useProjectStore } from "@/store/projectStore";
import { useEffect } from "react";

function SidebarSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
        {title}
      </p>
      {children}
    </div>
  );
}

function NavLink({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
        active
          ? "bg-violet-600/20 text-violet-300 font-medium"
          : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
      }`}
    >
      <span className="size-4 shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </Link>
  );
}

export function WorkspaceSidebar() {
  const params = useParams();
  const pathname = usePathname();
  const activeProjectId = params?.id as string | undefined;
  const [showForm, setShowForm] = useState(false);

  const { projects, loadProjects, isLoading } = useProjectStore();

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  return (
    <>
      <aside className="flex h-full w-60 shrink-0 flex-col overflow-y-auto border-r border-white/10 bg-slate-900 py-4">

        {/* Workspace nav */}
        <SidebarSection title="Workspace">
          <NavLink
            href="/dashboard"
            icon={<LayoutDashboard className="size-4" />}
            label="Dashboard"
            active={pathname === "/dashboard"}
          />
          <NavLink
            href="/projects"
            icon={<FolderOpen className="size-4" />}
            label="All Projects"
            active={pathname === "/projects"}
          />
        </SidebarSection>

        {/* Projects list */}
        <SidebarSection title="Projects">
          {isLoading ? (
            <div className="flex flex-col gap-1 px-1">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-8 animate-pulse rounded-md bg-slate-800"
                />
              ))}
            </div>
          ) : (
            projects.map((project) => (
              <NavLink
                key={project.id}
                href={`/projects/${project.id}`}
                icon={<BookOpen className="size-4" />}
                label={project.title}
                active={activeProjectId === project.id}
              />
            ))
          )}

          {/* New project button */}
          <button
            className="mt-1 flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300"
            onClick={() => setShowForm(true)}
            type="button"
          >
            <Plus className="size-4 shrink-0" />
            <span>New project</span>
          </button>
        </SidebarSection>

        {/* Current project quick-links */}
        {activeProjectId && (
          <SidebarSection title="Current Project">
            <NavLink
              href={`/projects/${activeProjectId}`}
              icon={<LayoutDashboard className="size-4" />}
              label="Overview"
              active={pathname === `/projects/${activeProjectId}`}
            />
            <NavLink
              href={`/projects/${activeProjectId}/scenes`}
              icon={<BookOpen className="size-4" />}
              label="Scenes"
              active={pathname?.startsWith(`/projects/${activeProjectId}/scenes`)}
            />
            <NavLink
              href={`/projects/${activeProjectId}/branches`}
              icon={<GitBranch className="size-4" />}
              label="Branches"
              active={pathname?.startsWith(`/projects/${activeProjectId}/branches`)}
            />
            <NavLink
              href={`/projects/${activeProjectId}/characters`}
              icon={<Users className="size-4" />}
              label="Characters"
              active={pathname?.startsWith(`/projects/${activeProjectId}/characters`)}
            />
            <NavLink
              href={`/projects/${activeProjectId}/review`}
              icon={<ScanSearch className="size-4" />}
              label="Review & Merge"
              active={pathname?.startsWith(`/projects/${activeProjectId}/review`)}
            />
          </SidebarSection>
        )}

        {/* Bottom: settings */}
        <div className="mt-auto border-t border-white/10 pt-3">
          <NavLink
            href="/settings"
            icon={<Settings className="size-4" />}
            label="Settings"
            active={pathname === "/settings"}
          />
        </div>
      </aside>

      {/* Project creation modal */}
      {showForm && <CreateProjectForm onClose={() => setShowForm(false)} />}
    </>
  );
}
