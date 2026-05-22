import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { Check, Coins, RefreshCw, Sparkles, Zap } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { getAuth } from "@/lib/auth"
import { getCreditState } from "@/lib/billing/credits"
import {
  FREE_TIER_MONTHLY_CREDITS,
  PLANS,
  TOPUP_PACKS,
  getPlan,
  type Plan,
  type TopupPack,
} from "@/lib/billing/packs"

import { DashboardPageHeader } from "../../_common/dashboard-page-header"
import { mainNav } from "../../_common/dashboard-nav"
import { BuyTopupButton, SubscribeButton } from "./_components/buy-pack-button"

export const dynamic = "force-dynamic"

const page = mainNav.find((item) => item.name === "Billing")!

const PLAN_ACCENT: Record<string, { gradient: string; iconBg: string; Icon: typeof Coins }> = {
  starter: {
    gradient: "from-sky-500/15 via-sky-500/5 to-transparent",
    iconBg: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    Icon: Coins,
  },
  creator: {
    gradient: "from-primary/25 via-primary/10 to-transparent",
    iconBg: "bg-primary/15 text-primary",
    Icon: Sparkles,
  },
  pro: {
    gradient: "from-amber-500/15 via-amber-500/5 to-transparent",
    iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    Icon: Zap,
  },
}

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

      {/* Subscription plans */}
      <section className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold tracking-tight">
            Subscription plans
          </h2>
          <p className="text-sm text-muted-foreground">
            Monthly credits reset on each renewal — pick the size that fits your output.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              currentPlanId={state.planId}
              planStatus={state.planStatus}
            />
          ))}
        </div>
      </section>

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

function PlanCard({
  plan,
  currentPlanId,
  planStatus,
}: {
  plan: Plan
  currentPlanId: string | null
  planStatus: string | null
}) {
  const accent = PLAN_ACCENT[plan.id] ?? PLAN_ACCENT.starter
  const Icon = accent.Icon
  const isCurrent = currentPlanId === plan.id

  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-xl border bg-card p-6 transition-all hover:-translate-y-0.5 hover:shadow-lg ${
        plan.popular
          ? "border-primary/40 ring-1 ring-primary/30"
          : "border-border"
      } ${isCurrent ? "ring-2 ring-primary" : ""}`}
    >
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b ${accent.gradient}`}
      />

      {plan.popular && !isCurrent ? (
        <Badge className="absolute right-4 top-4 gap-1">
          <Sparkles className="size-3" />
          Popular
        </Badge>
      ) : null}

      {isCurrent ? (
        <Badge variant="secondary" className="absolute right-4 top-4 gap-1">
          <Check className="size-3" />
          Current
        </Badge>
      ) : null}

      <div className="relative flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <div className={`grid size-10 place-items-center rounded-lg ${accent.iconBg}`}>
            <Icon className="size-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-muted-foreground">
              {plan.label}
            </span>
            <span className="text-xs text-muted-foreground/70">
              {plan.monthlyCredits.toLocaleString()} credits / month
            </span>
          </div>
        </div>

        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-semibold tracking-tight">
            ${plan.priceUsd}
          </span>
          <span className="text-sm text-muted-foreground">/ month</span>
        </div>

        <p className="text-sm text-muted-foreground">{plan.description}</p>

        <ul className="flex flex-col gap-2.5">
          {plan.features.map((feature) => (
            <li
              key={feature}
              className="flex items-start gap-2 text-sm text-foreground/90"
            >
              <Check className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <div className="mt-2">
          <SubscribeButton
            planId={plan.id}
            currentPlanId={currentPlanId}
            planStatus={planStatus}
          />
        </div>
      </div>
    </article>
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
