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
    <div className="flex flex-col gap-6 rounded-[32px] border border-[var(--line)] bg-[var(--surface)] p-6 md:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-4">
          <Badge>{eyebrow}</Badge>
          <div className="space-y-3">
            <h1 className="display-font text-4xl leading-none tracking-tight text-[var(--foreground)] md:text-5xl">
              {title}
            </h1>
            <p className="max-w-2xl text-base leading-7 text-[var(--muted)]">{description}</p>
          </div>
        </div>
        {aside ? <div>{aside}</div> : null}
      </div>
    </div>
  );
}
