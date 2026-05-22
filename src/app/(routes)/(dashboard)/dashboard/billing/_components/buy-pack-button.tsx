"use client"

import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

type CheckoutResponse = { checkoutUrl?: string; error?: string }

async function startCheckout(
  body: Record<string, unknown>,
): Promise<CheckoutResponse> {
  const res = await fetch("/api/billing/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return (await res.json()) as CheckoutResponse
}

export function SubscribeButton({
  planId,
  billingCycle,
  currentPlanId,
  currentBillingCycle,
  planStatus,
}: {
  planId: string
  billingCycle: "monthly" | "annual"
  currentPlanId: string | null
  currentBillingCycle: "monthly" | "annual" | null
  planStatus: string | null
}) {
  const [isPending, setIsPending] = useState(false)
  const isCurrent =
    currentPlanId === planId &&
    currentBillingCycle === billingCycle &&
    planStatus === "active"

  async function handleClick() {
    setIsPending(true)
    try {
      const data = await startCheckout({
        purchaseType: "subscription",
        planId,
        billingCycle,
      })
      if (!data.checkoutUrl) {
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

  if (isCurrent) {
    return (
      <Button disabled className="w-full" variant="secondary">
        Current plan
      </Button>
    )
  }

  return (
    <Button onClick={handleClick} disabled={isPending} className="w-full">
      {isPending
        ? "Redirecting…"
        : currentPlanId
          ? "Switch to this plan"
          : "Subscribe"}
    </Button>
  )
}

export function BuyTopupButton({ packId }: { packId: string }) {
  const [isPending, setIsPending] = useState(false)

  async function handleClick() {
    setIsPending(true)
    try {
      const data = await startCheckout({
        purchaseType: "topup",
        packId,
      })
      if (!data.checkoutUrl) {
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
      {isPending ? "Redirecting…" : "Buy top-up"}
    </Button>
  )
}
