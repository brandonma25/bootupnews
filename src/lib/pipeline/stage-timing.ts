/**
 * Shared per-stage timing util (Track 2 — full-pipeline dry-run harness PART 2).
 *
 * ONE timing primitive used by BOTH the dry-run harness AND the live cron route
 * (the live-route emission may land in the timeout bundle, but the util is
 * defined here once and reused — never duplicated).
 *
 * Monotonic by default (performance.now()), injectable for tests. Records each
 * stage's elapsed ms and a wall-clock `total` from timer creation to snapshot.
 *
 * IMPORTANT (scope boundary): this measures RELATIVE stage cost in whatever
 * environment it runs. A local node process has NO 60s ceiling, so a green
 * local `total` does NOT certify the run fits Vercel's 60s wall — that needs a
 * deployed test. This util tells you WHICH stage is slow, not whether prod fits.
 */

export type StageMs = Record<string, number | "N/A"> & { total: number };

type NowFn = () => number;

export class StageTimer {
  private readonly now: NowFn;
  private readonly overallStart: number;
  private readonly starts = new Map<string, number>();
  private readonly durations = new Map<string, number | "N/A">();

  constructor(now?: NowFn) {
    this.now = now ?? (() => performance.now());
    this.overallStart = this.now();
  }

  start(stage: string): void {
    this.starts.set(stage, this.now());
  }

  end(stage: string): number {
    const startedAt = this.starts.get(stage);
    if (startedAt === undefined) return 0;
    const ms = Math.round(this.now() - startedAt);
    this.durations.set(stage, ms);
    return ms;
  }

  /** Time an async stage; records its ms even if it throws. */
  async time<T>(stage: string, fn: () => Promise<T>): Promise<T> {
    this.start(stage);
    try {
      return await fn();
    } finally {
      this.end(stage);
    }
  }

  /**
   * Mark a stage that did NOT run against a real dependency (skipped). Records
   * "N/A" rather than 0 — a skipped stage must never read as a fast/successful
   * 0ms stage (the anti-false-success rule).
   */
  markSkipped(stage: string): void {
    this.durations.set(stage, "N/A");
  }

  /** Snapshot of all recorded stage ms + wall-clock total. */
  snapshot(): StageMs {
    const out = {} as StageMs;
    for (const [stage, ms] of this.durations) out[stage] = ms;
    out.total = Math.round(this.now() - this.overallStart);
    return out;
  }

  /** Compact one-line render, e.g. "sweep=12 newsletter=N/A rss=8420 staging=910 total=9342". */
  format(): string {
    const snap = this.snapshot();
    return Object.entries(snap)
      .map(([stage, ms]) => `${stage}=${ms}`)
      .join(" ");
  }
}
