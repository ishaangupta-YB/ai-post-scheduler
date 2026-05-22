import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { eq } from "drizzle-orm"
import {
  CalendarDays,
  Coins,
  Mail,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { getDb, users } from "@/db"
import { getAuth } from "@/lib/auth"
import { getCreditState } from "@/lib/billing/credits"
import { FREE_TIER_MONTHLY_CREDITS, getPlan } from "@/lib/billing/packs"

import { DashboardPageHeader } from "../../_common/dashboard-page-header"

export const dynamic = "force-dynamic"

function formatDate(d: Date | null | undefined) {
  if (!d) return "—"
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

function initialsFrom(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export default async function ProfilePage() {
  const session = await getAuth().api.getSession({ headers: await headers() })
  if (!session) redirect("/sign-in")

  const db = getDb()
  const dbUser = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      emailVerified: users.emailVerified,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .get()

  const state = await getCreditState(session.user.id)
  const currentPlan = getPlan(state.planId)
  const monthlyCap = currentPlan?.monthlyCredits ?? FREE_TIER_MONTHLY_CREDITS
  const monthlyPct = Math.min(
    100,
    Math.round((state.monthly / Math.max(1, monthlyCap)) * 100),
  )

  const user = dbUser ?? {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
    emailVerified: session.user.emailVerified ?? false,
    createdAt: null as Date | null,
    updatedAt: null as Date | null,
  }

  return (
    <div className="flex flex-col gap-8">
      <DashboardPageHeader
        title="Profile"
        description="Your account details and workspace summary."
      />

      <section className="relative overflow-hidden rounded-xl border border-border bg-card">
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent" />
        <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:gap-8 sm:p-8">
          <Avatar className="size-24 ring-4 ring-card sm:size-28">
            {user.image ? (
              <AvatarImage src={user.image} alt={user.name} />
            ) : null}
            <AvatarFallback className="text-2xl">
              {initialsFrom(user.name) || "?"}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-semibold tracking-tight">
                {user.name}
              </h2>
              {user.emailVerified ? (
                <Badge variant="secondary" className="gap-1">
                  <ShieldCheck className="size-3" />
                  Verified
                </Badge>
              ) : null}
              <Badge variant="outline" className="gap-1">
                {currentPlan ? currentPlan.label : "Free"}
                {state.planStatus ? ` · ${state.planStatus}` : ""}
              </Badge>
            </div>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="size-4" />
              {user.email}
            </p>
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarDays className="size-3.5" />
              Member since {formatDate(user.createdAt)}
            </p>
          </div>
        </div>
      </section>

      {/* Two-pool credit summary */}
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <RefreshCw className="size-3.5" />
            Monthly pool
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-semibold tracking-tight">
              {state.monthly.toLocaleString()}
            </span>
            <span className="text-sm text-muted-foreground">
              / {monthlyCap.toLocaleString()}
            </span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${monthlyPct}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Resets on {formatDate(state.planPeriodEnd)}. Unused credits do not roll over.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Coins className="size-3.5" />
            Top-up pool
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-semibold tracking-tight">
              {state.topup.toLocaleString()}
            </span>
            <span className="text-sm text-muted-foreground">credits</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Never expires. Spent only after monthly pool is empty.
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <Sparkles className="size-3.5" />
          Total available
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-semibold tracking-tight">
            {state.total.toLocaleString()}
          </span>
          <span className="text-sm text-muted-foreground">credits</span>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card">
        <header className="border-b border-border px-5 py-4">
          <h3 className="text-sm font-semibold">Account details</h3>
        </header>
        <dl className="divide-y divide-border">
          <Row label="User ID" value={user.id} mono />
          <Row label="Email" value={user.email} />
          <Row
            label="Email verified"
            value={user.emailVerified ? "Yes" : "No"}
          />
          <Row label="Plan" value={currentPlan?.label ?? "Free"} />
          <Row label="Plan status" value={state.planStatus ?? "—"} />
          <Row label="Period ends" value={formatDate(state.planPeriodEnd)} />
          <Row label="Joined" value={formatDate(user.createdAt)} />
        </dl>
      </section>
    </div>
  )
}

function Row({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="grid grid-cols-3 items-center gap-4 px-5 py-3 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={`col-span-2 break-all ${mono ? "font-mono text-xs" : ""}`}
      >
        {value}
      </dd>
    </div>
  )
}
