"use client"

import { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { Leaf } from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { APP_NAME } from "@/lib/constants/app"

function GoogleIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-4 shrink-0"
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.08-1.92 3.28-4.74 3.28-8.07z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1A6.7 6.7 0 0 1 5.5 12c0-.73.12-1.44.34-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.93l3.66-2.83z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.07.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  )
}

function GitHubIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-4 fill-current shrink-0"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  )
}

function SignInForm() {
  const params = useSearchParams()
  const redirect = params.get("redirect") ?? "/dashboard/ideas"
  const [isPending, setIsPending] = useState(false)

  async function handleGoogle() {
    setIsPending(true)
    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: redirect,
    })
    if (error) {
      toast.error(error.message ?? "Sign in failed. Please try again.")
      setIsPending(false)
    }
  }

  function handleGitHubPreview() {
    toast.info("GitHub login is currently in preview. Please use Google.")
  }

  function handleEmailPreview() {
    toast.info("Email sign-in is currently in preview. Please use Google.")
  }

  return (
    <div className="w-full max-w-[420px] rounded-2xl border border-border bg-[#18181b] p-8 shadow-xl text-zinc-100 animate-in fade-in zoom-in-95 duration-300">
      {/* Brand Block */}
      <div className="flex flex-col items-center justify-center gap-2 mb-6">
        <div className="flex aspect-square size-11 items-center justify-center rounded-xl bg-[#84cc16] text-zinc-950 shadow-sm">
          <Leaf className="size-6 fill-current" />
        </div>
        <span className="text-xl font-bold tracking-tight text-zinc-50">{APP_NAME}</span>
      </div>

      {/* Header text */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold tracking-tight text-zinc-50">Sign in to your account</h2>
        <p className="text-xs text-zinc-400 mt-1.5">
          Choose your preferred method to access your workspace.
        </p>
      </div>

      {/* Buttons and Actions */}
      <div className="flex flex-col gap-4">
        {/* Side-by-side OAuth buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleGoogle}
            disabled={isPending}
            className="flex h-10 items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 text-sm font-semibold text-zinc-200 hover:bg-zinc-750 transition-colors disabled:opacity-50 cursor-pointer"
            type="button"
          >
            <GoogleIcon />
            <span>Google</span>
          </button>

          <button
            onClick={handleGitHubPreview}
            disabled={isPending}
            className="flex h-10 items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 text-sm font-semibold text-zinc-200 hover:bg-zinc-750 transition-colors disabled:opacity-50 cursor-pointer"
            type="button"
          >
            <GitHubIcon />
            <span>GitHub</span>
          </button>
        </div>

        {/* Separator line */}
        <div className="relative my-2">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-zinc-800" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[#18181b] px-3 text-zinc-500 font-medium font-mono">or</span>
          </div>
        </div>

        {/* White pill button: Continue with Email */}
        <button
          onClick={handleEmailPreview}
          disabled={isPending}
          className="flex h-11 items-center justify-center rounded-full bg-zinc-50 text-sm font-bold text-zinc-950 hover:bg-zinc-200 transition-colors shadow-sm cursor-pointer"
          type="button"
        >
          Continue with Email
        </button>
      </div>

      <div className="text-center mt-6 text-[10px] text-zinc-500 leading-normal">
        By signing in, you agree to our Terms of Service<br />and Privacy Policy.
      </div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <main className="grid min-h-svh place-items-center p-6 bg-zinc-950 dark:bg-zinc-950">
      <Suspense fallback={
        <div className="flex items-center justify-center">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-transparent" />
        </div>
      }>
        <SignInForm />
      </Suspense>
    </main>
  )
}
