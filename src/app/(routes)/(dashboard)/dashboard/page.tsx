import { redirect } from "next/navigation"

import { defaultDashboardPath } from "../_common/dashboard-nav"

export default function DashboardPage() {
  redirect(defaultDashboardPath)
}
