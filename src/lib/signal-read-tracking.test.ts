import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  SIGNAL_READ_DWELL_MS,
  __resetSignalReadStateForTests,
  __setSignalReadClock,
  hasSignalReadFiredThisSession,
  registerSignalReadObserver,
  subscribeToSignalRead,
} from "@/lib/signal-read-tracking";

type ObserverCallback = (
  entries: IntersectionObserverEntry[],
  observer: IntersectionObserver,
) => void;

class StubIntersectionObserver {
  static instances: StubIntersectionObserver[] = [];
  callback: ObserverCallback;
  target: Element | null = null;
  disconnected = false;

  constructor(callback: ObserverCallback) {
    this.callback = callback;
    StubIntersectionObserver.instances.push(this);
  }

  observe(target: Element) {
    this.target = target;
  }

  disconnect() {
    this.disconnected = true;
  }

  unobserve() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  fire(intersectionRatio: number) {
    if (!this.target) return;
    this.callback(
      [
        {
          isIntersecting: intersectionRatio > 0,
          intersectionRatio,
          target: this.target,
          time: 0,
          rootBounds: null,
          boundingClientRect: this.target.getBoundingClientRect(),
          intersectionRect: this.target.getBoundingClientRect(),
        } as IntersectionObserverEntry,
      ],
      this as unknown as IntersectionObserver,
    );
  }
}

function installStorage(name: "localStorage" | "sessionStorage") {
  const storage = new Map<string, string>();
  Object.defineProperty(window, name, {
    configurable: true,
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
      clear: () => storage.clear(),
    },
  });
}

const SIGNAL_POST_ID = "3156ce1e-d052-4f88-af1b-4630f78e1104";

function makeTracking(overrides: Partial<{ signalPostId: string; signalRank: number }> = {}) {
  return {
    route: "/",
    surface: "home_top_event",
    signalPostId: overrides.signalPostId ?? SIGNAL_POST_ID,
    signalSlug: "Test Signal",
    signalRank: overrides.signalRank ?? 1,
    briefingDate: "2026-05-01",
  };
}

