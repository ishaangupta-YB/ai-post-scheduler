import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { getCloudflareContext } from "@opennextjs/cloudflare"

import { getAuth } from "@/lib/auth"
import { createPayment } from "@/lib/billing/dodo"
import { getPack, getDodoProductId } from "@/lib/billing/packs"

export async function POST(request: Request) {
  const auth = getAuth()
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as
    | { packId?: string }
    | null
  const packId = body?.packId
  if (!packId) {
    return NextResponse.json({ error: "packId required" }, { status: 400 })
  }

  const pack = getPack(packId)
  if (!pack) {
    return NextResponse.json({ error: "unknown pack" }, { status: 404 })
  }

  const { env, cf } = getCloudflareContext()
  const productId = getDodoProductId(env, pack.id)
  if (!productId) {
    return NextResponse.json(
      { error: `pack ${pack.id} not configured` },
      { status: 500 },
    )
  }

  const result = await createPayment(env, {
    productId,
    customer: {
      email: session.user.email,
      name: session.user.name,
    },
    billing: {
      // Dodo requires a billing country for tax. Use the request's CF country as a hint;
      // their hosted checkout lets the user correct it.
      country: cf?.country ?? "US",
    },
    returnUrl: `${env.BETTER_AUTH_URL}/dashboard/billing?status=success`,
    metadata: {
      user_id: session.user.id,
      pack_id: pack.id,
      credits: String(pack.credits),
    },
  })

  return NextResponse.json({
    paymentId: result.payment_id,
    checkoutUrl: result.payment_link,
  })
}
