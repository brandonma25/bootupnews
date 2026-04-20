"use client";

type Props = {
  onGetStarted: () => void;
};

export default function HeroSection({ onGetStarted }: Props) {
  return (
    <section className="flex flex-col items-center justify-center text-center px-6 py-24">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-4 text-xl font-semibold tracking-normal text-[var(--text-primary)] md:text-2xl">
          Understand the news in 10 minutes, not 60.
        </h1>

        <p className="mx-auto mb-8 max-w-2xl text-base text-[var(--text-secondary)]">
          We scan global events, connect the dots, and explain what actually matters.
        </p>

        <button
          type="button"
          onClick={onGetStarted}
          className="inline-flex items-center justify-center rounded-button bg-[var(--accent)] px-6 py-3 text-sm font-medium text-white transition-colors duration-150 hover:bg-[var(--accent-hover)]"
        >
          Get Started
        </button>
      </div>
    </section>
  );
}
