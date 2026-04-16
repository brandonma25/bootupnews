export default function Loading() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-[1280px] animate-pulse px-4 pb-16 pt-6 sm:px-6 lg:px-8 lg:pb-24">
      <div className="rounded-[32px] border border-[rgba(19,26,34,0.08)] bg-white/60 p-8">
        <p className="text-sm font-medium text-[var(--muted)]">Setting up your feed (10–20 seconds)...</p>
        <div className="h-4 w-40 rounded-full bg-[rgba(19,26,34,0.08)]" />
        <div className="mt-4 h-12 max-w-2xl rounded-[20px] bg-[rgba(19,26,34,0.08)]" />
        <div className="mt-4 h-6 max-w-xl rounded-full bg-[rgba(19,26,34,0.06)]" />
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
      <div className="h-4 w-24 rounded-full bg-[rgba(19,26,34,0.08)]" />
      <div className="h-8 w-56 rounded-full bg-[rgba(19,26,34,0.08)]" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="rounded-[28px] border border-[rgba(19,26,34,0.08)] bg-white/55 p-5"
          >
            <div className="h-4 w-24 rounded-full bg-[rgba(19,26,34,0.08)]" />
            <div className="mt-4 h-8 rounded-[18px] bg-[rgba(19,26,34,0.08)]" />
            <div className="mt-3 h-20 rounded-[18px] bg-[rgba(19,26,34,0.06)]" />
            <div className="mt-4 h-24 rounded-[18px] bg-[rgba(19,26,34,0.06)]" />
          </div>
        ))}
      </div>
    </section>
  );
}
