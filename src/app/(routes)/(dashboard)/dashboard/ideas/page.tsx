import { DashboardPageHeader } from "../../_common/dashboard-page-header"
import { mainNav } from "../../_common/dashboard-nav"

const page = mainNav.find((item) => item.name === "Ideas")!

export default function IdeasPage() {
  return (
    <div>
      <DashboardPageHeader title={page.name} description={page.description} />
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Your post ideas will appear here.
      </div>
    </div>
  )
}
