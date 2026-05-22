import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { DashboardPageHeader } from "../../_common/dashboard-page-header"
import { mainNav } from "../../_common/dashboard-nav"
import { getAuth } from "@/lib/auth"
import { getCreditBalance } from "@/lib/billing/credits"
import { CREDIT_PACKS } from "@/lib/billing/packs"
import { BuyPackButton } from "./_components/buy-pack-button"

const page = mainNav.find((item) => item.name === "Billing")!

export default async function BillingPage() {
  const auth = getAuth()
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/sign-in")

  const balance = await getCreditBalance(session.user.id)

  return (
    <div className="flex flex-col gap-8">
      <DashboardPageHeader title={page.name} description={page.description} />

      <section className="rounded-lg border border-border bg-card p-6">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">Current balance</span>
          <span className="text-3xl font-semibold tracking-tight">
            {balance.toLocaleString()} credits
          </span>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Buy credits</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {CREDIT_PACKS.map((pack) => (
            <div
              key={pack.id}
              className="relative flex flex-col gap-3 rounded-lg border border-border bg-card p-5"
            >
              {pack.popular ? (
                <span className="absolute right-4 top-4 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                  Popular
                </span>
              ) : null}
              <div className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">
                  {pack.label}
                </span>
                <span className="text-2xl font-semibold tracking-tight">
                  {pack.credits.toLocaleString()} credits
                </span>
                <span className="text-xl">${pack.priceUsd}</span>
              </div>
              <p className="text-sm text-muted-foreground">{pack.description}</p>
              <BuyPackButton packId={pack.id} />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
