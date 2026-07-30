"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { createEditedScene } from "@/lib/story/sceneRevision";
import type { Scene } from "@/types/workspace";

const EMOTIONAL_BEATS = [
  "Dread",
  "Hope",
  "Tension",
  "Wonder",
  "Melancholy",
  "Despair",
  "Unease",
  "Joy",
  "Anger",
  "Relief",
] as const;

type EmotionalBeat = (typeof EMOTIONAL_BEATS)[number];

function initialEmotionalBeat(value?: string): EmotionalBeat {
  return EMOTIONAL_BEATS.includes(value as EmotionalBeat)
    ? (value as EmotionalBeat)
    : "Tension";
}

export const CreateSceneSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title is too long"),
  location: z
    .string()
    .min(1, "Location is required")
    .max(100, "Location is too long"),
  dialogueExcerpt: z
    .string()
    .min(1, "Dialogue excerpt is required")
    .max(500, "Excerpt must be 500 characters or fewer"),
  characters: z.string().min(1, "List at least one character"),
  emotionalBeat: z.enum(EMOTIONAL_BEATS),
});

export type CreateSceneValues = z.infer<typeof CreateSceneSchema>;

export interface CreateSceneFormProps {
  projectId: string;
  nextSceneNumber: number;
  initialScene?: Scene;
  onSaved: (scene: Scene) => void | Promise<void>;
  onCancel: () => void;
}

export function CreateSceneForm({
  projectId,
  nextSceneNumber,
  initialScene,
  onSaved,
  onCancel,
}: CreateSceneFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateSceneValues>({
    resolver: zodResolver(CreateSceneSchema),
    defaultValues: {
      title: initialScene?.title ?? "",
      location: initialScene?.location ?? "",
      dialogueExcerpt: initialScene?.dialogueExcerpt ?? "",
      characters: initialScene?.characters.join(", ") ?? "",
      emotionalBeat: initialEmotionalBeat(initialScene?.emotionalBeat),
    },
  });

  async function onSubmit(values: CreateSceneValues) {
    setSubmitError(null);
    const characters = values.characters
      .split(",")
      .map((character) => character.trim())
      .filter(Boolean);
    const now = new Date().toISOString();
    const fields = {
      title: values.title.trim(),
      location: values.location.trim(),
      dialogueExcerpt: values.dialogueExcerpt,
      characters,
      emotionalBeat: values.emotionalBeat,
    };
    const scene: Scene = initialScene
      ? createEditedScene(
          initialScene,
          fields,
          { id: "user-local", displayName: "You" },
          now,
        )
      : {
          id: `scene-new-${now}`,
          projectId,
          sceneNumber: nextSceneNumber,
          ...fields,
          reviewStatus: "Draft",
          continuityFlag: undefined,
          imageUrl: undefined,
          contributor: { id: "user-local", displayName: "You" },
          revision: 1,
          status: "draft",
          order: nextSceneNumber,
          parentId: null,
          createdAt: now,
          updatedAt: now,
        };

    try {
      await onSaved(scene);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Unable to save the scene",
      );
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
      noValidate
    >
      <Field
        htmlFor="scene-title"
        label="Title"
        error={errors.title?.message}
        required
      >
        <input
          id="scene-title"
          type="text"
          autoFocus
          placeholder="e.g. The Sunken Bridge"
          {...register("title")}
          className={inputCls(!!errors.title)}
        />
      </Field>

      <Field
        htmlFor="scene-location"
        label="Location"
        error={errors.location?.message}
        required
      >
        <input
          id="scene-location"
          type="text"
          placeholder="e.g. Flooded Market District"
          {...register("location")}
          className={inputCls(!!errors.location)}
        />
      </Field>

      <Field
        htmlFor="scene-characters"
        label="Characters"
        hint="Comma-separated"
        error={errors.characters?.message}
        required
      >
        <input
          id="scene-characters"
          type="text"
          placeholder="Kael, Mira, The Ferryman"
          {...register("characters")}
          className={inputCls(!!errors.characters)}
        />
      </Field>

      <Field
        htmlFor="scene-emotional-beat"
        label="Emotional Beat"
        error={errors.emotionalBeat?.message}
        required
      >
        <select
          id="scene-emotional-beat"
          {...register("emotionalBeat")}
          className={inputCls(!!errors.emotionalBeat)}
        >
          {EMOTIONAL_BEATS.map((beat) => (
            <option key={beat} value={beat}>
              {beat}
            </option>
          ))}
        </select>
      </Field>

      <Field
        htmlFor="scene-dialogue"
        label="Dialogue Excerpt"
        error={errors.dialogueExcerpt?.message}
        required
      >
        <textarea
          id="scene-dialogue"
          rows={4}
          placeholder='"The water remembers everything," Kael whispered.'
          {...register("dialogueExcerpt")}
          className={`resize-none ${inputCls(!!errors.dialogueExcerpt)}`}
        />
      </Field>

      {submitError && (
        <p role="alert" className="text-xs text-red-400">
          {submitError}
        </p>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:border-white/20 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-violet-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting
            ? initialScene
              ? "Saving..."
              : "Creating..."
            : initialScene
              ? `Save revision ${initialScene.revision + 1}`
              : "Create scene"}
        </button>
      </div>
    </form>
  );
}

function inputCls(hasError: boolean) {
  return `w-full rounded-lg border ${
    hasError ? "border-red-500/60" : "border-white/10"
  } bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-violet-500`;
}

function Field({
  htmlFor,
  label,
  hint,
  error,
  required,
  children,
}: {
  htmlFor: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-xs font-medium text-slate-300">
        {label}
        {required && <span className="ml-0.5 text-red-400">*</span>}
        {hint && <span className="ml-1 font-normal text-slate-500">({hint})</span>}
      </label>
      {children}
      {error && (
        <p role="alert" className="text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
