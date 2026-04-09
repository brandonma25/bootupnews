import { Badge } from "@/components/ui/badge";

export function PageHeader({
  eyebrow,
  title,
  description,
  aside,
}: {
  eyebrow: string;
  title: string;
  description: string;
  aside?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-[32px] border border-[var(--line)] bg-[var(--surface)] p-5 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-3">
          <Badge>{eyebrow}</Badge>
          <div className="space-y-2">
            <h1 className="display-font text-2xl leading-tight tracking-tight text-[var(--foreground)] md:text-3xl">
              {title}
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-[var(--muted)]">{description}</p>
          </div>
        </div>
        {aside ? <div className="shrink-0">{aside}</div> : null}
      </div>
    </div>
  );
}
