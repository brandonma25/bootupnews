import { describe, expect, it, vi } from "vitest";

import {
  flushAllPendingAutosaves,
  flushPendingAutosave,
  registerAutosaveFlusher,
} from "@/lib/editorial-autosave-coordinator";

describe("editorial autosave coordinator", () => {
  it("flushes a registered card's pending autosave", async () => {
    const flush = vi.fn().mockResolvedValue(undefined);
    const unregister = registerAutosaveFlusher("post-1", flush);

    await flushPendingAutosave("post-1");

    expect(flush).toHaveBeenCalledTimes(1);
    unregister();
  });

  it("is a no-op for an unregistered card", async () => {
    await expect(flushPendingAutosave("never-registered")).resolves.toBeUndefined();
  });

  it("unregister removes the flusher so later flushes are no-ops", async () => {
    const flush = vi.fn().mockResolvedValue(undefined);
    const unregister = registerAutosaveFlusher("post-2", flush);

    unregister();
    await flushPendingAutosave("post-2");

    expect(flush).not.toHaveBeenCalled();
  });

  it("flushAllPendingAutosaves drains every registered flusher", async () => {
    const a = vi.fn().mockResolvedValue(undefined);
    const b = vi.fn().mockResolvedValue(undefined);
    const unregisterA = registerAutosaveFlusher("all-a", a);
    const unregisterB = registerAutosaveFlusher("all-b", b);

    await flushAllPendingAutosaves();

    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
    unregisterA();
    unregisterB();
  });

  it("re-registering the same id replaces the prior flusher", async () => {
    const first = vi.fn().mockResolvedValue(undefined);
    const second = vi.fn().mockResolvedValue(undefined);
    registerAutosaveFlusher("post-3", first);
    const unregister = registerAutosaveFlusher("post-3", second);

    await flushPendingAutosave("post-3");

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    unregister();
  });
});
