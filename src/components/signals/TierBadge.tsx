import { cn } from "@/lib/utils";

export type SignalTier = "core" | "context";

type TierBadgeProps = {
  tier: SignalTier;
  rank: number;
  accented?: boolean;
  className?: string;
};

export function TierBadge({ tier, rank, accented = true, className }: TierBadgeProps) {
  const isCore = tier === "core";
  const showCoreAccent = isCore && accented;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span
        aria-hidden="true"
        className={cn(
          "block h-[14px] w-[3px] rounded-full",
          showCoreAccent ? "bg-[var(--bu-accent)]" : "bg-[var(--bu-border-default)]",
        )}
      />
      <span
        className={cn(
          "font-sans text-[var(--bu-size-micro)] font-medium uppercase leading-none tracking-[0.12em]",
          showCoreAccent ? "text-[var(--bu-accent)]" : "text-[var(--bu-text-tertiary)]",
        )}
      >
        {isCore ? "Core signal" : "Context"} · {String(rank).padStart(2, "0")}
      </span>
    </div>
  );
}
