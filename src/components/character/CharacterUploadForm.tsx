"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ImageIcon, Loader2, Upload, X } from "lucide-react";

import { useCharacterStore } from "@/store/characterStore";

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------
const characterSchema = z.object({
  name: z.string().min(1, "Name is required").max(60, "Name must be 60 characters or fewer"),
  role: z.string().min(1, "Role is required").max(60, "Role must be 60 characters or fewer"),
  description: z.string().max(400, "Description must be 400 characters or fewer"),
  visualTraits: z.string().max(300, "Keep traits under 300 characters"),
});

type CharacterFormValues = z.infer<typeof characterSchema>;

interface CharacterUploadFormProps {
  projectId: string;
  onClose: () => void;
}

export function CharacterUploadForm({ projectId, onClose }: CharacterUploadFormProps) {
  const addCharacter = useCharacterStore((s) => s.addCharacter);
  const [imagePreview, setImagePreview] = useState<string>("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CharacterFormValues>({
    resolver: zodResolver(characterSchema),
    defaultValues: { name: "", role: "", description: "", visualTraits: "" },
  });

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // NOTE: this reads the file client-side as a data URL purely so the
    // demo has something to render immediately. The real upload should go
    // straight to Supabase Storage — see characterStore.addCharacter().
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function onSubmit(values: CharacterFormValues) {
    await addCharacter(projectId, values, imagePreview);
    onClose();

    const { toast } = await import("sonner");
    toast.success(`${values.name} added to Character Studio`);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-white/10 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h2 className="text-base font-semibold text-white">New Character</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 p-6">
          {/* Reference image upload */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">
              Reference image
            </label>
            <label
              htmlFor="char-image"
              className="flex h-40 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-white/15 bg-slate-800 text-slate-500 transition hover:border-violet-500/50 hover:text-slate-400"
            >
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Character reference preview"
                  className="h-full w-full rounded-lg object-cover"
                />
              ) : (
                <>
                  <Upload className="size-6" aria-hidden="true" />
                  <span className="text-xs">Click to upload an image</span>
                </>
              )}
            </label>
            <input
              id="char-image"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="sr-only"
            />
          </div>

          {/* Name */}
          <div>
            <label htmlFor="char-name" className="mb-1.5 block text-sm font-medium text-slate-300">
              Name <span className="text-red-400">*</span>
            </label>
            <input
              id="char-name"
              type="text"
              placeholder="e.g. Kael"
              autoFocus
              {...register("name")}
              className={`w-full rounded-lg border bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none transition focus:ring-2 focus:ring-violet-500 ${
                errors.name ? "border-red-500" : "border-white/10"
              }`}
            />
            {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name.message}</p>}
          </div>

          {/* Role */}
          <div>
            <label htmlFor="char-role" className="mb-1.5 block text-sm font-medium text-slate-300">
              Role <span className="text-red-400">*</span>
            </label>
            <input
              id="char-role"
              type="text"
              placeholder="e.g. Protagonist / Explorer"
              {...register("role")}
              className={`w-full rounded-lg border bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none transition focus:ring-2 focus:ring-violet-500 ${
                errors.role ? "border-red-500" : "border-white/10"
              }`}
            />
            {errors.role && <p className="mt-1 text-xs text-red-400">{errors.role.message}</p>}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="char-desc" className="mb-1.5 block text-sm font-medium text-slate-300">
              Description
            </label>
            <textarea
              id="char-desc"
              rows={3}
              placeholder="Who are they, and what's their role in the story?"
              {...register("description")}
              className={`w-full resize-none rounded-lg border bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none transition focus:ring-2 focus:ring-violet-500 ${
                errors.description ? "border-red-500" : "border-white/10"
              }`}
            />
            {errors.description && (
              <p className="mt-1 text-xs text-red-400">{errors.description.message}</p>
            )}
          </div>

          {/* Visual traits */}
          <div>
            <label htmlFor="char-traits" className="mb-1.5 block text-sm font-medium text-slate-300">
              Visual traits
            </label>
            <input
              id="char-traits"
              type="text"
              placeholder="Comma-separated, e.g. Weathered coat, brass goggles"
              {...register("visualTraits")}
              className={`w-full rounded-lg border bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none transition focus:ring-2 focus:ring-violet-500 ${
                errors.visualTraits ? "border-red-500" : "border-white/10"
              }`}
            />
            {errors.visualTraits && (
              <p className="mt-1 text-xs text-red-400">{errors.visualTraits.message}</p>
            )}
          </div>

          {!imagePreview && (
            <p className="flex items-center gap-1.5 text-xs text-slate-500">
              <ImageIcon className="size-3.5" aria-hidden="true" />
              No image yet — you can still save and add one later.
            </p>
          )}

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
              {isSubmitting ? "Saving…" : "Add Character"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
