"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { BookOpen, Home, Plus } from "lucide-react";

import { CreateProjectForm } from "@/components/workspace/CreateProjectForm";
import { workspaceHref } from "@/lib/workspaceRoutes";
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
            href="/"
            icon={<Home className="size-4" />}
            label="Storyverse home"
            active={pathname === "/"}
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
                href={workspaceHref(project.id)}
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
      </aside>

      {/* Project creation modal */}
      {showForm && <CreateProjectForm onClose={() => setShowForm(false)} />}
    </>
  );
}
