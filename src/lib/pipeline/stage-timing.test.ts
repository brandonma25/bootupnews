import { describe, expect, it } from "vitest";

import { StageTimer } from "@/lib/pipeline/stage-timing";

describe("StageTimer", () => {
  it("records per-stage ms and a wall-clock total", () => {
    let clock = 1000;
    const timer = new StageTimer(() => clock); // overallStart = 1000
    timer.start("a");
    clock = 1100;
    timer.end("a"); // 100
    timer.start("b");
    clock = 1350;
    timer.end("b"); // 250
    clock = 1500;

    const snap = timer.snapshot();
    expect(snap.a).toBe(100);
    expect(snap.b).toBe(250);
    expect(snap.total).toBe(500); // 1500 - 1000
  });

  it("time() records ms even when the stage throws", async () => {
    let clock = 0;
    const timer = new StageTimer(() => clock);
    await expect(
      timer.time("x", async () => {
        clock = 42;
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect(timer.snapshot().x).toBe(42);
  });

  it("markSkipped records N/A, never 0 (anti-false-success)", () => {
    const timer = new StageTimer(() => 0);
    timer.markSkipped("newsletter");
    expect(timer.snapshot().newsletter).toBe("N/A");
    // A skipped stage must NOT read as a fast 0ms stage.
    expect(timer.snapshot().newsletter).not.toBe(0);
  });
});
