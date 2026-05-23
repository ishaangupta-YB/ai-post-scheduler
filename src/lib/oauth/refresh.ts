import { and, eq } from "drizzle-orm"

import { getDb } from "@/db"
import { integrations } from "@/db/integrations-schema"

import { decrypt, encryptNullable } from "./crypto"
import { getOAuthProvider } from "./index"

export class IntegrationNotFoundError extends Error {
  constructor(public integrationId: string) {
    super(`Integration ${integrationId} not found`)
    this.name = "IntegrationNotFoundError"
  }
}

export class IntegrationNotRefreshableError extends Error {
  constructor(public platform: string, public reason: string) {
    super(`Integration ${platform} is not refreshable: ${reason}`)
    this.name = "IntegrationNotRefreshableError"
  }
}

/**
 * Refresh OAuth tokens for a stored integration row.
 *
 * Decrypts the stored refresh_token, calls the provider's refreshToken method,
 * re-encrypts the new tokens, and writes them back via a scoped UPDATE.
 *
 * Returns the updated expiry. Throws if:
 *   - the integration row doesn't exist
 *   - the integration is revoked / has no refresh_token
 *   - the provider doesn't expose a `refreshToken` method (Meta providers — Facebook, Instagram, Threads)
 *   - the provider call fails (token revoked, network error, etc.)
 *
 * NOT yet called from anywhere; this is a primitive for the future publisher daemon.
 */
export async function refreshIntegrationTokens(
  integrationId: string,
  userId: string,
): Promise<{ tokenExpiresAt: Date | null }> {
  const db = getDb()
  const rows = await db
    .select()
    .from(integrations)
    .where(
      and(eq(integrations.id, integrationId), eq(integrations.userId, userId)),
    )
    .limit(1)
  const row = rows[0]
  if (!row) throw new IntegrationNotFoundError(integrationId)

  if (row.status === "revoked") {
    throw new IntegrationNotRefreshableError(row.platform, "status=revoked")
  }
  if (!row.refreshToken) {
    throw new IntegrationNotRefreshableError(row.platform, "no refresh_token stored")
  }

  const provider = getOAuthProvider(row.platform)
  if (!provider.refreshToken) {
    throw new IntegrationNotRefreshableError(
      row.platform,
      "provider does not support OAuth refresh_token grant",
    )
  }

  const plaintextRefresh = await decrypt(row.refreshToken)
  const token = await provider.refreshToken({ refreshToken: plaintextRefresh })

  const encAccess = await encryptNullable(token.accessToken)
  // Providers may rotate refresh tokens on each refresh (Google, Twitter, LinkedIn often do).
  // Fall back to the previous one if the response omits a new refresh_token.
  const encRefresh =
    token.refreshToken != null
      ? await encryptNullable(token.refreshToken)
      : row.refreshToken

  const now = new Date()
  await db
    .update(integrations)
    .set({
      accessToken: encAccess,
      refreshToken: encRefresh,
      tokenExpiresAt: token.expiresAt ?? null,
      scope: token.scope ?? row.scope,
      status: "active",
      lastSyncAt: now,
      updatedAt: now,
    })
    .where(eq(integrations.id, integrationId))

  return { tokenExpiresAt: token.expiresAt ?? null }
}
