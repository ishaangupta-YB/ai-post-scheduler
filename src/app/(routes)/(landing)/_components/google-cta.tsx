"use client"

import { useState } from "react"
import { ArrowRight } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"

export function GoogleCta() {
  const [isPending, setIsPending] = useState(false)

  async function handleClick() {
    setIsPending(true)
    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/dashboard/ideas",
      errorCallbackURL: "/sign-in?error=oauth",
    })
    if (error) {
      toast.error(error.message ?? "Sign in failed. Please try again.")
      setIsPending(false)
    }
  }

  return (
    <Button size="lg" onClick={handleClick} disabled={isPending}>
      {isPending ? "Redirecting…" : "Sign in with Google"}
      <ArrowRight className="size-4" />
    </Button>
  )
}
