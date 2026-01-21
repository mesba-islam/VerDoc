import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clock3, Link2, ListChecks, Sparkles } from "lucide-react";
import { PricingPlans } from "@/app/components/PricingPlans";
import { HeroCtas } from "@/app/components/HeroCtas";

const useCases = [
  {
    title: "Founders",
    description: "Walk into board updates with timestamped proof of progress from every call.",
    bullets: ["Executive summary in minutes", "Decisions linked to the exact moment", "Action items with owners and dates"],
  },
  {
    title: "Managers",
    description: "Keep teams aligned without replaying meetings or guessing what was agreed.",
    bullets: ["Clear decisions to broadcast", "Action items per owner", "Open risks captured for follow-up"],
  },
  {
    title: "Consultants",
    description: "Hand off client meetings with auditable outcomes and zero rework.",
    bullets: ["Client-ready executive briefs", "No-guess decisions list", "Timestamps for every claim"],
  },
  {
    title: "All professionals",
    description: "Give every team decision-ready recaps they can trust and share.",
    bullets: ["Execs, product, sales, success aligned", "Shareable summaries with proof links", "Actionable follow-ups in minutes"],
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 sm:px-6 lg:px-8">
        <div className="relative mx-auto w-full max-w-screen-2xl overflow-hidden rounded-3xl border bg-card/70 shadow-xl backdrop-blur">
          <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/10 via-transparent to-primary/5 dark:from-primary/15 dark:via-background dark:to-primary/10" />
          <div className="relative mx-auto flex w-full flex-col items-center gap-12 px-6 pb-16 pt-16 lg:px-12 lg:pt-24">
            <div className="flex w-full max-w-3xl flex-col items-center space-y-6 text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary dark:bg-primary/20">
                <Sparkles className="h-4 w-4" /> Decision-ready docs from meetings
              </div>
              <div className="space-y-4">
                <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
                  Automated meeting intelligence for faster execution.
                </h1>
                <p className="max-w-2xl text-lg text-muted-foreground">
                  Upload once. Receive structured summaries with decisions, owners, and timestamped proof -- ready to share across your org.
                </p>
              </div>
              <HeroCtas />
              <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
                {["Cancel anytime", "Links to exact audio moments", "Share with your team instantly"].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="w-full max-w-4xl">
              <div className="relative rounded-3xl border bg-card/80 p-6 shadow-xl backdrop-blur">
                <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/10 via-transparent to-primary/15" />
                <div className="relative flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-primary">Decision-ready</p>
                      <p className="text-sm text-muted-foreground">Built from your recording</p>
                    </div>
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                      Auto-generated
                    </span>
                  </div>

                  <div className="grid gap-3 text-sm sm:grid-cols-2">
                    <div className="rounded-xl border bg-background/90 p-4 shadow-sm">
                      <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-primary">
                        <Sparkles className="h-3.5 w-3.5" />
                        Executive summary
                      </div>
                      <div className="space-y-2 text-muted-foreground">
                        <p className="rounded-lg bg-muted/60 px-3 py-2 text-foreground">What changed</p>
                        <p className="rounded-lg bg-muted/60 px-3 py-2 text-foreground">Why it matters</p>
                      </div>
                    </div>

                    <div className="rounded-xl border bg-background/90 p-4 shadow-sm">
                      <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-primary">
                        <ListChecks className="h-3.5 w-3.5" />
                        Decisions
                      </div>
                      <div className="space-y-2 text-muted-foreground">
                        <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                          <span className="text-foreground">Beta next week</span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">
                            <Clock3 className="h-3.5 w-3.5" />
                            00:12:30
                          </span>
                        </div>
                        <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                          <span className="text-foreground">Budget approved</span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">
                            <Clock3 className="h-3.5 w-3.5" />
                            00:18:02
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 text-sm sm:grid-cols-2">
                    <div className="rounded-xl border bg-background/90 p-4 shadow-sm">
                      <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-primary">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Action items
                      </div>
                      <div className="space-y-2 text-muted-foreground">
                        <div className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2">
                          <span className="text-foreground">Onboarding checklist</span>
                          <span className="text-[10px] font-semibold text-primary">Lina - Fri</span>
                        </div>
                        <div className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2">
                          <span className="text-foreground">Billing contact</span>
                          <span className="text-[10px] font-semibold text-primary">Sam</span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border bg-background/90 p-4 shadow-sm">
                      <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-primary">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Risks / open
                      </div>
                      <div className="space-y-2 text-muted-foreground">
                        <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                          <span className="text-foreground">Partner feedback timing</span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">
                            <Clock3 className="h-3.5 w-3.5" />
                            00:31:48
                          </span>
                        </div>
                        <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                          <span className="text-foreground">Data residency ask</span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">
                            <Clock3 className="h-3.5 w-3.5" />
                            00:34:10
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-background/90 p-3 text-xs font-semibold text-primary shadow-sm">
                    <Link2 className="h-4 w-4" />
                    Timestamped proof for every item
                    <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">
                      Copy link
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="mx-auto w-full space-y-8 px-6 py-16">
        <div className="space-y-2 text-center">
          <p className="text-sm font-semibold text-primary">Built for teams</p>
          <h2 className="text-3xl font-bold">Executive memory for every professional</h2>
          <p className="text-muted-foreground">
            From one meeting recording, VerDoc returns an executive summary, clear decisions, accountable owners, open questions, and timestamped proof.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {useCases.map((useCase) => (
            <div
              key={useCase.title}
              className="relative overflow-hidden rounded-2xl border bg-card/70 p-6 shadow-sm transition-all duration-150 hover:-translate-y-1 hover:shadow-md"
            >
              <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
              <div className="relative space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  <Sparkles className="h-4 w-4" />
                  {useCase.title}
                </div>
                <p className="text-sm font-semibold text-foreground">{useCase.description}</p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {useCase.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-screen-2xl overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/10 via-background to-primary/5 p-8 shadow-2xl sm:p-10 lg:p-12">
          <div className="mb-8 space-y-2 text-center">
            <p className="text-sm font-semibold text-primary">Pricing</p>
            <h2 className="text-3xl font-bold">Simple plans for meeting outcomes</h2>
            <p className="text-muted-foreground">
              Executive summaries, decisions, action items, and timestamped proof with predictable billing. Cancel anytime.
            </p>
          </div>
          <PricingPlans />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-background/80 py-10">
        <div className="mx-auto flex w-full flex-col gap-8 px-6 md:flex-row md:justify-between">
          <div className="space-y-3">
            <h3 className="text-xl font-semibold">VerDoc</h3>
            <p className="max-w-md text-sm text-muted-foreground">
              Executive memory for meetings: decisions, action items, open questions, and timestamped proof from every recording.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">Product</p>
              <Link className="hover:text-foreground" href="/transcribe">Transcribe</Link>
              <Link className="hover:text-foreground" href="#pricing">Pricing</Link>
              <Link className="hover:text-foreground" href="/archive">Archive</Link>
            </div>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">Resources</p>
              <Link className="hover:text-foreground" href="/signin">Sign in</Link>
              <Link className="hover:text-foreground" href="/register">Get started</Link>
            </div>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">Company</p>
              <Link className="hover:text-foreground" href="/profile">Profile</Link>
              <Link className="hover:text-foreground" href="/transcribe">Demo</Link>
            </div>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">Legal</p>
              <span>Terms</span>
              <span>Privacy</span>
            </div>
          </div>
        </div>
        <div className="mt-8 text-center text-xs text-muted-foreground">
          (c) {new Date().getFullYear()} VerDoc. All rights reserved.
        </div>
      </footer>
    </main>
  );
}

