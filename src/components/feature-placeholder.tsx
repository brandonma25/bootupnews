import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";

type FeaturePlaceholderProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  note: string;
  compact?: boolean;
};

export function FeaturePlaceholder({
  icon: Icon,
  title,
  description,
  note,
  compact = false,
}: FeaturePlaceholderProps) {
  return (
    <div
      className={`rounded-card border border-dashed border-[var(--border)] bg-[var(--panel)]/55 ${
        compact ? "p-4" : "p-5"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-card bg-[var(--warm)]">
          <Icon className="h-4 w-4 text-[var(--text-secondary)]" />
        </span>
        <Badge>Coming soon</Badge>
      </div>
      <h3 className="mt-3 text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
      <p className="mt-1.5 text-xs text-[var(--text-secondary)]">{description}</p>
      <p className="mt-3 rounded-card border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs text-[var(--text-primary)]">
        {note}
      </p>
    </div>
  );
}
