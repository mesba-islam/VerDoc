import Link from "next/link";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { PricingPlans } from "@/app/components/PricingPlans";
import { Button } from "@/components/ui/button";

const useCases = [
  {
    title: "Meeting capture",
    description: "Record, transcribe, and ship decisions to your team in minutes.",
    bullets: ["Auto-highlights", "Action items", "Shareable recaps"],
  },
  {
    title: "Podcasts & creators",
    description: "Turn every episode into transcripts, clips, and summaries.",
    bullets: ["Speaker-aware", "SEO-ready text", "Export anywhere"],
  },
  {
    title: "Research & discovery",
    description: "Keep interviews organized, searchable, and compliant.",
    bullets: ["Tags & topics", "Quotes in context", "Team-safe access"],
  },
  {
    title: "Operations & QA",
    description: "Audit calls and documents without digging through archives.",
    bullets: ["Smart filters", "Retention controls", "Audit trails"],
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 sm:px-6 lg:px-8">
        <div className="relative mx-auto w-full max-w-screen-2xl overflow-hidden rounded-3xl border bg-card/70 shadow-xl backdrop-blur">
          <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/10 via-transparent to-primary/5 dark:from-primary/15 dark:via-background dark:to-primary/10" />
          <div className="relative mx-auto flex w-full flex-col gap-12 px-6 pb-16 pt-16 lg:flex-row lg:items-center lg:px-12 lg:pt-24">
            <div className="flex-1 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary dark:bg-primary/20">
                <Sparkles className="h-4 w-4" /> AI-first document workspace
              </div>
              <div className="space-y-4">
                <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
                  Turn spoken ideas into finished documents, automatically.
                </h1>
                <p className="max-w-2xl text-lg text-muted-foreground">
                  VerDoc captures meetings, podcasts, and research sessions, then delivers clean transcripts,
                  concise summaries, and ready-to-share notes in minutes.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button asChild size="lg">
                  <Link href="#pricing">
                    View pricing <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="ghost">
                  <Link href="/transcribe">Try transcription</Link>
                </Button>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {["No credit card to start", "Secure Paddle checkout", "Cancel anytime"].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1">
              <div className="relative rounded-3xl border bg-card/70 p-6 shadow-xl backdrop-blur">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-primary">Live workspace</p>
                    <p className="text-sm text-muted-foreground">Summaries, actions, and transcripts in one place.</p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    Synchronized
                  </span>
                </div>
                <div className="space-y-3 rounded-xl border bg-background p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">Product Review Call</p>
                      <p className="text-xs text-muted-foreground">Today · 42 min · 3 speakers</p>
                    </div>
                    <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-500">
                      Transcribed
                    </span>
                  </div>
                  <div className="rounded-lg bg-muted/60 p-3 text-sm leading-relaxed text-foreground">
                    <p className="font-semibold">Summary</p>
                    <p className="text-muted-foreground">
                      Consensus to proceed with the Starter plan. Next step: deliver onboarding checklist and share
                      timeline by Friday.
                    </p>
                  </div>
                  <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                    <div className="rounded-lg border bg-background p-3">
                      <p className="text-foreground font-semibold">Action items</p>
                      <ul className="mt-2 space-y-1">
                        <li>• Send access to shared workspace</li>
                        <li>• Draft onboarding guide</li>
                        <li>• Confirm billing contact</li>
                      </ul>
                    </div>
                    <div className="rounded-lg border bg-background p-3">
                      <p className="text-foreground font-semibold">Highlights</p>
                      <ul className="mt-2 space-y-1">
                        <li>• Pricing confirmed at $10.34/mo</li>
                        <li>• Needs podcast upload support</li>
                        <li>• Weekly summaries preferred</li>
                      </ul>
                    </div>
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
          <p className="text-sm font-semibold text-primary">Why teams choose VerDoc</p>
          <h2 className="text-3xl font-bold">Built for modern workflows</h2>
          <p className="text-muted-foreground">
            Capture, search, and ship outcomes faster—without juggling files or tabs.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {useCases.map((useCase) => (
            <div key={useCase.title} className="rounded-xl border bg-card p-6 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h3 className="text-lg font-semibold">{useCase.title}</h3>
              </div>
              <p className="mb-4 text-sm text-muted-foreground">{useCase.description}</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {useCase.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-screen-2xl overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/10 via-background to-primary/5 p-8 shadow-2xl sm:p-10 lg:p-12">
          <div className="mb-8 space-y-2 text-center">
            <p className="text-sm font-semibold text-primary">Pricing</p>
            <h2 className="text-3xl font-bold">Simple, usage-friendly plans</h2>
            <p className="text-muted-foreground">
              Predictable billing with secure Paddle checkout. Cancel anytime.
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
              Meet. Speak. Transcribe. Summarize. Keep every conversation actionable and searchable.
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
          © {new Date().getFullYear()} VerDoc. All rights reserved.
        </div>
      </footer>
    </main>
  );
}
