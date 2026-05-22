"use client"

import { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { authClient } from "@/lib/auth-client"

function GoogleIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-4"
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
    // On success the browser is redirected to Google — no need to clear state.
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Sign in to Broad Sky</CardTitle>
        <CardDescription>
          Continue with your Google account to access your workspace.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={handleGoogle}
          disabled={isPending}
        >
          <GoogleIcon />
          {isPending ? "Redirecting…" : "Continue with Google"}
        </Button>
      </CardContent>
    </Card>
  )
}

export default function SignInPage() {
  return (
    <main className="grid min-h-svh place-items-center p-6">
      <Suspense fallback={null}>
        <SignInForm />
      </Suspense>
    </main>
  )
}
