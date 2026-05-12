import { cn } from "@/lib/utils";

type DateBadgeProps = {
  date: Date;
  className?: string;
};

const formatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export function DateBadge({ date, className }: DateBadgeProps) {
  const parts = formatter.formatToParts(date);
  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  const year = parts.find((part) => part.type === "year")?.value ?? "";

  return (
    <p
      className={cn(
        "font-sans text-[var(--bu-size-ui)] font-normal leading-6 text-[var(--bu-text-secondary)]",
        className,
      )}
    >
      <span className="inline-block border-b-2 border-[var(--bu-accent)] pb-0.5 text-[var(--bu-text-primary)]">
        {weekday}
      </span>
      {month && day && year ? `, ${month} ${day}, ${year}` : ""}
    </p>
  );
}
