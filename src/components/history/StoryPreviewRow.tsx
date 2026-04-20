type StoryPreviewRowProps = {
  title: string;
};

export function StoryPreviewRow({ title }: StoryPreviewRowProps) {
  return (
    <div className="flex w-full items-start gap-3 rounded-xl px-3 py-2 transition-colors lg:hover:bg-[var(--warm)]">
      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--muted)]" aria-hidden="true" />
      <p className="text-sm font-medium leading-6 text-[var(--foreground)]">{title}</p>
    </div>
  );
}
