"use client";

import { useEffect, useRef, useCallback } from "react";
import { X, GitBranch, GitMerge } from "lucide-react";
import { useSceneStore } from "@/store/sceneStore";
import { useUiStore } from "@/store/uiStore";
import type { Scene, Branch } from "@/types/workspace";

// ---------------------------------------------------------------------------
// Focusable element selector (standard interactive elements)
// ---------------------------------------------------------------------------
const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// ---------------------------------------------------------------------------
// Shared slide-in panel wrapper — focus-trapped dialog
// Mobile:  bottom sheet (full-width, rounded top corners)
// Desktop: side panel anchored to the right
// ---------------------------------------------------------------------------
function SlidePanel({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Auto-focus first focusable element when panel opens
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const first = panel.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();
  }, []);

  // Focus-trap: keep Tab/Shift+Tab inside the panel; Escape closes it
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key !== "Tab") return;

      const panel = panelRef.current;
      if (!panel) return;

      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [onClose],
  );

  // Also close on native document keydown (catches cases where focus escapes)
  useEffect(() => {
    function onDocKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onDocKey);
    return () => document.removeEventListener("keydown", onDocKey);
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="absolute inset-0 z-20"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Panel — uses <dialog> semantics via role="dialog" + aria-modal
          Mobile:  bottom sheet — full width, slides up from the bottom
          Desktop: side panel  — fixed width, anchored to the right edge */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onKeyDown={handleKeyDown}
        className="absolute bottom-0 left-0 right-0 z-30 flex max-h-[80%] flex-col overflow-hidden rounded-t-2xl border-t border-white/10 bg-slate-900 shadow-2xl md:inset-y-0 md:bottom-auto md:left-auto md:w-80 md:rounded-none md:border-l md:border-t-0"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
            aria-label="Close panel"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Scene detail panel
// ---------------------------------------------------------------------------
interface SceneDetailPanelProps {
  scenes: Scene[];
  branches: Branch[];
  onMergeBranch?: (branchId: string) => void;
}

export function SceneDetailPanel({
  scenes,
  branches,
  onMergeBranch,
}: SceneDetailPanelProps) {
  const closePanels     = useUiStore((s) => s.closePanels);
  const openPanel       = useUiStore((s) => s.openPanel);
  const selectedSceneId = useSceneStore((s) => s.selectedSceneId);

  const scene = scenes.find((s) => s.id === selectedSceneId);

  // Determine which branch this scene belongs to and whether it's already canon
  const branch = scene
    ? branches.find((b) => b.scenes.some((sc) => sc.id === scene.id))
    : undefined;
  const isAltBranch = branch && !branch.isCanon;

  if (!scene) return null;

  return (
    <SlidePanel title="Scene Detail" onClose={closePanels}>
      <div className="flex flex-col gap-4 text-sm">
        {/* Title + number */}
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Scene #{scene.sceneNumber}
          </span>
          <h3 className="mt-0.5 text-base font-semibold text-white">{scene.title}</h3>
        </div>

        {/* Location */}
        <Row label="Location">{scene.location}</Row>

        {/* Emotional beat */}
        <Row label="Emotional Beat">{scene.emotionalBeat}</Row>

        {/* Characters */}
        <Row label="Characters">{scene.characters.join(", ")}</Row>

        {/* Dialogue excerpt */}
        <div>
          <p className="mb-1 text-xs font-medium text-slate-400">Dialogue</p>
          <p className="rounded-lg border border-white/10 bg-slate-800 p-3 text-xs leading-relaxed text-slate-300 italic">
            {scene.dialogueExcerpt}
          </p>
        </div>

        {/* Contributor + revision */}
        <Row label="Contributor">{scene.contributor.displayName}</Row>
        <Row label="Revision">Rev {scene.revision}</Row>

        {/* Action buttons */}
        <div className="flex flex-col gap-2 pt-1">
          {/* Branch from here CTA */}
          <button
            type="button"
            onClick={() => openPanel("create-branch")}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
          >
            <GitBranch className="size-4" />
            Branch from here
          </button>

          {/* Merge branch CTA — only for alternate branches */}
          {isAltBranch && onMergeBranch && branch && (
            <button
              type="button"
              onClick={() => {
                onMergeBranch(branch.id);
                closePanels();
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
            >
              <GitMerge className="size-4" />
              Merge branch
            </button>
          )}
        </div>
      </div>
    </SlidePanel>
  );
}

// ---------------------------------------------------------------------------
// Create-branch panel
// ---------------------------------------------------------------------------
interface CreateBranchPanelProps {
  scenes: Scene[];
  onBranchCreated: (branch: Branch) => void;
}

export function CreateBranchPanel({ scenes, onBranchCreated }: CreateBranchPanelProps) {
  const closePanels     = useUiStore((s) => s.closePanels);
  const selectedSceneId = useSceneStore((s) => s.selectedSceneId);

  const baseScene = scenes.find((s) => s.id === selectedSceneId);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const name = (data.get("branchName") as string).trim();
    const description = (data.get("description") as string).trim();
    void description; // reserved for future API call

    if (!name || !baseScene) return;

    // TODO: replace with real API call once Rahat's branch API is ready
    await new Promise((r) => setTimeout(r, 400));

    const newBranch: Branch = {
      id: `branch-${Date.now()}`,
      projectId: baseScene.projectId,
      name,
      sourceSceneId: baseScene.id,
      scenes: [],
      isCanon: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onBranchCreated(newBranch);
    closePanels();

    // Sonner toast — imported dynamically to avoid SSR issues
    const { toast } = await import("sonner");
    toast.success(`Branch "${name}" created`, {
      description: `Branching from Scene #${baseScene.sceneNumber}: ${baseScene.title}`,
    });
  }

  if (!baseScene) return null;

  return (
    <SlidePanel title="Create Branch" onClose={closePanels}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Base scene read-only */}
        <div className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Base scene
          </p>
          <p className="mt-0.5 text-sm font-medium text-slate-200">
            #{baseScene.sceneNumber} — {baseScene.title}
          </p>
        </div>

        {/* Branch name */}
        <div>
          <label
            htmlFor="branchName"
            className="mb-1 block text-xs font-medium text-slate-300"
          >
            Branch name <span className="text-red-400">*</span>
          </label>
          <input
            id="branchName"
            name="branchName"
            type="text"
            required
            autoFocus
            placeholder="e.g. The Tunnel Route"
            className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="description"
            className="mb-1 block text-xs font-medium text-slate-300"
          >
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            placeholder="What diverges in this branch?"
            className="w-full resize-none rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={closePanels}
            className="flex-1 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:border-white/20 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-violet-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
          >
            Create
          </button>
        </div>
      </form>
    </SlidePanel>
  );
}

// ---------------------------------------------------------------------------
// Tiny helper row
// ---------------------------------------------------------------------------
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm text-slate-200">{children}</p>
    </div>
  );
}
