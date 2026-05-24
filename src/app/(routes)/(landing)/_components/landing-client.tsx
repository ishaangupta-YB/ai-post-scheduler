"use client"

import { useState, useEffect, useRef } from "react"
import {
  Sparkles,
  ArrowRight,
  Calendar,
  BarChart3,
  Brain,
  Inbox,
  Settings,
  Check,
  MessageSquare,
  Send,
  Zap,
  Leaf,
  Sun,
  Moon
} from "lucide-react"

import { toast } from "sonner"
import { authClient } from "@/lib/auth-client"
import { useTheme } from "next-themes"
import { INTEGRATIONS, IntegrationTypeEnum } from "@/lib/constants/integrations"
import { APP_NAME } from "@/lib/constants/app"
import { PLANS, getAnnualSavingsPercent } from "@/lib/billing/packs"

// ───────── Google Sign In Helper ─────────
async function triggerGoogleSignIn() {
  const { error } = await authClient.signIn.social({
    provider: "google",
    callbackURL: "/dashboard/ideas",
    errorCallbackURL: "/sign-in?error=oauth",
  })
  if (error) {
    toast.error(error.message ?? "Sign in failed. Please try again.")
  }
}



// ───────── N5 Floating Nav Pill ─────────
export function LandingHeader() {
  const [isPending, setIsPending] = useState(false)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  async function handleLogin() {
    setIsPending(true)
    await triggerGoogleSignIn()
    setIsPending(false)
  }

  return (
    <nav className="nav-pill" aria-label="Primary">
      <a href="#" className="nav-pill__brand" aria-label={`${APP_NAME} home`}>
        <div className="flex aspect-square size-6 items-center justify-center rounded-md bg-warning text-warning-foreground shadow-xs">
          <Leaf className="size-3.5 fill-current" />
        </div>
        <span>{APP_NAME}</span>
      </a>
      <div className="nav-pill__links">
        <a className="nav-pill__link" href="#product">Product</a>
        <a className="nav-pill__link" href="#features">Features</a>
        <a className="nav-pill__link" href="#pricing">Pricing</a>
      </div>
      <div className="flex items-center gap-2">
        {mounted && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="size-8 rounded-full flex items-center justify-center text-foreground hover:bg-muted transition-colors cursor-pointer border border-border/40"
            type="button"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
        )}
        <button
          onClick={handleLogin}
          disabled={isPending}
          className="nav-pill__cta"
          type="button"
        >
          {isPending ? "Redirecting…" : "Start Free →"}
        </button>
      </div>
    </nav>
  )
}

// ───────── Live Status Counter ─────────
export function LiveTicker() {
  const [count, setCount] = useState(12847)

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduceMotion) return

    const interval = setInterval(() => {
      setCount((prev) => {
        const jitter = Math.round((Math.random() - 0.45) * 6)
        return prev + jitter
      })
    }, 1200)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="lp-hero__live" role="status" aria-live="polite">
      <span className="dot" aria-hidden="true"></span>
      <span>LIVE · SCHEDULING <strong className="font-mono">{count.toLocaleString()}</strong> POSTS TODAY</span>
    </div>
  )
}

// ───────── Live Social Post Draft Card (Tier-A Art) ─────────
const ANIMATION_STEPS = [
  {
    prompt: "Write a thread about why databases need connection pooling...",
    draft: "1/ Why do databases choke under sudden traffic spikes? Usually, it's not the queries—it's connection overhead. \n\nEvery time a client connects, the DB forks a process. This consumes memory and CPU before the query even starts.",
    integrations: [IntegrationTypeEnum.TWITTER]
  },
  {
    prompt: `Draft a LinkedIn announcement for ${APP_NAME} launch...`,
    draft: `Staring at a blank screen on Sunday night is the worst way to do social media. \n\nToday, we're launching ${APP_NAME}. Capture ideas in a click, let AI draft in your exact tone, and queue multi-channel on autopilot.`,
    integrations: [IntegrationTypeEnum.LINKEDIN]
  },
  {
    prompt: "Create a short tweet about Tailwind CSS v4 speed...",
    draft: "Tailwind v4 is an absolute rocket. Rust-powered engine compiling 10x faster, zero-config setup, native cascade layers. \n\nOur bundle sizes dropped by 18% with zero code changes. Huge win.",
    integrations: [IntegrationTypeEnum.TWITTER, IntegrationTypeEnum.LINKEDIN]
  }
]

