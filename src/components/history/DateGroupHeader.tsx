import Link from "next/link";

type DateGroupHeaderProps = {
  date: string;
  briefingDate: string;
};

function formatDateLabel(value: string) {
  const parsedDate = new Date(`${value}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(parsedDate);
}

export function DateGroupHeader({ date, briefingDate }: DateGroupHeaderProps) {
  const dateLabel = formatDateLabel(date);

  return (
    <div className="flex w-full items-center justify-between gap-4 border-b border-[var(--line)] pb-3">
      <h2 className="text-base font-medium text-[var(--foreground)]">{dateLabel}</h2>
      <Link
        href={`/briefing/${encodeURIComponent(briefingDate)}`}
        className="shrink-0 text-sm font-medium text-[var(--foreground)] underline-offset-4 lg:hover:underline"
      >
        Open full briefing
      </Link>
    </div>
  );
}
