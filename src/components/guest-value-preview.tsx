import Link from "next/link";
import { LockKeyhole, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const lockedFeatures = [
  {
    title: "Personalized topics",
    description: "Follow the subjects you care about instead of the default public mix.",
  },
  {
    title: "Saved history",
    description: "Keep every generated briefing available for quick recall and comparison.",
  },
  {
    title: "Custom alerts",
    description: "Surface the developments that matter to you before they become noise.",
  },
];

export function GuestValuePreview({
  className,
  compact = false,
  ctaHref = "/#email-access",
  ctaLabel = "Sign in to personalize",
}: {
  className?: string;
  compact?: boolean;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[24px] border border-[rgba(19,26,34,0.08)] bg-[rgba(245,241,233,0.72)] p-5",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[rgba(19,26,34,0.08)] text-[var(--foreground)]">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <Badge className="border-[rgba(19,26,34,0.08)] bg-white/70 text-[var(--foreground)]">
            You&apos;re viewing the public briefing
          </Badge>
          <h2 className={cn("mt-3 text-lg font-semibold text-[var(--foreground)]", compact && "text-base")}>
            Sign in to personalize your intelligence
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            Preview today&apos;s ranked briefing now, then unlock your own topics, saved briefings, and tailored monitoring when you sign in.
          </p>
          <Link
            href={ctaHref}
            className="mt-4 inline-flex text-sm font-semibold text-[var(--accent)] hover:underline"
          >
            {ctaLabel}
          </Link>
        </div>
      </div>

      <div className={cn("mt-5 grid gap-3", compact ? "md:grid-cols-1" : "md:grid-cols-3")}>
        {lockedFeatures.map((feature) => (
          <div
            key={feature.title}
            className="rounded-[18px] border border-dashed border-[rgba(19,26,34,0.12)] bg-white/65 px-4 py-4"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
              <LockKeyhole className="h-4 w-4 text-[var(--muted)]" />
              <span>{feature.title}</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{feature.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