export function LivePostDraftCard() {
  const [stepIndex, setStepIndex] = useState(0)
  const [promptText, setPromptText] = useState("")
  const [draftText, setDraftText] = useState("")
  const [phase, setPhase] = useState<"typing-prompt" | "generating" | "completed">("typing-prompt")

  const currentStep = ANIMATION_STEPS[stepIndex]

  useEffect(() => {
    let active = true
    let timer: NodeJS.Timeout

    async function runLoop() {
      if (!active) return

      // Step 1: Type the prompt
      setPhase("typing-prompt")
      setPromptText("")
      setDraftText("")
      
      const prompt = currentStep.prompt
      for (let i = 0; i <= prompt.length; i++) {
        if (!active) return
        setPromptText(prompt.substring(0, i))
        await new Promise((resolve) => setTimeout(resolve, 35))
      }

      await new Promise((resolve) => setTimeout(resolve, 800))
      if (!active) return

      // Step 2: Show generating state
      setPhase("generating")
      await new Promise((resolve) => setTimeout(resolve, 1500))
      if (!active) return

      // Step 3: Show draft rendering
      setPhase("completed")
      const draft = currentStep.draft
      // Split draft by word or chunk to simulate typing
      const words = draft.split(" ")
      for (let i = 0; i <= words.length; i++) {
        if (!active) return
        setDraftText(words.slice(0, i).join(" "))
        await new Promise((resolve) => setTimeout(resolve, 20))
      }

      // Keep showing completed draft for 4 seconds, then go next
      await new Promise((resolve) => setTimeout(resolve, 4500))
      if (!active) return

      setStepIndex((prev) => (prev + 1) % ANIMATION_STEPS.length)
      runLoop()
    }

    runLoop()

    return () => {
      active = false
    }
  }, [stepIndex])

  return (
    <aside className="live-post-card" aria-label="Live AI draft preview">
      <div className="live-post-card__head">
        <div className="flex items-center gap-1.5">
          <Brain className="size-3.5 text-primary" />
          <span className="live-post-card__title">AI Post Composer</span>
        </div>
        <span className={`live-post-card__tag ${phase === "completed" ? "" : "opacity-50"}`}>
          {phase === "typing-prompt" && "typing prompt..."}
          {phase === "generating" && "AI drafting..."}
          {phase === "completed" && "draft ready"}
        </span>
      </div>

      <div className="live-post-card__content">
        <div className="live-post-card__prompt font-mono text-xs">
          <span className="text-primary/70">prompt &gt;</span> {promptText}
          {phase === "typing-prompt" && <span className="live-post-card__cursor" />}
        </div>

        <div className="live-post-card__draft text-xs">
          {phase === "generating" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-card/60 backdrop-blur-[1px]">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="font-mono text-[10px] text-muted-foreground">learning your tone...</span>
            </div>
          )}
          
          <div className="whitespace-pre-wrap leading-relaxed text-foreground/90">
            {draftText}
            {phase === "completed" && draftText.length < currentStep.draft.length && (
              <span className="live-post-card__cursor" />
            )}
          </div>

          {phase === "completed" && draftText.length === currentStep.draft.length && (
            <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-2 font-mono text-[9px] text-muted-foreground">
              <span>Status: <span className="text-emerald-500 font-semibold">Ready to Schedule</span></span>
              <span>Tone Match: 98%</span>
            </div>
          )}
        </div>

        <div className="live-post-card__integrations">
          <span className="text-muted-foreground/60 mr-1">integrations:</span>
          {INTEGRATIONS.filter(c => c.type === IntegrationTypeEnum.TWITTER || c.type === IntegrationTypeEnum.LINKEDIN).map((integration) => {
            const isActive = currentStep.integrations.includes(integration.type)
            return (
              <span
                key={integration.type}
                className={`live-post-card__integration flex items-center gap-1 ${isActive ? "active" : ""}`}
              >
                <integration.icon className="size-3" />
                {integration.label}
              </span>
            )
          })}
        </div>
      </div>
    </aside>
  )
}

