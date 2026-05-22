import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { Sparkles } from "lucide-react"

import { getAuth } from "@/lib/auth"

import { GoogleCta } from "./_components/google-cta"
import {
  LandingHeader,
  LiveTicker,
  LivePostDraftCard,
  WorkbenchConsole,
  PricingSection,
  TiltCard
} from "./_components/landing-client"
import "./landing.css"

export const dynamic = "force-dynamic"

export default async function LandingPage() {
  const reqHeaders = await headers()
  const session = await getAuth().api.getSession({ headers: reqHeaders })
  if (session) redirect("/dashboard/ideas")

  return (
    <div className="landing-root min-h-screen">
      {/* N5 Floating Nav Pill */}
      <LandingHeader />

      {/* Hero Section */}
      <section className="lp-hero">
        <div className="lp-container">
          <div className="flex flex-col items-start gap-4">
            <LiveTicker />
          </div>

          <div className="lp-hero__layout">
            <div>
              <h1 className="lp-hero__h1 text-balance">
                Plan a quarter of social content in <span className="lp-italic-accent">an afternoon.</span>
              </h1>
              <p className="lp-hero__sub text-balance">
                Capture thoughts in seconds, let AI draft them in your personalized voice, and schedule across your channels — all from one calm workspace.
              </p>
              <div className="lp-hero__ctas">
                <GoogleCta />
                <a href="#product" className="lp-btn lp-btn--ghost">
                  See how it works
                </a>
              </div>
              <div className="lp-hero__fineprint">
                <span>no credit card required</span>
                <span>5-minute setup</span>
                <span>10 posts / month free</span>
              </div>
            </div>

            {/* Live Social Post Draft Card (Tier-A Art) */}
            <LivePostDraftCard />
          </div>

          {/* Marquee Strip */}
          <div className="lp-hero__marquee" aria-hidden="true">
            <div className="lp-hero__marquee__track">
              <span>CAPTURE IDEAS</span>
              <span>DRAFT WITH AI</span>
              <span>SCHEDULE MULTI-CHANNEL</span>
              <span>OPTIMIZE SEND TIMES</span>
              <span>SYNC TO CALENDAR</span>
              <span>CAPTURE IDEAS</span>
              <span>DRAFT WITH AI</span>
              <span>SCHEDULE MULTI-CHANNEL</span>
              <span>OPTIMIZE SEND TIMES</span>
              <span>SYNC TO CALENDAR</span>
            </div>
          </div>
        </div>
      </section>

      {/* Logo Grid */}
      <section className="lp-logos">
        <div className="lp-container">
          <div className="lp-logos__label">Powering content growth for fast-moving teams</div>
          <div className="lp-logos__row">
            <div className="l-1">Bramble</div>
            <div className="l-2">orbit/labs</div>
            <div className="l-3">FORGE</div>
            <div className="l-4">Quietly</div>
            <div className="l-5">Northsky</div>
            <div className="l-6">Mercer &amp; Co.</div>
          </div>
        </div>
      </section>

      {/* Workbench Section */}
      <section className="lp-workbench">
        <div className="lp-container">
          <div className="lp-section-head">
            <div>
              <span className="lp-eyebrow">◇ workbench</span>
              <h2 className="lp-section-head__title">
                A calm workspace that <span className="lp-italic-accent">knows</span> your style.
              </h2>
            </div>
            <p className="lp-section-head__desc">
              Drop in a quick text idea, voice note, or link. CalmPost drafts channel-ready posts in your voice, updates your queue, and visualizes your engagement analytics instantly.
            </p>
          </div>

          <WorkbenchConsole />
        </div>
      </section>

      {/* Stats Triplet Grid */}
      <section className="lp-stats">
        <div className="lp-container">
          <div className="lp-section-head">
            <div>
              <span className="lp-eyebrow">◇ metrics</span>
              <h2 className="lp-section-head__title">
                Growth you can <span className="lp-italic-accent">feel</span>, not just measure.
              </h2>
            </div>
            <p className="lp-section-head__desc">
              From staring at a blinking cursor to a fully-scheduled calendar. CalmPost takes the stress out of social presence.
            </p>
          </div>

          <div className="lp-stats__grid">
            <div className="lp-stats__card">
              <div className="lp-stats__num">420<small>K+</small></div>
              <div className="lp-stats__label">posts scheduled</div>
              <div className="lp-stats__note">Scheduled automatically across X, LinkedIn, and Threads since 2025.</div>
            </div>
            <div className="lp-stats__card">
              <div className="lp-stats__num">8.5<small>×</small></div>
              <div className="lp-stats__label">faster scheduling</div>
              <div className="lp-stats__note">From raw thoughts to a structured monthly queue in 15 minutes flat.</div>
            </div>
            <div className="lp-stats__card">
              <div className="lp-stats__num">100%</div>
              <div className="lp-stats__label">consistent posting</div>
              <div className="lp-stats__note">Automated queue filling so you stay active even when you're offline.</div>
            </div>
          </div>
        </div>
      </section>

      {/* Three Feature Cards with Hover Tilt */}
      <section className="lp-features" id="features">
        <div className="lp-container">
          <div className="lp-section-head">
            <div>
              <span className="lp-eyebrow">◇ features</span>
              <h2 className="lp-section-head__title">
                Post scheduling, <span className="lp-italic-accent">re-imagined</span> for creators.
              </h2>
            </div>
            <p className="lp-section-head__desc">
              Everything you need to automate your social presence without sounding like an AI bot. Keep your voice, loose your stress.
            </p>
          </div>

          <div className="lp-features__grid">
            <TiltCard className="lp-feature">
              <div className="lp-feature__art art-capture" aria-hidden="true"></div>
              <h3 className="lp-feature__title">Capture thoughts instantly</h3>
              <p className="lp-feature__desc">
                Save links, screenshots, or write loose thoughts on the go. CalmPost holds them in your idea inbox until you're ready to draft.
              </p>
              <a className="lp-feature__link" href="#product">Explore drafts inbox</a>
            </TiltCard>

            <TiltCard className="lp-feature">
              <div className="lp-feature__art art-voice-sliders" aria-hidden="true"></div>
              <h3 className="lp-feature__title">Trained on your persona</h3>
              <p className="lp-feature__desc">
                Fine-tune your writing persona with sample posts. CalmPost mimics your spacing, style, and tone to generate perfect drafts.
              </p>
              <a className="lp-feature__link" href="#product">Configure personas</a>
            </TiltCard>

            <TiltCard className="lp-feature">
              <div className="lp-feature__art art-calendar-pile" aria-hidden="true">
                <div className="lp-sheet"><b>INV-04210</b>Queue · 4 PM<br/><em>Draft Ready</em></div>
                <div className="lp-sheet"><b>INV-04211</b>LinkedIn · 10 AM<br/><em>Scheduled</em></div>
                <div className="lp-sheet"><b>INV-04212</b>Twitter · 6 PM<br/><em>Simulated</em></div>
              </div>
              <h3 className="lp-feature__title">Multi-channel calendar</h3>
              <p className="lp-feature__desc">
                Cross-post to LinkedIn and Twitter at the same time. Custom queues schedule posts at optimal times for each platform.
              </p>
              <a className="lp-feature__link" href="#product">See optimal times</a>
            </TiltCard>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <PricingSection />

      {/* Testimonial Section */}
      <section className="lp-testimonial">
        <div className="lp-container">
          <p className="lp-testimonial__quote text-balance">
            I went from spending half my weekend formatting posts to queuing three months of content in a single afternoon.
          </p>
          <div className="lp-testimonial__byline">
            <strong>Sarah Chen</strong>
            <span>Founder · Bramble · 55K reach</span>
          </div>
        </div>
      </section>

      {/* Call-to-action Section */}
      <section className="lp-cta">
        <div className="lp-container">
          <div className="lp-cta__panel">
            <h2 className="lp-cta__title text-balance">
              Build your digital presence on <span className="lp-italic-accent">autopilot.</span>
            </h2>
            <p className="lp-cta__sub text-balance">
              Join thousands of founders and creators who write, schedule, and optimize their social content without the daily friction. Set up in less than 2 minutes.
            </p>
            <div className="flex flex-wrap gap-4 justify-center items-center">
              <GoogleCta />
            </div>
          </div>
        </div>
      </section>

      {/* Statement Footer */}
      <footer className="lp-footer">
        <div className="lp-container">
          <p className="lp-footer__statement text-balance">
            CalmPost is a scheduling assistant for teams who'd rather <span className="lp-italic-accent">build</span> than post.
          </p>
          
          <div className="lp-footer__row">
            <div className="lp-footer__col">
              <h5>Product</h5>
              <ul>
                <li><a href="#product">Ideas Inbox</a></li>
                <li><a href="#product">AI Drafts</a></li>
                <li><a href="#product">Analytics</a></li>
                <li><a href="#product">Auto-Queue</a></li>
              </ul>
            </div>
            <div className="lp-footer__col">
              <h5>Developers</h5>
              <ul>
                <li><a href="#">API Reference</a></li>
                <li><a href="#">SDKs</a></li>
                <li><a href="#">Status</a></li>
                <li><a href="#">Changelog</a></li>
              </ul>
            </div>
            <div className="lp-footer__col">
              <h5>Company</h5>
              <ul>
                <li><a href="#">About</a></li>
                <li><a href="#">Blog</a></li>
                <li><a href="#">Careers</a></li>
                <li><a href="#">Press</a></li>
              </ul>
            </div>
            <div className="lp-footer__col">
              <h5>Resources</h5>
              <ul>
                <li><a href="#">Creator Playbook</a></li>
                <li><a href="#">Optimal Times</a></li>
                <li><a href="#">Privacy Policy</a></li>
                <li><a href="#">Security</a></li>
              </ul>
            </div>
          </div>

          <div className="lp-footer__legal">
            <span className="wordmark">CalmPost</span>
            <span>© 2026 CalmPost Labs · Made in Brooklyn &amp; SF · v1.0.0</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

