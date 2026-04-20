import { Card } from "@/components/ui/card";
import type { BriefingItem } from "@/lib/types";
import { cn } from "@/lib/utils";

type CategoryCardItem = Pick<BriefingItem, "title" | "whatHappened" | "matchedKeywords">;

export type BriefingCardCategoryProps = {
  item?: CategoryCardItem;
  loading?: boolean;
  errorMessage?: string;
  className?: string;
};

export function BriefingCardCategory({
  item,
  loading = false,
  errorMessage,
  className,
}: BriefingCardCategoryProps) {
  if (loading) {
    return (
      <Card
        aria-busy="true"
        className={cn("w-full p-5", className)}
      >
        <div className="space-y-4">
          <div className="h-5 w-4/5 animate-pulse rounded-full bg-[var(--line)]" />
          <div className="h-4 w-2/5 animate-pulse rounded-full bg-[var(--line)]" />
        </div>
      </Card>
    );
  }

  if (errorMessage) {
    return (
      <Card className={cn("w-full p-5", className)}>
        <p role="alert" className="text-sm font-medium leading-6 text-red-700">
          {errorMessage}
        </p>
      </Card>
    );
  }

  if (!item) {
    return null;
  }

  const sourcePills = item.matchedKeywords ?? [];

  return (
    <Card className={cn("w-full p-5", className)}>
      <div className="space-y-3">
        <h3 className="text-base font-semibold leading-tight text-[var(--foreground)] sm:text-lg">
          {item.title}
        </h3>
        <p className="text-sm leading-6 text-[var(--muted)] sm:text-[15px] sm:leading-7">
          {item.whatHappened}
        </p>
        {sourcePills.length ? (
          <div className="flex flex-wrap gap-2">
            {sourcePills.map((keyword) => (
              <span
                key={keyword}
                className="inline-flex max-w-full items-center rounded-full border border-[var(--line)] bg-white/70 px-2.5 py-1 text-xs font-semibold text-[var(--muted)] break-words"
              >
                {keyword}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
