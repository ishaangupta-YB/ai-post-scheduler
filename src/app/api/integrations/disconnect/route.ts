import { and, eq } from "drizzle-orm"
import { headers } from "next/headers"
import { NextResponse } from "next/server"

import { getDb, integrations } from "@/db"
import { integrationPlatforms } from "@/db/integrations-schema"
import { getAuth } from "@/lib/auth"
import { deleteConnection } from "@/lib/composio/connections"

// Soft disconnect: clear our stored Composio link and mark status='revoked'.
// Also tells Composio to delete the connected account so it stops counting
// against the user's quota and can't be silently re-attached. We swallow
// Composio errors so the local revoke still succeeds if the SDK is down.
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

  const existing = await db
    .select({
      id: integrations.id,
      platform: integrations.platform,
      composioConnectedAccountId: integrations.composioConnectedAccountId,
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
      {
        error: "invalid_platform",
        message: "Stored platform is not in the supported set",
      },
      { status: 409 },
    )
  }

  if (existing[0].composioConnectedAccountId) {
    try {
      await deleteConnection(existing[0].composioConnectedAccountId)
    } catch (err) {
      // Best-effort — log and continue. Local revoke still happens.
      const message = err instanceof Error ? err.message : String(err)
      console.error(
        `[composio/disconnect] delete failed integrationId=${body.integrationId} userId=${session.user.id} message=${message}`,
      )
    }
  }

  const updated = await db
    .update(integrations)
    .set({
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null,
      composioConnectedAccountId: null,
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
