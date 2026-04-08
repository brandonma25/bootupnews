import { requestMagicLinkAction } from "@/app/actions";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Sparkles, ShieldCheck, Rss } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { isSupabaseConfigured } from "@/lib/env";

const features = [
  {
    icon: Rss,
    title: "Structured feed intake",
    description: "Pull RSS sources into one clean system instead of scanning tabs and newsletters all morning.",
  },
  {
    icon: Sparkles,
    title: "Analyst-style summaries",
    description: "Each story is reduced to what happened, 3 key points, why it matters, and direct source links.",
  },
  {
    icon: ShieldCheck,
    title: "Simple, reliable MVP stack",
    description: "Built with Next.js, Supabase, and a clean AI service layer so it is fast to ship and easy to maintain.",
  },
];

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; auth?: string }>;
}) {
  const params = await searchParams;
  const sent = params.sent === "1";
  const authRequired = params.auth === "1";

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col gap-6 px-4 py-4 lg:px-6">
      <Panel className="overflow-hidden">
        <div className="grid gap-10 p-8 md:p-10 lg:grid-cols-[1.2fr_0.8fr] lg:p-12">
          <div className="space-y-8">
            <Badge>Daily Intelligence Aggregator</Badge>
            <div className="space-y-5">
              <h1 className="display-font max-w-4xl text-5xl leading-none tracking-tight text-[var(--foreground)] md:text-7xl">
                A calm, high-signal intelligence dashboard for busy operators.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-[var(--muted)]">
                Turn scattered feeds into a polished daily briefing that helps you get smarter in 30 to 45 minutes, not two hours.
              </p>
            </div>

            {isSupabaseConfigured ? (
              <div className="max-w-xl space-y-3">
                <form action={requestMagicLinkAction} className="flex flex-col gap-3 sm:flex-row">
                  <input
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    className="min-w-0 flex-1 rounded-full border border-[var(--line)] bg-white/70 px-5 py-3 text-sm outline-none"
                  />
                  <Button className="gap-2 px-5 py-3 text-sm">
                    Send sign-in link
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </form>

                {sent ? (
                  <div className="rounded-[24px] border border-[var(--line)] bg-[var(--accent-soft)] px-5 py-4 text-sm leading-7 text-[var(--foreground)]">
                    Check your inbox for a secure sign-in link. Open the latest email we just sent and click the confirmation button to continue.
                  </div>
                ) : null}

                {authRequired ? (
                  <div className="rounded-[24px] border border-[var(--line)] bg-white/70 px-5 py-4 text-sm leading-7 text-[var(--foreground)]">
                    Sign in with your email first, then you&apos;ll be redirected back into the app.
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                <Link href="/dashboard">
                  <Button className="gap-2 px-5 py-3 text-sm">
                    Enter dashboard
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/settings">
                  <Button variant="secondary" className="px-5 py-3 text-sm">
                    Connect live data
                  </Button>
                </Link>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-3">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className="rounded-[24px] border border-[var(--line)] bg-white/55 p-5"
                  >
                    <Icon className="h-5 w-5 text-[var(--accent)]" />
                    <h2 className="mt-4 text-base font-semibold text-[var(--foreground)]">
                      {feature.title}
                    </h2>
                    <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                      {feature.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-[32px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.86),rgba(247,243,236,0.95))] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                  Today&apos;s briefing
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                  Executive scan
                </h2>
              </div>
              <Badge className="text-[var(--accent)]">34 minutes</Badge>
            </div>

            <div className="mt-8 space-y-4">
              {[
                "Top 5 stories up front",
                "Topic sections for AI, markets, politics, and more",
                "Exactly 3 key bullets per story",
                "Clear source attribution and read-state",
              ].map((line) => (
                <div
                  key={line}
                  className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-4"
                >
                  <CheckCircle2 className="h-4 w-4 text-[var(--accent)]" />
                  <span className="text-sm text-[var(--foreground)]">{line}</span>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-[24px] bg-[var(--foreground)] p-5 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
                Sign-in path
              </p>
              <p className="mt-3 text-sm leading-7 text-white/85">
                For the MVP, the app supports Supabase email magic links for any valid email address. If you have not connected Supabase yet, the product opens in a polished demo mode so you can review the experience immediately.
              </p>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}
