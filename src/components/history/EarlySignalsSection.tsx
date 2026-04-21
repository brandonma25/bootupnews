type EarlySignalsSectionProps = {
  items: { title: string }[];
};

export function EarlySignalsSection({ items }: EarlySignalsSectionProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="w-full space-y-3 rounded-card border border-[var(--line)] bg-[var(--card)] p-4">
      <h3 className="section-label">
        Early signals
      </h3>
      <div className="space-y-1">
        {items.map((item, index) => (
          <div key={`${item.title}-${index}`} className="flex items-start gap-3 py-1">
            <span
              className="mt-2 h-1.5 w-1.5 shrink-0 rounded-button bg-[var(--line-strong)]"
              aria-hidden="true"
            />
            <p className="text-sm font-medium leading-6 text-[var(--foreground)]">{item.title}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
