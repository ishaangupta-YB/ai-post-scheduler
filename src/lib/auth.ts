import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { nextCookies } from "better-auth/next-js"
import { getCloudflareContext } from "@opennextjs/cloudflare"

import { getDb, schema } from "@/db"
import { initializeFreeTierUser } from "@/lib/billing/credits"

function kvSecondaryStorage(kv: KVNamespace) {
  return {
    get: async (key: string) => (await kv.get(key)) ?? null,
    set: async (key: string, value: string, ttl?: number) => {
      // Cloudflare KV requires expirationTtl >= 60s; clamp shorter values so
      // Better Auth's short-window rate-limit writes don't fail.
      const expirationTtl = ttl ? Math.max(ttl, 60) : undefined
      await kv.put(key, value, expirationTtl ? { expirationTtl } : undefined)
    },
    delete: async (key: string) => {
      await kv.delete(key)
    },
  }
}

function buildAuth(env: CloudflareEnv) {
  const db = getDb()
  const isProd = env.NEXTJS_ENV !== "development"

  return betterAuth({
    appName: "Broad Sky",
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.BETTER_AUTH_URL],

    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema,
      usePlural: true,
    }),
    secondaryStorage: kvSecondaryStorage(env.AIPOSTSC_AUTH_KV),

    emailAndPassword: { enabled: false },

    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        prompt: "select_account",
      },
    },

    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      cookieCache: { enabled: true, maxAge: 60 * 5 },
    },

    account: { encryptOAuthTokens: true },

    rateLimit: {
      enabled: true,
      storage: "secondary-storage",
      customRules: {
        "/sign-in/social": { window: 60, max: 10 },
        "/callback/:id": { window: 60, max: 20 },
      },
    },

    databaseHooks: {
      session: {
        create: {
          before: async (session) => {
            // Snapshot geo at session creation from Cloudflare's cf object.
            const cf = getCloudflareContext().cf
            if (!cf) return { data: session }
            return {
              data: {
                ...session,
                timezone: cf.timezone ?? null,
                city: cf.city ?? null,
                country: cf.country ?? null,
                region: cf.region ?? null,
                regionCode: cf.regionCode ?? null,
                colo: cf.colo ?? null,
                latitude: cf.latitude ?? null,
                longitude: cf.longitude ?? null,
              },
            }
          },
        },
      },
      user: {
        create: {
          after: async (user) => {
            // Seed free-tier monthly period + initial monthly_grant ledger row.
            // monthlyCreditBalance default (25) is already written by the INSERT.
            await initializeFreeTierUser(user.id)
          },
        },
      },
    },

    advanced: {
      useSecureCookies: isProd,
      cookiePrefix: "broadsky",
      defaultCookieAttributes: { sameSite: "lax" },
      ipAddress: {
        ipAddressHeaders: ["cf-connecting-ip", "x-forwarded-for"],
      },
      backgroundTasks: {
        handler: (promise) => {
          const { ctx } = getCloudflareContext()
          ctx.waitUntil(promise)
        },
      },
    },

    plugins: [nextCookies()],
  })
}

type BetterAuthInstance = ReturnType<typeof buildAuth>

let cached: BetterAuthInstance | null = null

export function getAuth(): BetterAuthInstance {
  if (cached) return cached
  const { env } = getCloudflareContext()
  cached = buildAuth(env)
  return cached
}

export type Session = BetterAuthInstance["$Infer"]["Session"]
