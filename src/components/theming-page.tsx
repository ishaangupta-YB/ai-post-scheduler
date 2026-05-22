"use client"

import { useRouter } from "next/navigation"

import { DASHBOARD_BASE_PATH } from "@/app/(routes)/(dashboard)/_common/dashboard-nav"
import { Button } from "@/components/ui/button"

export function ThemingPage() {
  const router = useRouter()
  const handleClick = () => {
    router.push(DASHBOARD_BASE_PATH)
  }
  return (
     <Button variant="outline" onClick={handleClick}>Dashboard</Button>
  )
}
