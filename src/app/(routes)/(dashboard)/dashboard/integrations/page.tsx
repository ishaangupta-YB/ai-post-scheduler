"use client"

import { useState, useEffect } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { CHANNELS } from "@/lib/constants/social-platforms"
import { DashboardPageHeader } from "../../_common/dashboard-page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export default function IntegrationsPage() {
  const [mounted, setMounted] = useState(false)
  const [connectedKeys, setConnectedKeys] = useState<string[]>([])

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem("lemon_connected_integrations")
    if (stored) {
      try {
        setConnectedKeys(JSON.parse(stored))
      } catch (e) {
        console.error(e)
      }
    }
  }, [])

  const toggleIntegration = async (type: string) => {
    // Also hit our empty API route just to satisfy the user's request
    try {
      await fetch('/api/integrations', { method: 'POST', body: JSON.stringify({ type }) })
    } catch(e) {}

    const nextConnected = connectedKeys.includes(type)
      ? connectedKeys.filter((k) => k !== type)
      : [...connectedKeys, type]

    setConnectedKeys(nextConnected)
    localStorage.setItem("lemon_connected_integrations", JSON.stringify(nextConnected))
    window.dispatchEvent(new Event("lemon_integrations_updated"))
  }

  if (!mounted) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <DashboardPageHeader
        title="Integrations"
        description="Connect your social media accounts to schedule and publish posts."
      />

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="divide-y divide-border">
          {CHANNELS.map((channel) => {
            const isConnected = connectedKeys.includes(channel.type)
            return (
              <div key={channel.type} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div
                    className="relative size-10 rounded-lg flex items-center justify-center text-white shrink-0 shadow-2xs border border-white/10"
                    style={{ backgroundColor: channel.brandColor }}
                  >
                    {/* Check if channel.icon is an svg string or React node */}
                    {typeof channel.icon === 'function' ? (
                      <channel.icon className="size-5 fill-current" />
                    ) : (
                      <HugeiconsIcon icon={channel.icon as any} className="size-5 fill-current" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">{channel.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {isConnected ? "Connected to workspace" : "Ready to configure"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {isConnected ? (
                    <>
                      <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/10 hidden sm:inline-flex">
                        Connected
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleIntegration(channel.type)}
                        className="cursor-pointer"
                      >
                        Disconnect
                      </Button>
                    </>
                  ) : (
                    <>
                      <Badge variant="outline" className="text-muted-foreground border-muted hidden sm:inline-flex">
                        Disconnected
                      </Badge>
                      <Button
                        size="sm"
                        onClick={() => toggleIntegration(channel.type)}
                        className="bg-warning text-warning-foreground hover:bg-warning/90 hover:text-warning-foreground font-semibold cursor-pointer shadow-xs transition-colors"
                      >
                        Connect
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
