import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { and, eq } from "drizzle-orm"
import Link from "next/link"
import { ArrowRight, Check, Mail, Sparkles } from "lucide-react"

import { accounts, getDb } from "@/db"
import { getAuth } from "@/lib/auth"
import { DashboardPageHeader } from "../../_common/dashboard-page-header"
import { mainNav } from "../../_common/dashboard-nav"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CONTACT_EMAIL } from "@/lib/constants/app"

export const dynamic = "force-dynamic"

const page = mainNav.find((item) => item.name === "Settings")!

export default async function SettingsPage() {
  const session = await getAuth().api.getSession({ headers: await headers() })
  if (!session) redirect("/sign-in")

  const db = getDb()
  const googleAccount = await db
    .select({ id: accounts.id, createdAt: accounts.createdAt })
    .from(accounts)
    .where(
      and(
        eq(accounts.userId, session.user.id),
        eq(accounts.providerId, "google"),
      ),
    )
    .get()

  const googleAccountConnected = !!googleAccount

  return (
    <div className="flex flex-col gap-6">
      <DashboardPageHeader title={page.name} description={page.description} />
      
      <div className="flex flex-col gap-6">
        <SettingSection
          title="Account"
          description="The identity you sign in with."
        >
          <Row label="Name" value={session.user.name} />
          <Row label="Email" value={session.user.email} />
          <Row label="Workspace ID" value={session.user.id} mono />
        </SettingSection>

        <SettingSection
          title="Connected providers"
          description="Sign-in methods linked to this account."
        >
          <div className="flex items-center justify-between gap-4 px-5 py-4 bg-card">
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-md border border-border bg-background">
                <GoogleMark />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium">Google</span>
                <span className="text-xs text-muted-foreground">
                  {session.user.email}
                </span>
              </div>
            </div>
            {googleAccountConnected ? (
              <Badge variant="secondary" className="gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Check className="size-3" />
                Connected
              </Badge>
            ) : (
              <Badge variant="outline">Not linked</Badge>
            )}
          </div>
        </SettingSection>

        <SettingSection
          title="Billing"
          description="Manage credits and payment history."
        >
          <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between bg-card">
            <div className="flex items-center gap-3">
              <Sparkles className="size-4 text-primary" />
              <span className="text-sm text-muted-foreground">
                Top up credits or change your plan.
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              render={<Link href="/dashboard/billing" />}
            >
              Open billing <ArrowRight className="size-3.5" />
            </Button>
          </div>
        </SettingSection>

        <SettingSection
          title="Support"
          description="Need help with your workspace?"
        >
          <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between bg-card">
            <div className="flex items-center gap-3">
              <Mail className="size-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                We usually reply within a business day.
              </span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              render={<a href={`mailto:${CONTACT_EMAIL}`} />}
            >
              {CONTACT_EMAIL}
            </Button>
          </div>
        </SettingSection>
      </div>
    </div>
  )
}

function SettingSection({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <header className="border-b border-border px-5 py-4 bg-muted/20">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </header>
      <div className="divide-y divide-border">{children}</div>
    </section>
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
    <div className="grid grid-cols-3 items-center gap-4 px-5 py-3.5 text-sm bg-card">
      <dt className="text-muted-foreground font-medium">{label}</dt>
      <dd
        className={`col-span-2 break-all text-foreground ${mono ? "font-mono text-xs bg-muted/30 px-1.5 py-0.5 rounded border border-border/40 w-fit" : ""}`}
      >
        {value}
      </dd>
    </div>
  )
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4.5" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.08-1.92 3.28-4.74 3.28-8.07z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1A6.7 6.7 0 0 1 5.5 12c0-.73.12-1.44.34-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.93l3.66-2.83z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.07.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  )
}
