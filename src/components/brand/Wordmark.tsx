import { cn } from "@/lib/utils";

type WordmarkProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClassName: Record<NonNullable<WordmarkProps["size"]>, string> = {
  sm: "text-[18px]",
  md: "text-[var(--bu-size-wordmark)]",
  lg: "text-[28px]",
};

export function Wordmark({ size = "md", className }: WordmarkProps) {
  return (
    <span
      className={cn(
        "font-heading font-medium leading-none tracking-[-0.01em] text-[var(--bu-text-primary)]",
        sizeClassName[size],
        className,
      )}
    >
      Bootup News
    </span>
  );
}
