"use client"

import { useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const UPDATED_EVENT = "integrations:updated"

export function ConnectButton({ platform }: { platform: string }) {
  const [isPending, setIsPending] = useState(false)

  async function handleClick() {
    setIsPending(true)
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      })
      if (res.status === 501) {
        toast("OAuth flow coming soon", {
          description: `Connecting ${platform} requires per-platform OAuth, which is on the roadmap.`,
        })
      } else if (!res.ok) {
        toast.error("Could not start connection")
      } else {
        window.dispatchEvent(new Event(UPDATED_EVENT))
      }
    } catch {
      toast.error("Network error")
    } finally {
      setIsPending(false)
    }
  }

  return (
    <>
      <Badge
        variant="outline"
        className="text-muted-foreground border-muted hidden sm:inline-flex"
      >
        Disconnected
      </Badge>
      <Button
        size="sm"
        onClick={handleClick}
        disabled={isPending}
        className="bg-warning text-warning-foreground hover:bg-warning/90 hover:text-warning-foreground font-semibold cursor-pointer shadow-xs transition-colors"
      >
        {isPending ? "Connecting…" : "Connect"}
      </Button>
    </>
  )
}

export function DisconnectButton({
  integrationId,
}: {
  integrationId: string
}) {
  const [isPending, setIsPending] = useState(false)

  async function handleClick() {
    setIsPending(true)
    try {
      const res = await fetch("/api/integrations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ integrationId }),
      })
      if (!res.ok) {
        toast.error("Failed to disconnect")
        return
      }
      window.dispatchEvent(new Event(UPDATED_EVENT))
      // Refresh server-rendered list. router.refresh() would be ideal — done with reload to keep this dep-free.
      window.location.reload()
    } catch {
      toast.error("Network error")
    } finally {
      setIsPending(false)
    }
  }

  return (
    <>
      <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/10 hidden sm:inline-flex">
        Connected
      </Badge>
      <Button
        size="sm"
        variant="outline"
        onClick={handleClick}
        disabled={isPending}
        className="cursor-pointer"
      >
        {isPending ? "Disconnecting…" : "Disconnect"}
      </Button>
    </>
  )
}
