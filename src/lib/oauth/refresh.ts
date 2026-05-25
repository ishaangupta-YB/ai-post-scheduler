/**
 * ============================================================================
 * LEGACY — DO NOT TOUCH
 * ============================================================================
 * This file is part of the hand-rolled per-platform OAuth system that was
 * REPLACED by Composio in session 8 (2026-05-25). It is kept (commented out)
 * for historical reference only.
 *
 * Active OAuth + tool execution now lives in:
 *   src/lib/composio/        — SDK client, platform map, connection wrappers
 *   src/lib/composio/tools.ts — direct tool execution (no LLM)
 *   src/app/api/integrations/{connect,callback,disconnect}/route.ts
 *
 * Future agents: DO NOT re-enable, edit, or import from this file. The
 * primitives here (HMAC state, PKCE, AES-GCM token encryption, per-provider
 * exchange code, token refresh) are obsolete because Composio manages OAuth
 * tokens server-side. If you need any of these again, build fresh — don't
 * resurrect this code.
 * ============================================================================
 */

/* eslint-disable */
/*
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

// (Original JSDoc removed during legacy wrap to avoid nested comment closers.)
// Summary: refreshIntegrationTokens(integrationId, userId) decrypted the stored
// refresh_token, called the provider's refreshToken method, re-encrypted, and
// wrote back via a scoped UPDATE. Threw IntegrationNotFoundError /
// IntegrationNotRefreshableError on the various unhappy paths. Was a primitive
// for the future publisher daemon; Composio now handles token refresh, so
// this is obsolete.
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
*/

export {}
