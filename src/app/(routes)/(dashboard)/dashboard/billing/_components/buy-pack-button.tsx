"use client"

import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

export function BuyPackButton({ packId }: { packId: string }) {
  const [isPending, setIsPending] = useState(false)

  async function handleClick() {
    setIsPending(true)
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      })
      const data = (await res.json()) as { checkoutUrl?: string; error?: string }
      if (!res.ok || !data.checkoutUrl) {
        toast.error(data.error ?? "Failed to start checkout")
        setIsPending(false)
        return
      }
      window.location.href = data.checkoutUrl
    } catch {
      toast.error("Failed to start checkout")
      setIsPending(false)
    }
  }

  return (
    <Button onClick={handleClick} disabled={isPending} className="w-full">
      {isPending ? "Redirecting…" : "Buy"}
    </Button>
  )
}
