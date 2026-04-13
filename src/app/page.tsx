import type { Metadata } from "next";
import { requestMagicLinkAction, signInWithProviderAction } from "@/app/actions";
import Link from "next/link";
import { ArrowRight, CheckCircle2, KeyRound, MailCheck, Sparkles, ShieldCheck, Rss } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { getViewerAccount } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = {
  title: "Daily Intelligence Aggregator — High-signal daily briefings",
};

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
  const authState = params.auth;
  const authRequired = authState === "1";
  const viewer = await getViewerAccount();

  return (
    <AppShell currentPath="/" mode={isSupabaseConfigured ? "public" : "demo"} account={viewer}>
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

            {viewer ? (
              <div className="rounded-[24px] border border-[rgba(31,79,70,0.16)] bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(243,249,247,0.92))] p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">
                      Welcome back, {viewer.displayName}.
                    </p>
                    <p className="mt-1 text-sm leading-7 text-[var(--muted)]">
                      Your dashboard is ready with the latest briefing and source updates.
                    </p>
                  </div>
                  <Link href="/dashboard">
                    <Button className="gap-2 px-5 py-3 text-sm">
                      Open Today
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            ) : null}

            {isSupabaseConfigured ? (
              <div id="email-access" className="max-w-xl scroll-mt-24 space-y-3">
                <div className="rounded-[30px] border border-[var(--line)] bg-white/70 p-5 md:p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>Authentication</Badge>
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                      Password, Google, Apple, or magic link
                    </span>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <form action={signInWithProviderAction}>
                      <input type="hidden" name="provider" value="google" />
                      <Button variant="secondary" className="w-full justify-between px-5 py-3 text-sm">
                        Continue with Google
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </form>
                    <form action={signInWithProviderAction}>
                      <input type="hidden" name="provider" value="apple" />
                      <Button variant="secondary" className="w-full justify-between px-5 py-3 text-sm">
                        Continue with Apple
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </form>
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    <form action="/auth/password" method="post" className="space-y-3 rounded-[24px] border border-[var(--line)] bg-white/75 p-4">
                      <input type="hidden" name="mode" value="signup" />
                      <div className="flex items-center gap-2">
                        <KeyRound className="h-4 w-4 text-[var(--accent)]" />
                        <p className="text-sm font-semibold text-[var(--foreground)]">Create account</p>
                      </div>
                      <input
                        name="email"
                        type="email"
                        placeholder="you@example.com"
                        className="w-full rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-3 text-sm outline-none"
                      />
                      <input
                        name="password"
                        type="password"
                        placeholder="Create a password"
                        minLength={8}
                        className="w-full rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-3 text-sm outline-none"
                      />
                      <Button className="w-full justify-between px-5 py-3 text-sm">
                        Sign up with password
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </form>

                    <form action="/auth/password" method="post" className="space-y-3 rounded-[24px] border border-[var(--line)] bg-white/75 p-4">
                      <input type="hidden" name="mode" value="signin" />
                      <div className="flex items-center gap-2">
                        <KeyRound className="h-4 w-4 text-[var(--accent)]" />
                        <p className="text-sm font-semibold text-[var(--foreground)]">Sign in</p>
                      </div>
                      <input
                        name="email"
                        type="email"
                        placeholder="you@example.com"
                        className="w-full rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-3 text-sm outline-none"
                      />
                      <input
                        name="password"
                        type="password"
                        placeholder="Your password"
                        minLength={8}
                        className="w-full rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-3 text-sm outline-none"
                      />
                      <Button variant="secondary" className="w-full justify-between px-5 py-3 text-sm">
                        Sign in with password
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </form>
                  </div>

                  <div className="mt-5 rounded-[24px] border border-dashed border-[var(--line)] bg-[var(--panel)]/50 p-4">
                    <p className="text-sm font-semibold text-[var(--foreground)]">Passwordless fallback</p>
                    <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                      Prefer not to use a password? Request a magic link and confirm the sign-in from your inbox.
                    </p>
                    <form action={requestMagicLinkAction} className="mt-4 flex flex-col gap-3 sm:flex-row">
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
                  </div>
                </div>

                {sent ? (
                  <div className="overflow-hidden rounded-[28px] border border-[rgba(31,79,70,0.18)] bg-[linear-gradient(135deg,rgba(31,79,70,0.14),rgba(255,255,255,0.92))] shadow-[0_18px_45px_rgba(31,79,70,0.10)]">
                    <div className="flex items-start gap-4 px-5 py-5 md:px-6">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--foreground)] text-white shadow-[0_12px_26px_rgba(19,26,34,0.18)]">
                        <MailCheck className="h-5 w-5" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className="border-[rgba(31,79,70,0.18)] bg-white/80 text-[var(--accent)]">
                            Inbox check
                          </Badge>
                          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                            Sign-in link sent
                          </span>
                        </div>
                        <p className="text-base font-semibold text-[var(--foreground)]">
                          Check your inbox to confirm your email address.
                        </p>
                        <p className="text-sm leading-7 text-[var(--muted)]">
                          Open the latest email we just sent, then click the secure confirmation button to finish signing in.
                        </p>
                      </div>
                    </div>
                    <div className="border-t border-[rgba(19,26,34,0.08)] bg-white/60 px-5 py-3 text-xs uppercase tracking-[0.18em] text-[var(--muted)] md:px-6">
                      No email yet? Check spam or request a fresh link.
                    </div>
                  </div>
                ) : null}

                {authRequired ? (
                  <div className="rounded-[24px] border border-[var(--line)] bg-white/70 px-5 py-4 text-sm leading-7 text-[var(--foreground)]">
                    Sign in with your email first, then you&apos;ll be redirected back into the app.
                  </div>
                ) : null}

                {authState === "confirm" ? (
                  <div className="rounded-[24px] border border-[rgba(31,79,70,0.18)] bg-white/70 px-5 py-4 text-sm leading-7 text-[var(--foreground)]">
                    Your account has been created. Check your inbox to confirm your email address before signing in.
                  </div>
                ) : null}

                {authState === "invalid" ? (
                  <div className="rounded-[24px] border border-[rgba(148,72,53,0.18)] bg-white/70 px-5 py-4 text-sm leading-7 text-[var(--foreground)]">
                    That email and password combination did not work. Double-check your credentials and try again.
                  </div>
                ) : null}

                {authState === "signup-error" ? (
                  <div className="rounded-[24px] border border-[rgba(148,72,53,0.18)] bg-white/70 px-5 py-4 text-sm leading-7 text-[var(--foreground)]">
                    We couldn&apos;t create the account with that password just yet. Try a stronger password or a different email.
                  </div>
                ) : null}

                {authState === "oauth-error" ? (
                  <div className="rounded-[24px] border border-[rgba(148,72,53,0.18)] bg-white/70 px-5 py-4 text-sm leading-7 text-[var(--foreground)]">
                    The social sign-in request did not complete. Check that the provider is enabled in Supabase and try again.
                  </div>
                ) : null}

                {authState === "callback-error" ? (
                  <div className="rounded-[24px] border border-[rgba(148,72,53,0.18)] bg-white/70 px-5 py-4 text-sm leading-7 text-[var(--foreground)]">
                    We could not restore your session cleanly. Try signing in again, or use an incognito window if the browser is holding a stale session.
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

            <div className="rounded-[24px] border border-[var(--line)] bg-white/60 p-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge>Getting started</Badge>
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                  Recommended flow
                </span>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {[
                  "1. Sign in or create an account.",
                  "2. Review the live source library and import feeds.",
                  "3. Add or refine your briefing topics.",
                  "4. Generate a fresh briefing on Today.",
                ].map((step) => (
                  <div
                    key={step}
                    className="rounded-[20px] border border-[var(--line)] bg-white/70 px-4 py-4 text-sm leading-7 text-[var(--foreground)]"
                  >
                    {step}
                  </div>
                ))}
              </div>
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
              <Badge className="text-[var(--accent)]">15-20 min typical</Badge>
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
                The app now supports email passwords, Google, Apple, and Supabase magic links. If you have not connected Supabase yet, the product opens in a polished demo mode so you can review the experience immediately.
              </p>
            </div>
          </div>
        </div>
      </Panel>
    </AppShell>
  );
}
