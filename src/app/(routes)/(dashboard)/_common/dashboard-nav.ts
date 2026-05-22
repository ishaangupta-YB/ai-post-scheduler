import {
  Calendar,
  CreditCard,
  Lightbulb,
  Settings,
  type LucideIcon,
} from "lucide-react"

export type DashboardNavItem = {
  name: string
  href: string
  icon: LucideIcon
  description: string
}

export const DASHBOARD_BASE_PATH = "/dashboard"

export const mainNav: DashboardNavItem[] = [
  {
    name: "Ideas",
    href: `${DASHBOARD_BASE_PATH}/ideas`,
    icon: Lightbulb,
    description: "Capture and refine post ideas before you schedule them.",
  },
  {
    name: "Schedule",
    href: `${DASHBOARD_BASE_PATH}/schedule`,
    icon: Calendar,
    description: "Plan and manage your upcoming social posts.",
  },
  {
    name: "Billing",
    href: `${DASHBOARD_BASE_PATH}/billing`,
    icon: CreditCard,
    description: "View your plan, invoices, and payment methods.",
  },
  {
    name: "Settings",
    href: `${DASHBOARD_BASE_PATH}/settings`,
    icon: Settings,
    description: "Configure accounts, preferences, and workspace defaults.",
  },
]

export const defaultDashboardPath = mainNav[0].href

export function isNavActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}
