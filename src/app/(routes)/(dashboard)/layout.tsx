import { headers } from "next/headers"
import { redirect } from "next/navigation"

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { getAuth } from "@/lib/auth"

import AppSidebar from "./_common/app-sidebar"

export const dynamic = "force-dynamic"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const reqHeaders = await headers()
  const session = await getAuth().api.getSession({ headers: reqHeaders })
  if (!session) redirect("/sign-in")

  return (
    <SidebarProvider>
      <AppSidebar user={session.user} />
      <SidebarInset className="bg-sidebar! border-none">
        <header className="flex h-12 shrink-0 items-center gap-2 px-2">
          <SidebarTrigger className="-ml-1" />
        </header>
        <div
          className="m-1 min-h-[calc(100svh-3rem)] rounded-lg border border-border
             px-4 shadow-xs bg-background dark:border-[#e0e1e11a]
            "
        >
          <div className="py-2 px-3">{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
