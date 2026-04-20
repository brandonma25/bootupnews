import { Skeleton } from "@/components/ui/skeleton";

export function HistoryLoadingState() {
  return (
    <div className="w-full space-y-6" aria-busy="true" aria-label="Loading briefing history">
      {Array.from({ length: 2 }).map((_, groupIndex) => (
        <div key={groupIndex} className="w-full space-y-4 rounded-2xl border border-[var(--line)] p-4">
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-28" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        </div>
      ))}
    </div>
  );
}
