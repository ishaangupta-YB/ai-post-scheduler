import type { IntegrationPlatform } from "@/db/integrations-schema"

import { getComposio } from "./client"
import { getAuthConfigId } from "./platforms"

export type StartConnectionResult = {
  connectedAccountId: string
  redirectUrl: string | null
}

export async function startConnection(args: {
  userId: string
  platform: IntegrationPlatform
  callbackUrl: string
}): Promise<StartConnectionResult> {
  const authConfigId = getAuthConfigId(args.platform)
  const composio = getComposio()
  const request = await composio.connectedAccounts.link(
    args.userId,
    authConfigId,
    { callbackUrl: args.callbackUrl },
  )
  return {
    connectedAccountId: request.id,
    redirectUrl: request.redirectUrl ?? null,
  }
}

export type ConnectionDetails = {
  id: string
  status: string
  // Provider-specific data lives in `data` — typed as `unknown` because the
  // shape varies per toolkit. Callers should narrow at the call site.
  data: unknown
  toolkitSlug?: string
}

export async function getConnection(
  connectedAccountId: string,
): Promise<ConnectionDetails | null> {
  const composio = getComposio()
  try {
    const res = await composio.connectedAccounts.get(connectedAccountId)
    const r = res as unknown as {
      id?: string
      status?: string
      data?: unknown
      toolkit?: { slug?: string }
    }
    return {
      id: r.id ?? connectedAccountId,
      status: r.status ?? "UNKNOWN",
      data: r.data ?? null,
      toolkitSlug: r.toolkit?.slug,
    }
  } catch (err) {
    if (isNotFound(err)) return null
    throw err
  }
}

// Deletes the connection on Composio. Swallows 404 — if the account is
// already gone we still want our local soft-revoke to succeed.
export async function deleteConnection(
  connectedAccountId: string,
): Promise<void> {
  const composio = getComposio()
  try {
    await composio.connectedAccounts.delete(connectedAccountId)
  } catch (err) {
    if (isNotFound(err)) return
    throw err
  }
}

function isNotFound(err: unknown): boolean {
  if (!err || typeof err !== "object") return false
  const e = err as { name?: string; code?: string; statusCode?: number }
  return (
    e.name === "ComposioConnectedAccountNotFoundError" ||
    e.code === "CONNECTED_ACCOUNT_NOT_FOUND" ||
    e.statusCode === 404
  )
}
