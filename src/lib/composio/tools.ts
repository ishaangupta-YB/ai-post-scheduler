import { getComposio } from "./client"

export type ExecuteResult = {
  ok: boolean
  data?: unknown
  error?: string | null
  elapsedMs: number
  toolSlug: string
}

// Direct tool execution — no LLM, no agent framework. Wraps
// `composio.tools.execute()` and normalizes its response so the caller
// always gets the same shape whether the tool succeeded, failed, or threw.
//
// Caller is responsible for picking the right `toolSlug` (verify via
// `composio.tools.get()` or the CLI — do not invent slugs) and providing
// the matching `arguments` payload. `version` should be pinned in production
// for schema stability; if omitted, dangerouslySkipVersionCheck is set so
// dev-time iteration still works.
export async function executeIntegrationTool(args: {
  userId: string
  toolSlug: string
  arguments: Record<string, unknown>
  version?: string
}): Promise<ExecuteResult> {
  const composio = getComposio()
  const startedAt = Date.now()
  try {
    const result = await composio.tools.execute(args.toolSlug, {
      userId: args.userId,
      arguments: args.arguments,
      ...(args.version
        ? { version: args.version }
        : { dangerouslySkipVersionCheck: true }),
    })
    const elapsedMs = Date.now() - startedAt
    const r = result as { successful?: boolean; data?: unknown; error?: string | null }
    return {
      ok: r.successful !== false,
      data: r.data,
      error: r.error ?? null,
      elapsedMs,
      toolSlug: args.toolSlug,
    }
  } catch (err) {
    const elapsedMs = Date.now() - startedAt
    const message = err instanceof Error ? err.message : String(err)
    return {
      ok: false,
      error: message,
      elapsedMs,
      toolSlug: args.toolSlug,
    }
  }
}
