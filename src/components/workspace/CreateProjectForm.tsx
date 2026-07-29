"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Loader2 } from "lucide-react";

import { useProjectStore } from "@/store/projectStore";
import type { ProjectStatus } from "@/types/workspace";

// ---------------------------------------------------------------------------
// Zod schema — no .default() so input and output types stay identical,
// avoiding the @hookform/resolvers v5 + Zod v4 generic mismatch.
// ---------------------------------------------------------------------------
const projectSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(80, "Title must be 80 characters or fewer"),
  description: z
    .string()
    .max(300, "Description must be 300 characters or fewer"),
  status: z.enum(["In Progress", "Draft", "Complete", "Archived"] as const),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
interface CreateProjectFormProps {
  onClose: () => void;
}

export function CreateProjectForm({ onClose }: CreateProjectFormProps) {
  const router = useRouter();
  const addProject = useProjectStore((s) => s.addProject);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: { title: "", description: "", status: "Draft" },
  });

  async function onSubmit(values: ProjectFormValues) {
    try {
      const project = await addProject({
        title: values.title,
        description: values.description,
        status: values.status as ProjectStatus,
      });
      onClose();
      router.push(`/projects/${project.id}`);
    } catch {
      // Error is handled by the store
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-slate-900 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h2 className="text-base font-semibold text-white">New Project</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 p-6">

          {/* Title */}
          <div>
            <label htmlFor="proj-title" className="mb-1.5 block text-sm font-medium text-slate-300">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              id="proj-title"
              type="text"
              placeholder="e.g. The Flooded City"
              autoFocus
              {...register("title")}
              className={`w-full rounded-lg border bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none transition focus:ring-2 focus:ring-violet-500 ${
                errors.title ? "border-red-500" : "border-white/10"
              }`}
            />
            {errors.title && (
              <p className="mt-1 text-xs text-red-400">{errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="proj-desc" className="mb-1.5 block text-sm font-medium text-slate-300">
              Description
            </label>
            <textarea
              id="proj-desc"
              rows={3}
              placeholder="What is this story about?"
              {...register("description")}
              className={`w-full resize-none rounded-lg border bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none transition focus:ring-2 focus:ring-violet-500 ${
                errors.description ? "border-red-500" : "border-white/10"
              }`}
            />
            {errors.description && (
              <p className="mt-1 text-xs text-red-400">{errors.description.message}</p>
            )}
          </div>

          {/* Status */}
          <div>
            <label htmlFor="proj-status" className="mb-1.5 block text-sm font-medium text-slate-300">
              Status
            </label>
            <select
              id="proj-status"
              {...register("status")}
              className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white outline-none transition focus:ring-2 focus:ring-violet-500"
            >
              <option value="Draft">Draft</option>
              <option value="In Progress">In Progress</option>
              <option value="Complete">Complete</option>
              <option value="Archived">Archived</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:border-white/20 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-500 disabled:opacity-60"
            >
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              {isSubmitting ? "Creating…" : "Create Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
