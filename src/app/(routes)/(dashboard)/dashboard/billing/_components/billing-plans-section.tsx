"use client"

import { useState } from "react"
import { Check, Coins, Sparkles, Zap } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  PLANS,
  getAnnualSavingsPercent,
  getPlanPricing,
  type Plan,
} from "@/lib/billing/packs"

import { SubscribeButton } from "./buy-pack-button"

type BillingCycle = "monthly" | "annual"

const PLAN_ACCENT: Record<
  string,
  { gradient: string; iconBg: string; Icon: typeof Coins }
> = {
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

export function BillingPlansSection({
  currentPlanId,
  currentBillingCycle,
  planStatus,
}: {
  currentPlanId: string | null
  currentBillingCycle: BillingCycle | null
  planStatus: string | null
}) {
  const initialCycle: BillingCycle = currentBillingCycle ?? "monthly"
  const [cycle, setCycle] = useState<BillingCycle>(initialCycle)
  // Marketing badge: use the largest savings across plans (all 3 currently share the same %).
  const maxSavings = Math.max(...PLANS.map(getAnnualSavingsPercent))

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold tracking-tight">
            Subscription plans
          </h2>
          <p className="text-sm text-muted-foreground">
            Monthly credits reset every 30 days — pick the size that fits your
            output. Annual saves you {maxSavings}%.
          </p>
        </div>
        <CycleToggle
          cycle={cycle}
          onChange={setCycle}
          annualSavingsPercent={maxSavings}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {PLANS.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            cycle={cycle}
            currentPlanId={currentPlanId}
            currentBillingCycle={currentBillingCycle}
            planStatus={planStatus}
          />
        ))}
      </div>
    </section>
  )
}

function CycleToggle({
  cycle,
  onChange,
  annualSavingsPercent,
}: {
  cycle: BillingCycle
  onChange: (next: BillingCycle) => void
  annualSavingsPercent: number
}) {
  return (
    <div
      className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1"
      role="group"
      aria-label="Billing cycle"
    >
      <button
        type="button"
        onClick={() => onChange("monthly")}
        className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
          cycle === "monthly"
            ? "bg-primary text-primary-foreground shadow-xs"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Monthly
      </button>
      <button
        type="button"
        onClick={() => onChange("annual")}
        className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
          cycle === "annual"
            ? "bg-primary text-primary-foreground shadow-xs"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Annual
        <span
          className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
            cycle === "annual"
              ? "bg-primary-foreground/20 text-primary-foreground"
              : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
          }`}
        >
          Save {annualSavingsPercent}%
        </span>
      </button>
    </div>
  )
}

function PlanCard({
  plan,
  cycle,
  currentPlanId,
  currentBillingCycle,
  planStatus,
}: {
  plan: Plan
  cycle: BillingCycle
  currentPlanId: string | null
  currentBillingCycle: BillingCycle | null
  planStatus: string | null
}) {
  const accent = PLAN_ACCENT[plan.id] ?? PLAN_ACCENT.starter
  const Icon = accent.Icon
  const isCurrent =
    currentPlanId === plan.id && currentBillingCycle === cycle
  const pricing = getPlanPricing(plan, cycle)

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
          <div
            className={`grid size-10 place-items-center rounded-lg ${accent.iconBg}`}
          >
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

        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-semibold tracking-tight">
              ${pricing.effectiveMonthlyUsd}
            </span>
            <span className="text-sm text-muted-foreground">/ month</span>
          </div>
          {cycle === "annual" ? (
            <span className="text-xs text-muted-foreground">
              ${pricing.billedAmountUsd} billed yearly
            </span>
          ) : null}
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
            billingCycle={cycle}
            currentPlanId={currentPlanId}
            currentBillingCycle={currentBillingCycle}
            planStatus={planStatus}
          />
        </div>
      </div>
    </article>
  )
}
