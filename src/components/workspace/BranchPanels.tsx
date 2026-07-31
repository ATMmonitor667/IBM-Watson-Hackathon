"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { X, GitBranch, GitMerge, ShieldCheck, ImagePlus, Loader2, CheckCircle2, AlertTriangle, ChevronRight } from "lucide-react";
import { useSceneStore } from "@/store/sceneStore";
import { useUiStore } from "@/store/uiStore";
import type { Scene, Branch } from "@/types/workspace";
import { AiDisclaimer } from "@/components/ai/AiDisclaimer";
import { AppImage } from "@/components/ui/AppImage";
import { callMergeAssistant } from "@/lib/ai/mergeAssistantClient";
import type { ContinuityReviewResponse, MergeAssistantResponse, MergeStrategy } from "@/lib/ai/schemas";
import { buildCanonContext, toContextBranch } from "@/lib/ai/contextBuilder";
import { reviewBranch } from "@/lib/ai/continuityRules";

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
}

export function SceneDetailPanel({
  scenes,
  branches,
}: SceneDetailPanelProps) {
  const closePanels      = useUiStore((s) => s.closePanels);
  const openPanel        = useUiStore((s) => s.openPanel);
  const openMergePreview = useUiStore((s) => s.openMergePreview);
  const selectedSceneId  = useSceneStore((s) => s.selectedSceneId);

  // Continuity check state
  const [continuityLoading, setContinuityLoading] = useState(false);
  const [continuityResult, setContinuityResult]   = useState<ContinuityReviewResponse | null>(null);
  const [continuityError, setContinuityError]     = useState<string | null>(null);

  // Generate panel state
  const [panelLoading, setPanelLoading]   = useState(false);
  const [panelImageUrl, setPanelImageUrl] = useState<string | null>(null);
  const [panelError, setPanelError]       = useState<string | null>(null);

  const scene = scenes.find((s) => s.id === selectedSceneId);

  // Determine which branch this scene belongs to and whether it's already canon
  const branch = scene
    ? branches.find((b) => b.scenes.some((sc) => sc.id === scene.id))
    : undefined;
  const isAltBranch = branch && !branch.isCanon;

  /**
   * Build the CanonContext for this scene's branch.
   *
   * `toContextBranch` carries each scene's derived canon facts across. Mapping
   * only `sceneNumber` and `title` here — as this did previously — left
   * `buildCanonContext` with nothing to collect, so every continuity request
   * shipped `canonFacts: []` and `branchFacts: []`: the model was asked to
   * check a story it had not been told, and the mock fallback hid it.
   *
   * The rule engine's findings go with it, so the model explains a
   * contradiction that has already been computed rather than hunting for one
   * (issue #8 / D3).
   */
  function buildCtx() {
    const canonBranch = branches.find((b) => b.isCanon);
    const targetBranch = branch ?? canonBranch;
    if (!scene || !canonBranch || !targetBranch) return null;
    return buildCanonContext(
      toContextBranch(targetBranch),
      toContextBranch(canonBranch),
      scene.projectId,
      "Kael — explorer, mid-30s, worn leather coat, glowing compass on his belt.",
      reviewBranch(targetBranch, branches),
    );
  }

  async function handleContinuityCheck() {
    const ctx = buildCtx();
    if (!ctx) return;
    setContinuityLoading(true);
    setContinuityError(null);
    setContinuityResult(null);
    try {
      const res = await fetch("/api/ai/continuity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ctx),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setContinuityError(body.error ?? `HTTP ${res.status}`);
        return;
      }
      const data = (await res.json()) as ContinuityReviewResponse;
      setContinuityResult(data);
    } catch (err) {
      setContinuityError(err instanceof Error ? err.message : "Network error");
    } finally {
      setContinuityLoading(false);
    }
  }

  async function handleGeneratePanel() {
    if (!scene) return;
    setPanelLoading(true);
    setPanelError(null);
    setPanelImageUrl(null);
    try {
      const res = await fetch("/api/ai/panel-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: scene.projectId,
          sceneId: scene.id,
          lockedCharacterDescription:
            "Kael — explorer, mid-30s, worn leather coat, glowing compass on his belt.",
          canonFacts: [],
          sceneDescription: `${scene.title}: ${scene.dialogueExcerpt}`,
          styleInstruction:
            "graphic novel, high-contrast ink lines, muted blues and earth tones",
          useFallback: true,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setPanelError(body.error ?? `HTTP ${res.status}`);
        return;
      }
      const data = (await res.json()) as { assetUrl: string };
      setPanelImageUrl(data.assetUrl);
    } catch (err) {
      setPanelError(err instanceof Error ? err.message : "Network error");
    } finally {
      setPanelLoading(false);
    }
  }

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

        {/* ---- Continuity check ---- */}
        <div className="flex flex-col gap-2 rounded-lg border border-white/10 bg-slate-800/60 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">Continuity Check</span>
            <button
              type="button"
              onClick={handleContinuityCheck}
              disabled={continuityLoading}
              className="inline-flex items-center gap-1.5 rounded-md bg-cyan-600/20 px-2.5 py-1 text-xs font-medium text-cyan-300 transition hover:bg-cyan-600/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {continuityLoading ? (
                <Loader2 className="size-3 animate-spin" aria-hidden="true" />
              ) : (
                <ShieldCheck className="size-3" aria-hidden="true" />
              )}
              {continuityLoading ? "Checking…" : "Run check"}
            </button>
          </div>

          {continuityError && (
            <p role="alert" className="text-xs text-red-400">{continuityError}</p>
          )}

          {continuityResult && (
            <div className="flex flex-col gap-2">
              {continuityResult.findings.length === 0 ? (
                <p className="flex items-center gap-1.5 text-xs text-emerald-400">
                  <CheckCircle2 className="size-3.5" aria-hidden="true" />
                  No continuity issues found.
                </p>
              ) : (
                continuityResult.findings.map((f, i) => (
                  <div
                    key={i}
                    className={`rounded-md border p-2 text-xs ${
                      f.severity === "critical"
                        ? "border-red-500/30 bg-red-500/10 text-red-300"
                        : f.severity === "major"
                          ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                          : "border-slate-600 bg-slate-700/50 text-slate-300"
                    }`}
                  >
                    <p className="flex items-center gap-1 font-semibold">
                      <AlertTriangle className="size-3 shrink-0" aria-hidden="true" />
                      {f.title}
                    </p>
                    <p className="mt-1 leading-relaxed text-[11px] opacity-80">
                      {f.explanation}
                    </p>
                    <p className="mt-1 text-[11px] opacity-70 italic">
                      Fix: {f.suggestedFix}
                    </p>
                  </div>
                ))
              )}
              <AiDisclaimer feature="continuityReview" className="mt-1" />
            </div>
          )}
        </div>

        {/* ---- Generate panel ---- */}
        <div className="flex flex-col gap-2 rounded-lg border border-white/10 bg-slate-800/60 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">Panel Image</span>
            <button
              type="button"
              onClick={handleGeneratePanel}
              disabled={panelLoading}
              className="inline-flex items-center gap-1.5 rounded-md bg-violet-600/20 px-2.5 py-1 text-xs font-medium text-violet-300 transition hover:bg-violet-600/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {panelLoading ? (
                <Loader2 className="size-3 animate-spin" aria-hidden="true" />
              ) : (
                <ImagePlus className="size-3" aria-hidden="true" />
              )}
              {panelLoading ? "Generating…" : "Generate panel"}
            </button>
          </div>

          {panelError && (
            <p role="alert" className="text-xs text-red-400">{panelError}</p>
          )}

          {panelImageUrl && (
            <div className="flex flex-col gap-2">
              <AppImage
                src={panelImageUrl}
                alt={`AI-generated panel for scene: ${scene.title}`}
                className="w-full rounded-md border border-white/10 object-cover"
              />
              <AiDisclaimer feature="panelGeneration" />
            </div>
          )}

          {!panelImageUrl && !panelError && (
            <p className="text-[11px] text-slate-500">
              Uses locked character + canon context. Deterministic fallback active.
            </p>
          )}
        </div>

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
          {isAltBranch && branch && (
            <button
              type="button"
              onClick={() => {
                openMergePreview(branch.id);
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
// Merge preview panel — two-step: AI preview → confirm
// ---------------------------------------------------------------------------
interface MergePreviewPanelProps {
  branches: Branch[];
  onMergeBranch: (branchId: string) => void;
}

export function MergePreviewPanel({
  branches,
  onMergeBranch,
}: MergePreviewPanelProps) {
  const closePanels    = useUiStore((s) => s.closePanels);
  const mergeBranchId  = useUiStore((s) => s.mergeBranchId);

  type Step = "idle" | "loading" | "preview" | "confirming" | "error";
  const [step, setStep]               = useState<Step>("idle");
  const [aiResult, setAiResult]       = useState<MergeAssistantResponse | null>(null);
  const [selectedStrategy, setSelectedStrategy] = useState<MergeStrategy | null>(null);
  const [errorMsg, setErrorMsg]       = useState<string | null>(null);

  const branch = branches.find((b) => b.id === mergeBranchId);

  // Build a minimal CanonContext from branches
  function buildMergeCtx() {
    const canonBranch = branches.find((b) => b.isCanon);
    if (!branch || !canonBranch) return null;
    return buildCanonContext(
      {
        name: branch.name,
        isCanon: false,
        scenes: branch.scenes.map((sc) => ({
          sceneNumber: sc.sceneNumber,
          title: sc.title,
        })),
      },
      {
        name: canonBranch.name,
        isCanon: true,
        scenes: canonBranch.scenes.map((sc) => ({
          sceneNumber: sc.sceneNumber,
          title: sc.title,
        })),
      },
      branch.projectId,
      "Kael — explorer, mid-30s, worn leather coat, glowing compass on his belt.",
    );
  }

  async function handleGetPreview() {
    const ctx = buildMergeCtx();
    if (!ctx) return;
    setStep("loading");
    setErrorMsg(null);
    const result = await callMergeAssistant(ctx);
    if (!result.ok) {
      setErrorMsg(result.error);
      setStep("error");
      return;
    }
    setAiResult(result.data);
    setSelectedStrategy(result.data.strategies[0] ?? null);
    setStep("preview");
  }

  async function handleConfirm() {
    if (!mergeBranchId) return;
    setStep("confirming");
    onMergeBranch(mergeBranchId);
    closePanels();
    const { toast } = await import("sonner");
    toast.success(
      `Strategy "${selectedStrategy?.label ?? "selected"}" applied`,
      { description: "Branch merged into canon." },
    );
  }

  if (!branch) return null;

  return (
    <SlidePanel title="Merge Branch" onClose={closePanels}>
      <div className="flex flex-col gap-4 text-sm">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Branch
          </span>
          <h3 className="mt-0.5 text-base font-semibold text-white">{branch.name}</h3>
        </div>

        {/* Step: idle */}
        {step === "idle" && (
          <>
            <p className="text-xs text-slate-400">
              Get an AI preview of compatible changes, true conflicts, and merge
              strategies before confirming.
            </p>
            <button
              type="button"
              onClick={handleGetPreview}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-600/20 px-4 py-2 text-sm font-medium text-cyan-300 transition hover:bg-cyan-600/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
            >
              <ShieldCheck className="size-4" aria-hidden="true" />
              Preview merge
            </button>
          </>
        )}

        {/* Step: loading */}
        {step === "loading" && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Analysing branch with AI…
          </div>
        )}

        {/* Step: error */}
        {step === "error" && (
          <>
            <p role="alert" className="text-xs text-red-400">{errorMsg}</p>
            <button
              type="button"
              onClick={() => setStep("idle")}
              className="text-xs text-slate-400 underline underline-offset-2 hover:text-slate-200"
            >
              Try again
            </button>
          </>
        )}

        {/* Step: preview */}
        {(step === "preview" || step === "confirming") && aiResult && (
          <>
            {/* Branch summary */}
            <div className="rounded-lg border border-white/10 bg-slate-800 p-3">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                Branch Summary
              </p>
              <p className="text-xs leading-relaxed text-slate-300">
                {aiResult.branchSummary}
              </p>
            </div>

            {/* Compatible changes */}
            {aiResult.compatibleChanges.length > 0 && (
              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  Compatible Changes
                </p>
                <ul className="flex flex-col gap-1">
                  {aiResult.compatibleChanges.map((c, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-emerald-300">
                      <CheckCircle2 className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* True conflicts */}
            {aiResult.trueConflicts.length > 0 && (
              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  Conflicts
                </p>
                <ul className="flex flex-col gap-1">
                  {aiResult.trueConflicts.map((c, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-red-300">
                      <AlertTriangle className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Strategy selector */}
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                Select Strategy
              </p>
              <div className="flex flex-col gap-2">
                {aiResult.strategies.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedStrategy(s)}
                    className={`flex w-full items-start gap-2 rounded-lg border px-3 py-2 text-left text-xs transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400 ${
                      selectedStrategy?.id === s.id
                        ? "border-violet-500/60 bg-violet-500/10 text-violet-200"
                        : "border-white/10 bg-slate-800 text-slate-300 hover:border-white/20"
                    }`}
                  >
                    <ChevronRight
                      className={`mt-0.5 size-3.5 shrink-0 transition-transform ${
                        selectedStrategy?.id === s.id ? "rotate-90 text-violet-400" : "text-slate-500"
                      }`}
                      aria-hidden="true"
                    />
                    <span>
                      <span className="font-medium">{s.label}</span>
                      <span className="ml-1 text-[11px] opacity-70">— {s.tradeoffs}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <AiDisclaimer feature="mergeAssistant" />

            {/* Confirm */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={closePanels}
                className="flex-1 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:border-white/20 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!selectedStrategy || step === "confirming"}
                className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {step === "confirming" ? "Merging…" : "Confirm merge"}
              </button>
            </div>
          </>
        )}
      </div>
    </SlidePanel>
  );
}

// ---------------------------------------------------------------------------
// Create-scene panel wrapper — wires SlidePanel + CreateSceneForm
// ---------------------------------------------------------------------------
interface CreateScenePanelProps {
  projectId: string;
  nextSceneNumber: number;
  onCreated: (scene: import("@/types/workspace").Scene) => void;
}

export function CreateScenePanel({
  projectId,
  nextSceneNumber,
  onCreated,
}: CreateScenePanelProps) {
  const closePanels = useUiStore((s) => s.closePanels);

  // lazy import to keep the bundle split clean
  const [Form, setForm] = useState<typeof import("@/components/workspace/CreateSceneForm").CreateSceneForm | null>(null);
  useEffect(() => {
    import("@/components/workspace/CreateSceneForm")
      .then((m) => setForm(() => m.CreateSceneForm))
      .catch(() => null);
  }, []);

  async function handleCreated(scene: import("@/types/workspace").Scene) {
    onCreated(scene);
    closePanels();
    const { toast } = await import("sonner");
    toast.success(`Scene #${scene.sceneNumber} "${scene.title}" created`);
  }

  return (
    <SlidePanel title="New Scene" onClose={closePanels}>
      {Form ? (
        <Form
          projectId={projectId}
          nextSceneNumber={nextSceneNumber}
          onCreated={handleCreated}
          onCancel={closePanels}
        />
      ) : (
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Loading…
        </div>
      )}
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
