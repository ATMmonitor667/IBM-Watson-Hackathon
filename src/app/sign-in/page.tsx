import { Sparkles } from "lucide-react";
import { SignInForm } from "@/components/auth/SignInForm";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-24">
      <div className="story-glow" aria-hidden="true" />

      <section className="relative z-10 flex w-full max-w-sm flex-col items-center gap-8">
        {/* Brand mark */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-300/10 px-4 py-2 text-sm text-violet-100">
            <Sparkles className="size-4" aria-hidden="true" />
            Storyverse
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Welcome back
          </h1>
          <p className="text-sm text-slate-400">
            Sign in to continue to your story workspace.
          </p>
        </div>

        {/* Auth form */}
        <SignInForm />
      </section>
    </main>
  );
}
