// Catalog of subscription plans and one-time top-up packs.
// All IDs are stable — they're referenced in the credit ledger and stored on user rows.
// Per-environment Dodo product IDs come from env vars (.dev.vars / wrangler secrets).

export type Plan = {
  id: string
  label: string
  /** Credits issued each monthly period. Resets to this number on renewal. */
  monthlyCredits: number
  /** Display-only price; canonical price lives on the Dodo product itself. */
  priceUsd: number
  description: string
  features: string[]
  popular?: boolean
}

export type TopupPack = {
  id: string
  label: string
  credits: number
  priceUsd: number
  description: string
}

// Monthly subscription plans. Each user can hold AT MOST one. Free-tier users have planId=null.
export const PLANS: readonly Plan[] = [
  {
    id: "starter",
    label: "Starter",
    monthlyCredits: 100,
    priceUsd: 5,
    description: "~50 AI drafts every month. Good for solo creators.",
    features: [
      "100 credits / month",
      "Connect 1 social account",
      "Basic scheduling queue",
      "Community support",
    ],
  },
  {
    id: "creator",
    label: "Creator",
    monthlyCredits: 500,
    priceUsd: 20,
    description: "~250 AI drafts every month. Best value.",
    features: [
      "500 credits / month",
      "Connect up to 5 accounts",
      "Persona tuning & tone match",
      "Optimal-time analytics",
      "Priority support",
    ],
    popular: true,
  },
  {
    id: "pro",
    label: "Pro",
    monthlyCredits: 2000,
    priceUsd: 70,
    description: "~1,000 AI drafts every month. For agencies.",
    features: [
      "2,000 credits / month",
      "Unlimited social accounts",
      "Custom AI persona models",
      "Advanced analytics & exports",
      "Dedicated onboarding",
    ],
  },
]

export const FREE_TIER_MONTHLY_CREDITS = 25

/** A free monthly period is exactly 30 days. Paid plans are driven by Dodo's billing cycle. */
export const FREE_TIER_PERIOD_DAYS = 30

// One-time top-up packs. These NEVER expire — they accumulate in topupCreditBalance forever.
export const TOPUP_PACKS: readonly TopupPack[] = [
  {
    id: "topup_500",
    label: "Extra 500 credits",
    credits: 500,
    priceUsd: 20,
    description: "One-time top-up. Never expires.",
  },
]

export function getPlan(planId: string | null | undefined): Plan | undefined {
  if (!planId) return undefined
  return PLANS.find((p) => p.id === planId)
}

export function getTopupPack(packId: string): TopupPack | undefined {
  return TOPUP_PACKS.find((p) => p.id === packId)
}

/** Allotment to reset monthly_credit_balance to. Free tier when planId is null. */
export function getPlanMonthlyAllotment(planId: string | null | undefined): number {
  const plan = getPlan(planId)
  return plan ? plan.monthlyCredits : FREE_TIER_MONTHLY_CREDITS
}

// Maps internal plan/pack ids → Dodo product IDs from env vars. Set per environment.
export function getDodoPlanProductId(
  env: CloudflareEnv,
  planId: string,
): string | undefined {
  const map: Record<string, string | undefined> = {
    starter: env.DODO_PLAN_STARTER,
    creator: env.DODO_PLAN_CREATOR,
    pro: env.DODO_PLAN_PRO,
  }
  return map[planId]
}

export function getDodoTopupProductId(
  env: CloudflareEnv,
  packId: string,
): string | undefined {
  const map: Record<string, string | undefined> = {
    topup_500: env.DODO_TOPUP_500,
  }
  return map[packId]
}
