import type { ReactNode } from "react";
import { LoaderCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { cn } from "@/lib/utils";

export function DashboardStatePanel({
  title,
  description,
  tone = "neutral",
  loading = false,
  meta,
}: {
  title: string;
  description: string;
  tone?: "neutral" | "accent";
  loading?: boolean;
  meta?: ReactNode;
}) {
  return (
    <Panel className="overflow-hidden p-0">
      <div
        className={cn(
          "relative px-6 py-8 md:px-8 md:py-10",
          tone === "accent"
            ? "bg-[radial-gradient(circle_at_top_left,rgba(31,79,70,0.14),transparent_48%),linear-gradient(180deg,rgba(255,255,255,0.94),rgba(244,247,245,0.92))]"
            : "bg-[radial-gradient(circle_at_top_left,rgba(19,26,34,0.08),transparent_44%),linear-gradient(180deg,rgba(255,255,255,0.94),rgba(247,248,249,0.92))]",
        )}
      >
        <div className="flex max-w-2xl flex-col gap-4">
          <Badge className={tone === "accent" ? "text-[var(--accent)]" : ""}>
            {loading ? "Live refresh in progress" : "Dashboard state"}
          </Badge>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {loading ? (
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(31,79,70,0.16)] bg-white/80 text-[var(--accent)]">
                  <LoaderCircle className="h-5 w-5 animate-spin" />
                </span>
              ) : null}
              <h2 className="display-font text-3xl leading-tight text-[var(--foreground)] md:text-4xl">
                {title}
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-[var(--muted)] md:text-base">
              {description}
            </p>
          </div>
          {meta ? <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--muted)]">{meta}</div> : null}
        </div>
      </div>
    </Panel>
  );
}
