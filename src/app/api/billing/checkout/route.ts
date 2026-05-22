import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { getCloudflareContext } from "@opennextjs/cloudflare"

import { getAuth } from "@/lib/auth"
import { createPayment, createSubscription } from "@/lib/billing/dodo"
import {
  getDodoPlanProductId,
  getDodoTopupProductId,
  getPlan,
  getTopupPack,
} from "@/lib/billing/packs"

type CheckoutBody =
  | {
      purchaseType: "subscription"
      planId: string
      billingCycle?: "monthly" | "annual"
    }
  | { purchaseType: "topup"; packId: string }

export async function POST(request: Request) {
  const auth = getAuth()
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as
    | Partial<CheckoutBody>
    | null
  if (!body?.purchaseType) {
    return NextResponse.json(
      { error: "purchaseType required" },
      { status: 400 },
    )
  }

  const { env, cf } = getCloudflareContext()
  const billingCountry = cf?.country ?? "US"
  const customer = { email: session.user.email, name: session.user.name }

  if (body.purchaseType === "subscription") {
    const planId = body.planId
    if (!planId) {
      return NextResponse.json(
        { error: "planId required for subscription" },
        { status: 400 },
      )
    }
    const plan = getPlan(planId)
    if (!plan) {
      return NextResponse.json({ error: "unknown plan" }, { status: 404 })
    }
    const billingCycle: "monthly" | "annual" =
      body.billingCycle === "annual" ? "annual" : "monthly"
    const productId = getDodoPlanProductId(env, plan.id, billingCycle)
    if (!productId) {
      return NextResponse.json(
        { error: `plan ${plan.id} (${billingCycle}) not configured` },
        { status: 500 },
      )
    }
    const result = await createSubscription(env, {
      productId,
      customer,
      billing: { country: billingCountry },
      returnUrl: `${env.BETTER_AUTH_URL}/dashboard/billing?status=subscribed`,
      metadata: {
        user_id: session.user.id,
        plan_id: plan.id,
        billing_cycle: billingCycle,
        purchase_type: "subscription",
      },
    })
    return NextResponse.json({
      subscriptionId: result.subscription_id,
      checkoutUrl: result.payment_link,
    })
  }

  if (body.purchaseType === "topup") {
    const packId = body.packId
    if (!packId) {
      return NextResponse.json(
        { error: "packId required for topup" },
        { status: 400 },
      )
    }
    const pack = getTopupPack(packId)
    if (!pack) {
      return NextResponse.json({ error: "unknown pack" }, { status: 404 })
    }
    const productId = getDodoTopupProductId(env, pack.id)
    if (!productId) {
      return NextResponse.json(
        { error: `pack ${pack.id} not configured` },
        { status: 500 },
      )
    }
    const result = await createPayment(env, {
      productId,
      customer,
      billing: { country: billingCountry },
      returnUrl: `${env.BETTER_AUTH_URL}/dashboard/billing?status=topped-up`,
      metadata: {
        user_id: session.user.id,
        pack_id: pack.id,
        credits: String(pack.credits),
        purchase_type: "topup",
      },
    })
    return NextResponse.json({
      paymentId: result.payment_id,
      checkoutUrl: result.payment_link,
    })
  }

  return NextResponse.json(
    { error: "invalid purchaseType" },
    { status: 400 },
  )
}
