import { drizzle } from "drizzle-orm/d1"
import { getCloudflareContext } from "@opennextjs/cloudflare"

import * as authSchema from "./auth-schema"
import * as billingSchema from "./billing-schema"

export const schema = { ...authSchema, ...billingSchema }

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
