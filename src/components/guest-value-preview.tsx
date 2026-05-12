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
        "rounded-card border border-[var(--border)] bg-[var(--bg)] p-5",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-card bg-[var(--sidebar)] text-[var(--text-primary)]">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <Badge className="border-[var(--border)] bg-[var(--card)] text-[var(--text-primary)]">
            You&apos;re viewing the public briefing
          </Badge>
          <h2 className={cn("mt-3 text-lg font-medium text-[var(--text-primary)]", compact && "text-base")}>
            Sign in to personalize your intelligence
          </h2>
          <p className="mt-2 max-w-2xl text-base text-[var(--text-secondary)]">
            Preview today&apos;s ranked briefing now, then unlock your own topics, saved briefings, and tailored monitoring when you sign in.
          </p>
          <Link
            href={ctaHref}
            className="mt-4 inline-flex text-sm font-medium text-[var(--accent)] hover:underline"
          >
            {ctaLabel}
          </Link>
        </div>
      </div>

      <div className={cn("mt-5 grid gap-3", compact ? "md:grid-cols-1" : "md:grid-cols-3")}>
        {lockedFeatures.map((feature) => (
          <div
            key={feature.title}
            className="rounded-card border border-dashed border-[var(--border)] bg-[var(--card)] px-4 py-4"
          >
            <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
              <LockKeyhole className="h-4 w-4 text-[var(--text-secondary)]" />
              <span>{feature.title}</span>
            </div>
            <p className="mt-2 text-base text-[var(--text-secondary)]">{feature.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
