import { and, eq } from "drizzle-orm"
import { headers } from "next/headers"
import { NextResponse } from "next/server"

import { getDb, integrations } from "@/db"
import { integrationPlatforms } from "@/db/integrations-schema"
import { getAuth } from "@/lib/auth"

// Soft disconnect: clear tokens, mark status='revoked'. Keeps the row so
// reconnect upserts back to active and the integration history is preserved.
// Scheduled posts referencing this integration are NOT cascade-deleted.
export async function POST(request: Request) {
  const session = await getAuth().api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as {
    integrationId?: string
  } | null
  if (!body?.integrationId || typeof body.integrationId !== "string") {
    return NextResponse.json(
      { error: "integrationId required" },
      { status: 400 },
    )
  }

  const db = getDb()

  // Defense-in-depth: confirm the row is ours AND points at a known platform
  // before mutating. The user-scoped UPDATE alone already prevents auth bypass,
  // but a stale or malformed row could otherwise be silently no-op'd.
  const existing = await db
    .select({
      id: integrations.id,
      platform: integrations.platform,
    })
    .from(integrations)
    .where(
      and(
        eq(integrations.id, body.integrationId),
        eq(integrations.userId, session.user.id),
      ),
    )
    .limit(1)

  if (existing.length === 0) {
    return NextResponse.json({ error: "not_found" }, { status: 404 })
  }
  if (!(integrationPlatforms as readonly string[]).includes(existing[0].platform)) {
    return NextResponse.json(
      { error: "invalid_platform", message: "Stored platform is not in the supported set" },
      { status: 409 },
    )
  }

  const updated = await db
    .update(integrations)
    .set({
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null,
      status: "revoked",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(integrations.id, body.integrationId),
        eq(integrations.userId, session.user.id),
      ),
    )
    .returning({ id: integrations.id })

  if (updated.length === 0) {
    return NextResponse.json({ error: "not_found" }, { status: 404 })
  }
  return NextResponse.json({ ok: true })
}
