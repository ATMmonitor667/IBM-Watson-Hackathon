// Skeleton shimmer for loading states
export function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-slate-800 ${className}`}
      aria-hidden="true"
    />
  );
}

// Full workspace page skeleton
export function WorkspacePageSkeleton() {
  return (
    <div className="flex h-full flex-col">
      {/* Header skeleton */}
      <div className="flex items-center justify-between border-b border-white/10 bg-slate-900/60 px-6 py-4">
        <div className="flex items-center gap-3">
          <SkeletonBlock className="h-5 w-40" />
          <SkeletonBlock className="h-5 w-20 rounded-full" />
        </div>
        <div className="flex items-center gap-5">
          <SkeletonBlock className="h-4 w-28" />
          <SkeletonBlock className="h-4 w-10" />
          <SkeletonBlock className="h-4 w-16" />
        </div>
      </div>

      {/* Body skeleton */}
      <div className="flex flex-1 overflow-hidden">
        {/* Scene canvas skeleton */}
        <div className="flex flex-1 flex-col gap-4 p-6">
          <SkeletonBlock className="h-4 w-24" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-lg border border-white/10 bg-slate-900 p-4">
                <SkeletonBlock className="mb-3 h-32 w-full" />
                <SkeletonBlock className="mb-2 h-4 w-3/4" />
                <SkeletonBlock className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        </div>

        {/* Branch tree skeleton */}
        <div className="flex w-[420px] shrink-0 flex-col border-l border-white/10 bg-slate-900 p-4 gap-4">
          <SkeletonBlock className="h-4 w-20" />
          <div className="flex flex-col items-center gap-4 pt-4">
            {[1, 2, 3].map((i) => (
              <SkeletonBlock key={i} className="h-12 w-36 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Sidebar projects list skeleton
export function SidebarProjectsSkeleton() {
  return (
    <div className="flex flex-col gap-1 px-2">
      {[1, 2, 3].map((i) => (
        <SkeletonBlock key={i} className="h-8 w-full rounded-md" />
      ))}
    </div>
  );
}
