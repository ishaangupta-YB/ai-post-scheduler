import {
  Calendar,
  CreditCard,
  Lightbulb,
  Blocks,
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
    name: "Integrations",
    href: `${DASHBOARD_BASE_PATH}/integrations`,
    icon: Blocks,
    description: "Connect your social media accounts.",
  },
  {
    name: "Schedule",
    href: `${DASHBOARD_BASE_PATH}/schedule`,
    icon: Calendar,
    description: "Plan and manage your upcoming social posts.",
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
