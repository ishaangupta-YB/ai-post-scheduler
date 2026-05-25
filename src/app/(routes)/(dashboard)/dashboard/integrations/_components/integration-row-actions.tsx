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
      const res = await fetch("/api/integrations/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      })
      if (res.status === 503) {
        const json = (await res.json().catch(() => null)) as {
          error?: string
          message?: string
          missing?: string[]
        } | null
        if (json?.error === "platform_disabled") {
          toast("Coming soon", {
            description:
              json.message ??
              `${platform} via Composio is coming soon — we're working on it.`,
          })
          return
        }
        const missing = json?.missing ?? []
        toast("Not configured", {
          description:
            missing.length > 0
              ? `Set these env vars to enable ${platform}: ${missing.join(", ")}`
              : json?.message ?? `This integration isn't configured yet.`,
        })
        return
      }
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as {
          message?: string
        } | null
        toast.error("Could not start connection", {
          description: json?.message,
        })
        return
      }
      const json = (await res.json().catch(() => null)) as { url?: string } | null
      if (!json?.url) {
        toast.error("Provider did not return an authorization URL")
        return
      }
      window.location.href = json.url
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
      const res = await fetch("/api/integrations/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ integrationId }),
      })
      if (!res.ok) {
        toast.error("Failed to disconnect")
        return
      }
      window.dispatchEvent(new Event(UPDATED_EVENT))
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
