import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  body: string;
  actionLabel?: string;
  actionHref?: string;
  className?: string;
};

export function EmptyState({
  title,
  body,
  actionLabel,
  actionHref,
  className,
}: EmptyStateProps) {
  return (
    <section
      className={cn(
        "mx-auto flex min-h-[52vh] w-full max-w-[var(--bu-container-narrow)] flex-col items-center justify-center text-center",
        className,
      )}
    >
      <h1 className="text-[var(--bu-size-page-title)] font-medium leading-tight text-[var(--bu-text-primary)]">
        {title}
      </h1>
      <p className="mt-3 max-w-xl font-heading text-[var(--bu-size-witm)] font-normal leading-[var(--bu-line-witm)] text-[var(--bu-text-secondary)]">
        {body}
      </p>
      {actionLabel && actionHref ? (
        <Button asChild variant="secondary" className="mt-5">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      ) : null}
    </section>
  );
}
