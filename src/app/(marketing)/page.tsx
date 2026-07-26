import { ArrowRight, GitBranch, Sparkles } from "lucide-react";

export default function Home() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-24">
      <div className="story-glow" aria-hidden="true" />
      <section className="relative z-10 mx-auto max-w-4xl text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-300/10 px-4 py-2 text-sm text-violet-100">
          <Sparkles className="size-4" aria-hidden="true" />
          Built for visual storytelling teams
        </div>
        <h1 className="text-balance text-5xl font-semibold tracking-tight sm:text-7xl">
          Explore every possible world. Keep your canon intact.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-8 text-slate-300">
          Storyverse is a collaborative visual-storytelling workspace where teams branch,
          review, and merge ideas while AI protects continuity and visual consistency.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <button className="inline-flex h-12 items-center gap-2 rounded-full bg-violet-500 px-6 font-medium text-white transition hover:bg-violet-400 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-300">
            Enter the workspace
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>
          <div className="inline-flex h-12 items-center gap-2 rounded-full border border-white/10 px-6 text-slate-200">
            <GitBranch className="size-4 text-cyan-300" aria-hidden="true" />
            Next.js foundation ready
          </div>
        </div>
      </section>
    </main>
  );
}