describe("signal-read-tracking", () => {
  beforeEach(() => {
    installStorage("localStorage");
    installStorage("sessionStorage");
    StubIntersectionObserver.instances = [];
    vi.stubGlobal("IntersectionObserver", StubIntersectionObserver);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 202 })),
    );
    vi.useFakeTimers();
  });

  afterEach(() => {
    __resetSignalReadStateForTests();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function readEmittedReads(): Array<Record<string, unknown>> {
    const fetchMock = vi.mocked(fetch);
    return fetchMock.mock.calls
      .map(([url, init]) => {
        if (!String(url).startsWith("/api/mvp-measurement/events")) return null;
        return init?.body ? JSON.parse(String(init.body)) : null;
      })
      .filter((payload) => payload?.eventName === "signal_read") as Array<
      Record<string, unknown>
    >;
  }

  it("fires signal_read once after ≥20s dwell AND at least one scroll while visible", () => {
    let clock = 1_700_000_000_000;
    __setSignalReadClock(() => clock);

    const element = document.createElement("article");
    document.body.appendChild(element);

    registerSignalReadObserver(element, makeTracking());

    const observer = StubIntersectionObserver.instances[0]!;
    // Card becomes visible.
    observer.fire(0.6);

    // No scroll yet — advance past dwell threshold.
    clock += SIGNAL_READ_DWELL_MS + 100;
    act(() => vi.advanceTimersByTime(SIGNAL_READ_DWELL_MS + 100));

    // Dwell met but no scroll yet → no emission.
    expect(readEmittedReads()).toHaveLength(0);

    // Now a scroll happens while the card is still visible.
    act(() => window.dispatchEvent(new Event("scroll")));

    const reads = readEmittedReads();
    expect(reads).toHaveLength(1);
    expect(reads[0]).toMatchObject({
      eventName: "signal_read",
      signalPostId: SIGNAL_POST_ID,
      metadata: {
        signalRank: 1,
      },
    });
    expect(typeof (reads[0]!.metadata as Record<string, unknown>).dwellMs).toBe("number");
  });

  it("does not fire before dwell completes even if scroll already happened", () => {
    let clock = 1_700_000_000_000;
    __setSignalReadClock(() => clock);

    const element = document.createElement("article");
    document.body.appendChild(element);
    registerSignalReadObserver(element, makeTracking());

    const observer = StubIntersectionObserver.instances[0]!;
    observer.fire(0.6);

    // Scroll fires immediately — but dwell timer hasn't elapsed yet.
    act(() => window.dispatchEvent(new Event("scroll")));
    expect(readEmittedReads()).toHaveLength(0);

    // Advance partially — still not enough.
    clock += SIGNAL_READ_DWELL_MS - 1000;
    act(() => vi.advanceTimersByTime(SIGNAL_READ_DWELL_MS - 1000));
    expect(readEmittedReads()).toHaveLength(0);

    // Complete dwell — now it should fire.
    clock += 1500;
    act(() => vi.advanceTimersByTime(1500));
    expect(readEmittedReads()).toHaveLength(1);
  });

  it("resets the dwell timer when the card drops below 50% visibility", () => {
    let clock = 1_700_000_000_000;
    __setSignalReadClock(() => clock);

    const element = document.createElement("article");
    document.body.appendChild(element);
    registerSignalReadObserver(element, makeTracking());

    const observer = StubIntersectionObserver.instances[0]!;
    observer.fire(0.6);

    // Halfway through dwell, card drops.
    clock += SIGNAL_READ_DWELL_MS / 2;
    act(() => vi.advanceTimersByTime(SIGNAL_READ_DWELL_MS / 2));
    observer.fire(0.2);

    // Scroll now does nothing because card is not visible.
    act(() => window.dispatchEvent(new Event("scroll")));
    expect(readEmittedReads()).toHaveLength(0);

    // Card comes back into view — timer must restart from 0.
    observer.fire(0.7);
    clock += SIGNAL_READ_DWELL_MS / 2 + 100;
    act(() => vi.advanceTimersByTime(SIGNAL_READ_DWELL_MS / 2 + 100));

    // Not yet 20s of continuous dwell.
    expect(readEmittedReads()).toHaveLength(0);

    // Complete a full 20s in the new continuous window.
    clock += SIGNAL_READ_DWELL_MS;
    act(() => vi.advanceTimersByTime(SIGNAL_READ_DWELL_MS));

    // Now a scroll while visible should fire emission.
    act(() => window.dispatchEvent(new Event("scroll")));
    expect(readEmittedReads()).toHaveLength(1);
  });

  it("fires at most once per signal per session", () => {
    let clock = 1_700_000_000_000;
    __setSignalReadClock(() => clock);

    const element = document.createElement("article");
    document.body.appendChild(element);
    registerSignalReadObserver(element, makeTracking());

    const observer = StubIntersectionObserver.instances[0]!;
    observer.fire(0.6);
    clock += SIGNAL_READ_DWELL_MS + 100;
    act(() => vi.advanceTimersByTime(SIGNAL_READ_DWELL_MS + 100));
    act(() => window.dispatchEvent(new Event("scroll")));
    expect(readEmittedReads()).toHaveLength(1);

    // Subsequent intersection + scroll cycles must not re-emit.
    observer.fire(0.7);
    clock += SIGNAL_READ_DWELL_MS + 100;
    act(() => vi.advanceTimersByTime(SIGNAL_READ_DWELL_MS + 100));
    act(() => window.dispatchEvent(new Event("scroll")));
    expect(readEmittedReads()).toHaveLength(1);
  });

  it("invokes subscribers when the first signal_read of the session fires", () => {
    let clock = 1_700_000_000_000;
    __setSignalReadClock(() => clock);

    const listener = vi.fn();
    subscribeToSignalRead(listener);

    const element = document.createElement("article");
    document.body.appendChild(element);
    registerSignalReadObserver(element, makeTracking());

    const observer = StubIntersectionObserver.instances[0]!;
    observer.fire(0.6);
    clock += SIGNAL_READ_DWELL_MS + 100;
    act(() => vi.advanceTimersByTime(SIGNAL_READ_DWELL_MS + 100));
    act(() => window.dispatchEvent(new Event("scroll")));

    expect(listener).toHaveBeenCalledTimes(1);
    expect(hasSignalReadFiredThisSession()).toBe(true);
  });
});

function act(fn: () => void) {
  fn();
}
