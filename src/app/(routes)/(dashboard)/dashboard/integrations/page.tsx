import { Suspense } from "react"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { eq } from "drizzle-orm"

import { getDb, integrations } from "@/db"
import { getAuth } from "@/lib/auth"
import { INTEGRATIONS } from "@/lib/constants/integrations"

import { DashboardPageHeader } from "../../_common/dashboard-page-header"
import { CallbackToastBanner } from "./_components/callback-toast-banner"
import {
  ConnectButton,
  DisconnectButton,
} from "./_components/integration-row-actions"

export const dynamic = "force-dynamic"

export default async function IntegrationsPage() {
  const session = await getAuth().api.getSession({ headers: await headers() })
  if (!session) redirect("/sign-in")

  const db = getDb()
  const userRows = await db
    .select()
    .from(integrations)
    .where(eq(integrations.userId, session.user.id))

  const byPlatform = new Map(userRows.map((row) => [row.platform, row]))

  const connectedCount = userRows.filter((r) => r.status === "active").length

  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={null}>
        <CallbackToastBanner />
      </Suspense>
      <DashboardPageHeader
        title="Integrations"
        description="Connect your social media accounts to schedule and publish posts."
      />

      <div className="text-xs font-medium text-muted-foreground">
        {connectedCount} of {INTEGRATIONS.length} connected
      </div>

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="divide-y divide-border">
          {INTEGRATIONS.map((integration) => {
            const row = byPlatform.get(integration.type)
            const isConnected = row ? row.status === "active" : false
            return (
              <div
                key={integration.type}
                className="flex items-center justify-between gap-4 px-5 py-4"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="relative size-10 rounded-lg flex items-center justify-center text-white shrink-0 shadow-2xs border border-white/10"
                    style={{ backgroundColor: integration.brandColor }}
                  >
                    <integration.icon className="size-5 fill-current" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">
                      {integration.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {isConnected
                        ? row?.handle
                          ? `Connected as ${row.handle}`
                          : "Connected to workspace"
                        : "Ready to configure"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {isConnected && row ? (
                    <DisconnectButton integrationId={row.id} />
                  ) : (
                    <ConnectButton platform={integration.type} />
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
