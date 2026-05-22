// Credit packs — keep IDs stable; they're referenced by ledger rows and Dodo product IDs.
// `dodoProductId` is set per-environment via env vars so test/live keys map to different products.
export type CreditPack = {
  id: string
  label: string
  credits: number
  // Display-only — actual price is enforced by Dodo on the product itself.
  priceUsd: number
  description: string
  popular?: boolean
}

export const CREDIT_PACKS: CreditPack[] = [
  {
    id: "starter",
    label: "Starter",
    credits: 100,
    priceUsd: 5,
    description: "~50 AI-generated posts. Good for trying it out.",
  },
  {
    id: "creator",
    label: "Creator",
    credits: 500,
    priceUsd: 20,
    description: "~250 posts. Best value for active creators.",
    popular: true,
  },
  {
    id: "pro",
    label: "Pro",
    credits: 2000,
    priceUsd: 70,
    description: "~1000 posts. For agencies and heavy users.",
  },
]

export function getPack(id: string): CreditPack | undefined {
  return CREDIT_PACKS.find((p) => p.id === id)
}

// Maps our internal pack id -> Dodo product id, from env vars set per environment.
// Set DODO_PRODUCT_STARTER, DODO_PRODUCT_CREATOR, DODO_PRODUCT_PRO in .dev.vars / wrangler secrets.
export function getDodoProductId(
  env: CloudflareEnv,
  packId: string,
): string | undefined {
  const map: Record<string, string | undefined> = {
    starter: env.DODO_PRODUCT_STARTER,
    creator: env.DODO_PRODUCT_CREATOR,
    pro: env.DODO_PRODUCT_PRO,
  }
  return map[packId]
}
