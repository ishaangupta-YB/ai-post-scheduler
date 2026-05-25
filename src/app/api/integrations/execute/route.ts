import { and, eq } from "drizzle-orm"
import { headers } from "next/headers"
import { NextResponse } from "next/server"

import { getDb, integrations } from "@/db"
import {
  integrationPlatforms,
  type IntegrationPlatform,
} from "@/db/integrations-schema"
import { getAuth } from "@/lib/auth"
import { ComposioNotConfiguredError } from "@/lib/composio/client"
import { executeIntegrationTool } from "@/lib/composio/tools"

// Smoke-test endpoint for direct Composio tool execution. No LLM, no agent.
// Body: { platform, toolSlug, arguments, version? }. The caller is
// responsible for picking a real toolSlug (verify via composio.tools.get()).
// In production this would be invoked by the publisher daemon; for now it's
// the curl-able surface for testing post flows.
export async function POST(request: Request) {
  const session = await getAuth().api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as {
    platform?: string
    toolSlug?: string
    arguments?: Record<string, unknown>
    version?: string
  } | null

  if (!body) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 })
  }
  if (
    !body.platform ||
    !(integrationPlatforms as readonly string[]).includes(body.platform)
  ) {
    return NextResponse.json(
      { error: "invalid_platform" },
      { status: 400 },
    )
  }
  if (!body.toolSlug || typeof body.toolSlug !== "string") {
    return NextResponse.json(
      { error: "toolSlug required" },
      { status: 400 },
    )
  }
  if (!body.arguments || typeof body.arguments !== "object") {
    return NextResponse.json(
      { error: "arguments required" },
      { status: 400 },
    )
  }

  const platform = body.platform as IntegrationPlatform

  const db = getDb()
  const rows = await db
    .select({
      id: integrations.id,
      status: integrations.status,
      composioConnectedAccountId: integrations.composioConnectedAccountId,
    })
    .from(integrations)
    .where(
      and(
        eq(integrations.userId, session.user.id),
        eq(integrations.platform, platform),
      ),
    )
    .limit(1)

  if (rows.length === 0 || !rows[0].composioConnectedAccountId) {
    return NextResponse.json(
      {
        error: "not_connected",
        message: `No active ${platform} connection. Connect first at /dashboard/integrations.`,
      },
      { status: 409 },
    )
  }
  if (rows[0].status !== "active") {
    return NextResponse.json(
      {
        error: "connection_inactive",
        message: `Connection status is '${rows[0].status}'. Reconnect at /dashboard/integrations.`,
      },
      { status: 409 },
    )
  }

  try {
    const result = await executeIntegrationTool({
      userId: session.user.id,
      toolSlug: body.toolSlug,
      arguments: body.arguments,
      version: body.version,
    })
    return NextResponse.json(result, { status: result.ok ? 200 : 502 })
  } catch (err) {
    if (err instanceof ComposioNotConfiguredError) {
      return NextResponse.json(
        {
          error: "not_configured",
          message: err.message,
          missing: err.missingKeys,
        },
        { status: 503 },
      )
    }
    const message = err instanceof Error ? err.message : String(err)
    console.error(
      `[composio/execute] failed userId=${session.user.id} platform=${platform} toolSlug=${body.toolSlug} message=${message}`,
    )
    return NextResponse.json(
      { error: "composio_failed", message },
      { status: 502 },
    )
  }
}
