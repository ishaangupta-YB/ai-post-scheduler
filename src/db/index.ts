import { drizzle } from "drizzle-orm/d1"
import { getCloudflareContext } from "@opennextjs/cloudflare"

import * as authSchema from "./auth-schema"
import * as billingSchema from "./billing-schema"
import * as integrationsSchema from "./integrations-schema"
import * as contentSchema from "./content-schema"

export const schema = {
  ...authSchema,
  ...billingSchema,
  ...integrationsSchema,
  ...contentSchema,
}

export type Schema = typeof schema
export type DB = ReturnType<typeof drizzle<Schema>>

let cached: DB | null = null

export function getDb(): DB {
  if (cached) return cached
  const { env } = getCloudflareContext()
  cached = drizzle(env.DB, { schema })
  return cached
}

export * from "./auth-schema"
export * from "./billing-schema"
export * from "./integrations-schema"
export * from "./content-schema"
