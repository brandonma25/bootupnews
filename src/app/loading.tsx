export default function Loading() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-[1280px] px-4 pb-16 pt-6 sm:px-6 lg:px-8 lg:pb-24">
      <div className="rounded-card border border-[var(--border)] bg-[var(--card)] p-8">
        <p className="text-sm font-medium text-[var(--text-secondary)]">Setting up your feed (10–20 seconds)...</p>
        <div className="skeleton-line h-4 w-40" />
        <div className="skeleton-card mt-4 h-12 max-w-2xl" />
        <div className="skeleton-line mt-4 h-6 max-w-xl" />
      </div>

      <div className="mt-10 space-y-10">
        <LoadingSection />
        <LoadingSection />
        <LoadingSection />
      </div>
    </main>
  );
}

function LoadingSection() {
  return (
    <section className="space-y-4">
      <div className="skeleton-line h-4 w-24" />
      <div className="skeleton-line h-8 w-56" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="rounded-card border border-[var(--border)] bg-[var(--card)] p-5"
          >
            <div className="skeleton-line h-4 w-24" />
            <div className="skeleton-card mt-4 h-8" />
            <div className="skeleton-card mt-3 h-20" />
            <div className="skeleton-card mt-4 h-24" />
          </div>
        ))}
      </div>
    </section>
  );
}