// ───────── Workbench Console Mockup ─────────
export function WorkbenchConsole() {
  const [activeTab, setActiveTab] = useState<"queue" | "ideas" | "analytics">("queue")
  const [stats, setStats] = useState({ queue: 14, reach: 98.4 })
  const twitter = INTEGRATIONS.find(c => c.type === IntegrationTypeEnum.TWITTER)
  const linkedin = INTEGRATIONS.find(c => c.type === IntegrationTypeEnum.LINKEDIN)

  useEffect(() => {
    const interval = setInterval(() => {
      setStats((prev) => {
        const queueChange = Math.random() > 0.7 ? (Math.random() > 0.5 ? 1 : -1) : 0
        const reachChange = (Math.random() - 0.48) * 0.3
        return {
          queue: Math.max(8, prev.queue + queueChange),
          reach: parseFloat((prev.reach + reachChange).toFixed(1))
        }
      })
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="lp-bench" id="product">
      {/* Sidebar Rail */}
      <div className="lp-bench__rail">
        <div className="lp-bench__brand text-foreground">
          <div className="flex aspect-square size-6 items-center justify-center rounded-md bg-warning text-warning-foreground shadow-xs">
            <Leaf className="size-3.5 fill-current" />
          </div>
          <span>{APP_NAME}</span>
        </div>
        <div className="lp-bench__nav">
          <button
            onClick={() => setActiveTab("queue")}
            className={`lp-bench__navitem ${activeTab === "queue" ? "active" : ""}`}
            type="button"
          >
            <Inbox className="size-4" />
            Queue
          </button>
          <button
            onClick={() => setActiveTab("ideas")}
            className={`lp-bench__navitem ${activeTab === "ideas" ? "active" : ""}`}
            type="button"
          >
            <Brain className="size-4" />
            AI Drafts
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`lp-bench__navitem ${activeTab === "analytics" ? "active" : ""}`}
            type="button"
          >
            <BarChart3 className="size-4" />
            Analytics
          </button>
        </div>
      </div>

      {/* Main Console Area */}
      <div className="lp-bench__main">
        {/* Stat Row */}
        <div className="lp-bench__statrow">
          <div className="lp-bench__stat">
            <div className="label">Scheduled Queue</div>
            <div className="value">
              <span>{stats.queue} posts</span>
              <span className="delta font-mono text-xs">+2 today</span>
            </div>
          </div>
          <div className="lp-bench__stat">
            <div className="label">Estimated Reach</div>
            <div className="value">
              <span>{stats.reach}K</span>
              <span className="delta font-mono text-xs">+12.4%</span>
            </div>
          </div>
          <div className="lp-bench__stat">
            <div className="label">Active Integrations</div>
            <div className="value">
              <span>2/4 connected</span>
            </div>
          </div>
        </div>

        {/* Console Preview Area based on Active Tab */}
        <div className="lp-bench__chart">
          {activeTab === "queue" && (
            <div className="flex flex-col gap-3">
              <h4 className="border-b border-border/40 pb-2">Upcoming Schedule <span className="live">auto-queue active</span></h4>
              
              <div className="flex items-center justify-between rounded-md border border-border/50 bg-background/50 p-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-1.5 text-primary">
                    {twitter && <twitter.icon className="size-3.5" />}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Why we built an offline-first social scheduler...</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Thread · 4 tweets</p>
                  </div>
                </div>
                <span className="font-mono text-[10px] text-primary bg-primary-foreground/20 px-2 py-0.5 rounded-full">Today, 4:00 PM</span>
              </div>

              <div className="flex items-center justify-between rounded-md border border-border/50 bg-background/50 p-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-1.5 text-primary">
                    {linkedin && <linkedin.icon className="size-3.5" />}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">We just hit 1,000 beta signups. Lessons learned:</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">LinkedIn Post</p>
                  </div>
                </div>
                <span className="font-mono text-[10px] text-muted-foreground border border-border/60 px-2 py-0.5 rounded-full">Tomorrow, 10:30 AM</span>
              </div>

              <div className="flex items-center justify-between rounded-md border border-border/50 bg-background/50 p-3 text-xs opacity-75">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-1.5 text-primary">
                    {twitter && <twitter.icon className="size-3.5" />}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">5 micro-animations that make websites feel premium...</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Single Tweet</p>
                  </div>
                </div>
                <span className="font-mono text-[10px] text-muted-foreground border border-border/60 px-2 py-0.5 rounded-full">May 24, 2:00 PM</span>
              </div>
            </div>
          )}

          {activeTab === "ideas" && (
            <div className="flex flex-col gap-3">
              <h4 className="border-b border-border/40 pb-2">AI Draft Inbox <span className="live">3 ideas waiting</span></h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="rounded-md border border-border/50 bg-background/50 p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Raw Idea</span>
                    <span className="font-mono text-[9px] text-emerald-500 font-semibold">94% Draft Match</span>
                  </div>
                  <p className="italic text-muted-foreground">"Explain our new pricing strategy and transparency"</p>
                  <div className="border-t border-border/30 pt-2 text-[11px] text-foreground/90">
                    "We're shifting to open billing. No event limits, just flat pricing. Here's exactly why..."
                  </div>
                </div>

                <div className="rounded-md border border-border/50 bg-background/50 p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Raw Idea</span>
                    <span className="font-mono text-[9px] text-emerald-500 font-semibold">89% Draft Match</span>
                  </div>
                  <p className="italic text-muted-foreground">"Weekly tip about CSS variables vs Tailwind v4"</p>
                  <div className="border-t border-border/30 pt-2 text-[11px] text-foreground/90">
                    "Tailwind v4 makes CSS custom properties compile dynamically under `@theme`. Here is..."
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "analytics" && (
            <div>
              <h4>Simulated Reach · Last 30 Days <span className="live">live</span></h4>
              <svg viewBox="0 0 600 160" preserveAspectRatio="none" className="mt-2" aria-hidden="true">
                <defs>
                  <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25"/>
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity="0"/>
                  </linearGradient>
                </defs>
                <g className="grid">
                  <line x1="0" y1="30"  x2="600" y2="30" />
                  <line x1="0" y1="70"  x2="600" y2="70" />
                  <line x1="0" y1="110" x2="600" y2="110" />
                </g>
                <path className="area"
                  d="M0,120 L40,115 L80,105 L120,111 L160,96 L200,100 L240,82 L280,88 L320,72 L360,61 L400,68 L440,51 L480,57 L520,39 L560,33 L600,22 L600,160 L0,160 Z"/>
                <path className="line"
                  d="M0,120 L40,115 L80,105 L120,111 L160,96 L200,100 L240,82 L280,88 L320,72 L360,61 L400,68 L440,51 L480,57 L520,39 L560,33 L600,22"/>
                <circle className="dot" cx="600" cy="22" r="5" />
              </svg>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ───────── Pricing Toggler and Cards ─────────
export function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(false)
  const [isPending, setIsPending] = useState(false)

  // Use the largest savings across plans for the toggle badge (all 3 use the same %, but stay future-proof).
  const maxSavings = Math.max(...PLANS.map(getAnnualSavingsPercent))

  async function handleAction() {
    setIsPending(true)
    await triggerGoogleSignIn()
    setIsPending(false)
  }

  return (
    <section className="lp-pricing" id="pricing">
      <div className="lp-container">
        <div className="lp-pricing__head">
          <span className="lp-eyebrow">◇ pricing</span>
          <h2 className="lp-section-head__title" style={{ textAlign: "center", marginInline: "auto" }}>
            Plans that scale with your growth, <span className="lp-italic-accent">not</span> against it.
          </h2>
          <div className="lp-pricing__toggle" role="group" aria-label="Billing period">
            <button
              type="button"
              className={!isAnnual ? "active" : ""}
              onClick={() => setIsAnnual(false)}
            >
              Monthly
            </button>
            <button
              type="button"
              className={isAnnual ? "active" : ""}
              onClick={() => setIsAnnual(true)}
            >
              Annual <span className="save">save {maxSavings}%</span>
            </button>
          </div>
        </div>

        <div className="lp-pricing__grid">
          {PLANS.map((plan) => {
            const displayedMonthly = isAnnual
              ? Math.round((plan.annualPriceUsd / 12) * 100) / 100
              : plan.monthlyPriceUsd
            const isFeatured = plan.popular

            return (
              <article key={plan.id} className={`lp-tier ${isFeatured ? "lp-tier--featured" : ""}`}>
                {isFeatured && <span className="lp-tier__badge">Most creators choose this</span>}
                <div className="lp-tier__name">{plan.label}</div>
                <div className="lp-tier__price">
                  <span>${displayedMonthly}</span>
                  <small>/ mo</small>
                </div>
                <p className="lp-tier__desc">{plan.description}</p>
                <ul className="lp-tier__features">
                  {plan.features.map((feature, idx) => (
                    <li key={idx}>{feature}</li>
                  ))}
                </ul>
                <button
                  onClick={handleAction}
                  disabled={isPending}
                  className={`lp-btn ${isFeatured ? "lp-btn--primary" : "lp-btn--ghost"} mt-auto`}
                  type="button"
                >
                  {plan.id === "starter" ? "Start Free" : isFeatured ? "Start 14-Day Free Trial" : "Get Started"}
                </button>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ───────── Hover-Tilt Cards Wrapper ─────────
export function TiltCard({ children, className = "" }: { children: React.ReactNode, className?: string }) {
  const cardRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current
    if (!card) return

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduceMotion) return

    const rect = card.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5

    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      card.style.transform = `perspective(900px) rotateX(${(-y * 4).toFixed(2)}deg) rotateY(${(x * 5).toFixed(2)}deg) translateY(-2px)`
    })
  }

  const handleMouseLeave = () => {
    const card = cardRef.current
    if (!card) return

    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    card.style.transform = ""
  }

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`${className}`}
      style={{ transition: "transform 240ms cubic-bezier(0.22, 0.61, 0.36, 1)" }}
    >
      {children}
    </div>
  )
}
