import { FolderOpen, AlertTriangle, RefreshCw } from "lucide-react";

// ---------------------------------------------------------------------------
// Empty state — shown when a project has no scenes yet
// ---------------------------------------------------------------------------
interface EmptySceneCanvasProps {
  projectTitle?: string;
  onCreateScene?: () => void;
}

export function EmptySceneCanvas({ projectTitle, onCreateScene }: EmptySceneCanvasProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-slate-800">
        <FolderOpen className="size-7 text-slate-500" aria-hidden="true" />
      </div>
      <div>
        <p className="text-base font-medium text-slate-300">No scenes yet</p>
        <p className="mt-1 max-w-xs text-sm text-slate-500">
          {projectTitle
            ? `"${projectTitle}" doesn't have any scenes. Add the first one to start building your story.`
            : "This project doesn't have any scenes yet. Add the first one to get started."}
        </p>
      </div>
      {onCreateScene && (
        <button
          onClick={onCreateScene}
          className="mt-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
        >
          Add first scene
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Error state — shown when an API call fails
// ---------------------------------------------------------------------------
interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  message = "Something went wrong while loading this project.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-red-500/20 bg-red-500/10">
        <AlertTriangle className="size-7 text-red-400" aria-hidden="true" />
      </div>
      <div>
        <p className="text-base font-medium text-slate-300">Something went wrong</p>
        <p className="mt-1 max-w-xs text-sm text-slate-500">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:border-white/20 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
        >
          <RefreshCw className="size-4" aria-hidden="true" />
          Try again
        </button>
      )}
    </div>
  );
}
