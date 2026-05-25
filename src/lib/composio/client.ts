import { Composio } from "@composio/core"
import { getCloudflareContext } from "@opennextjs/cloudflare"

let cached: Composio | null = null

export class ComposioNotConfiguredError extends Error {
  missingKeys: string[]
  constructor(missingKeys: string[]) {
    super(
      `Composio is not configured. Missing env vars: ${missingKeys.join(", ")}`,
    )
    this.name = "ComposioNotConfiguredError"
    this.missingKeys = missingKeys
  }
}

// Workers runtime has no process.env. We pass apiKey explicitly from
// getCloudflareContext().env so this works in both dev (wrangler) and prod.
export function getComposio(): Composio {
  if (cached) return cached
  const { env } = getCloudflareContext()
  const apiKey = (env as unknown as Record<string, string | undefined>)
    .COMPOSIO_API_KEY
  if (!apiKey) throw new ComposioNotConfiguredError(["COMPOSIO_API_KEY"])
  cached = new Composio({ apiKey })
  return cached
}
