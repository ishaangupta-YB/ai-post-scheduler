import { and, eq } from "drizzle-orm"
import { headers } from "next/headers"
import { NextResponse } from "next/server"

import { getDb, integrations } from "@/db"
import { getAuth } from "@/lib/auth"
import {
  INTEGRATIONS,
  IntegrationTypeEnum,
  type Integration,
} from "@/lib/constants/integrations"

// Response item: static taxonomy fields merged with the user's DB row (if connected).
export type IntegrationListItem = {
  platform: keyof typeof IntegrationTypeEnum
  label: string
  brandColor: string
  charLimit: number
  url: string
  integrationId: string | null
  handle: string | null
  profileImage: string | null
  profileUrl: string | null
  status: "active" | "expired" | "revoked" | null
  connected: boolean
  lastSyncAt: number | null
  connectedAt: number | null
}

export type IntegrationListResponse = {
  integrations: IntegrationListItem[]
  counts: { connected: number; total: number }
}

export async function GET(request: Request) {
  const session = await getAuth().api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const filter = new URL(request.url).searchParams.get("filter")

  const db = getDb()
  const userRows = await db
    .select()
    .from(integrations)
    .where(eq(integrations.userId, session.user.id))

  const byPlatform = new Map(userRows.map((row) => [row.platform, row]))

  let items: IntegrationListItem[] = INTEGRATIONS.map(
    (integration: Integration) => {
      const platform = integration.type
      const row = byPlatform.get(platform)
      return {
        platform: platform as keyof typeof IntegrationTypeEnum,
        label: integration.label,
        brandColor: integration.brandColor,
        charLimit: integration.charLimit,
        url: integration.url,
        integrationId: row?.id ?? null,
        handle: row?.handle ?? null,
        profileImage: row?.profileImage ?? null,
        profileUrl: row?.profileUrl ?? null,
        status: row?.status ?? null,
        connected: row ? row.status === "active" : false,
        lastSyncAt: row?.lastSyncAt ? row.lastSyncAt.getTime() : null,
        connectedAt: row?.connectedAt ? row.connectedAt.getTime() : null,
      }
    },
  )

  const total = items.length
  const connected = items.filter((i) => i.connected).length

  if (filter === "connected") {
    items = items.filter((i) => i.connected)
  } else if (filter === "unconnected") {
    items = items.filter((i) => !i.connected)
  }

  const body: IntegrationListResponse = {
    integrations: items,
    counts: { connected, total },
  }
  return NextResponse.json(body)
}

// OAuth start/callback per platform — out of scope for this iteration.
// Returns 501 so the UI can surface a "Coming soon" toast without misleading.
export async function POST() {
  return NextResponse.json(
    { error: "not_implemented", message: "OAuth flows are not wired yet." },
    { status: 501 },
  )
}

// Disconnect: remove the row scoped to the session user. CASCADE drops any
// scheduled_posts that targeted this integration.
export async function DELETE(request: Request) {
  const session = await getAuth().api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as {
    integrationId?: string
  } | null
  if (!body?.integrationId) {
    return NextResponse.json(
      { error: "integrationId required" },
      { status: 400 },
    )
  }

  const db = getDb()
  const deleted = await db
    .delete(integrations)
    .where(
      and(
        eq(integrations.id, body.integrationId),
        eq(integrations.userId, session.user.id),
      ),
    )
    .returning({ id: integrations.id })

  if (deleted.length === 0) {
    return NextResponse.json({ error: "not_found" }, { status: 404 })
  }
  return NextResponse.json({ ok: true })
}
