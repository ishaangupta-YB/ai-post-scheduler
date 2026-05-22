import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { Coins, RefreshCw } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { getAuth } from "@/lib/auth"
import { getCreditState } from "@/lib/billing/credits"
import {
  FREE_TIER_MONTHLY_CREDITS,
  TOPUP_PACKS,
  getPlan,
  type TopupPack,
} from "@/lib/billing/packs"

import { DashboardPageHeader } from "../../_common/dashboard-page-header"
import { mainNav } from "../../_common/dashboard-nav"
import { BuyTopupButton } from "./_components/buy-pack-button"
import { BillingPlansSection } from "./_components/billing-plans-section"

export const dynamic = "force-dynamic"

const page = mainNav.find((item) => item.name === "Billing")!

function formatDate(d: Date | null | undefined) {
  if (!d) return "—"
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export default async function BillingPage() {
  const session = await getAuth().api.getSession({ headers: await headers() })
  if (!session) redirect("/sign-in")

  const state = await getCreditState(session.user.id)
  const currentPlan = getPlan(state.planId)
  const monthlyCap = currentPlan?.monthlyCredits ?? FREE_TIER_MONTHLY_CREDITS
  const monthlyPct = Math.min(
    100,
    Math.round((state.monthly / Math.max(1, monthlyCap)) * 100),
  )

  return (
    <div className="flex flex-col gap-10">
      <DashboardPageHeader title={page.name} description={page.description} />

      {/* Current plan / balance summary */}
      <section className="relative overflow-hidden rounded-xl border border-border bg-card">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
        <div className="relative grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.4fr_1fr]">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Current plan
              </span>
              <Badge
                variant={state.planStatus === "active" ? "default" : "secondary"}
                className="gap-1"
              >
                {currentPlan ? currentPlan.label : "Free"}
                {state.planBillingCycle ? ` · ${state.planBillingCycle}` : ""}
                {state.planStatus ? ` · ${state.planStatus}` : ""}
              </Badge>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-semibold tracking-tight">
                {state.total.toLocaleString()}
              </span>
              <span className="text-sm text-muted-foreground">
                total credits
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <RefreshCw className="size-3" /> Monthly pool
                </span>
                <span>
                  {state.monthly.toLocaleString()} / {monthlyCap.toLocaleString()}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${monthlyPct}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Resets on {formatDate(state.planPeriodEnd)} — unused monthly credits do not roll over.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Coins className="size-3" /> Top-up pool
                </span>
                <span>{state.topup.toLocaleString()} credits</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Top-up credits never expire.
              </p>
            </div>
          </div>

          <div className="grid size-16 place-items-center self-start rounded-xl bg-primary/10 text-primary lg:size-20">
            <Coins className="size-7 lg:size-9" />
          </div>
        </div>
      </section>

      {/* Subscription plans + monthly/annual toggle */}
      <BillingPlansSection
        currentPlanId={state.planId}
        currentBillingCycle={state.planBillingCycle}
        planStatus={state.planStatus}
      />

      {/* Top-ups */}
      <section className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold tracking-tight">
            Need more credits this month?
          </h2>
          <p className="text-sm text-muted-foreground">
            One-time top-ups. Never expire — accumulate alongside your monthly allotment.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {TOPUP_PACKS.map((pack) => (
            <TopupCard key={pack.id} pack={pack} />
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-dashed border-border bg-muted/30 p-5">
        <p className="text-sm text-muted-foreground">
          Payments are processed securely by{" "}
          <span className="font-medium text-foreground">Dodo Payments</span>.
          Cancel anytime — you keep credits until the end of the current period.
        </p>
      </section>
    </div>
  )
}

function TopupCard({ pack }: { pack: TopupPack }) {
  return (
    <article className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <Coins className="size-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium">{pack.label}</span>
          <span className="text-xs text-muted-foreground">Never expires</span>
        </div>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-semibold tracking-tight">
          ${pack.priceUsd}
        </span>
        <span className="text-xs text-muted-foreground">one-time</span>
      </div>
      <p className="text-sm text-muted-foreground">{pack.description}</p>
      <div className="mt-auto">
        <BuyTopupButton packId={pack.id} />
      </div>
    </article>
  )
}
