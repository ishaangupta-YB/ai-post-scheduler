"use client"

import { useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"

import {
  INTEGRATION_TYPE_LABELS,
  IntegrationTypeEnum,
} from "@/lib/constants/integrations"

const ERROR_MESSAGES: Record<string, string> = {
  // Legacy hand-rolled OAuth codes (still possible if old links arrive).
  missing_state: "Authorization state was missing — please try again.",
  invalid_state: "Authorization state was invalid or expired.",
  missing_code: "Provider did not return an authorization code.",
  missing_pkce: "Authorization session expired before we could finish.",
  unauthorized: "Your session expired during connection.",
  callback_failed: "Could not complete the connection. Please try again.",
  access_denied: "Connection was cancelled.",
  // Composio-era codes.
  invalid_platform: "Unknown platform in callback URL.",
  not_configured:
    "This integration isn't configured yet. Set the Composio auth-config env var.",
  composio_failed: "Composio could not complete the connection.",
  platform_disabled: "This integration is coming soon.",
  missing_connected_account_id:
    "Composio didn't return a connected-account id.",
  failed: "Composio reported the connection failed.",
}

export function CallbackToastBanner() {
  const params = useSearchParams()
  const router = useRouter()
  const fired = useRef(false)

  useEffect(() => {
    if (fired.current) return
    const connected = params.get("connected")
    if (connected === null) return
    fired.current = true

    if (connected === "true") {
      const platform = params.get("platform") ?? ""
      const label =
        INTEGRATION_TYPE_LABELS[platform as IntegrationTypeEnum] ?? "the platform"
      toast.success(`Connected to ${label}`, {
        description: "We've saved your account. You can now schedule posts to it.",
      })
    } else {
      const reason = params.get("error") ?? "callback_failed"
      const details = params.get("details")
      const base = ERROR_MESSAGES[reason] ?? reason
      toast.error("Could not connect", {
        description: details ? `${base} (${details})` : base,
      })
    }

    router.replace("/dashboard/integrations")
  }, [params, router])

  return null
}
