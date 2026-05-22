import { DashboardPageHeader } from "../../_common/dashboard-page-header"
import { mainNav } from "../../_common/dashboard-nav"

const page = mainNav.find((item) => item.name === "Schedule")!

export default function SchedulePage() {
  return (
    <div>
      <DashboardPageHeader title={page.name} description={page.description} />
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Your content calendar will appear here.
      </div>
    </div>
  )
}
