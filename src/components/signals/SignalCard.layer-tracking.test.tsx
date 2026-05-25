import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SignalCard } from "@/components/signals/SignalCard";

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

type ObserverCallback = (
  entries: IntersectionObserverEntry[],
  observer: IntersectionObserver,
) => void;

class StubIntersectionObserver {
  static instances: StubIntersectionObserver[] = [];
  callback: ObserverCallback;
  observedTargets: Element[] = [];
  disconnected = false;

  constructor(callback: ObserverCallback) {
    this.callback = callback;
    StubIntersectionObserver.instances.push(this);
  }

  observe(element: Element) {
    this.observedTargets.push(element);
  }

  disconnect() {
    this.disconnected = true;
  }

  unobserve() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  trigger(isIntersecting: boolean) {
    const target = this.observedTargets[0];
    if (!target) return;
    this.callback(
      [
        {
          isIntersecting,
          target,
          time: 0,
          rootBounds: null,
          boundingClientRect: target.getBoundingClientRect(),
          intersectionRatio: isIntersecting ? 1 : 0,
          intersectionRect: target.getBoundingClientRect(),
        } as IntersectionObserverEntry,
      ],
      this as unknown as IntersectionObserver,
    );
  }
}

const SIGNAL_POST_ID = "3156ce1e-d052-4f88-af1b-4630f78e1104";

describe("SignalCard layer tracking", () => {
  beforeEach(() => {
    installStorage("localStorage");
    installStorage("sessionStorage");
    StubIntersectionObserver.instances = [];
    vi.stubGlobal("IntersectionObserver", StubIntersectionObserver);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 202 })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("emits signal_layer_open per layer and flags allFourOpened on the final layer", async () => {
    render(
      <SignalCard
        signal={{
          id: SIGNAL_POST_ID,
          title: "Test Signal",
          publishedWhyItMatters: "The signal body.",
          publishedWhatLedToIt: "Before this body.",
          publishedWhatItConnectsTo: "The ripple body.",
        }}
        defaultExpanded
        mvpLayerTracking={{
          route: "/",
          surface: "home_top_event",
          signalPostId: SIGNAL_POST_ID,
          signalRank: 1,
          briefingDate: "2026-05-01",
        }}
      />,
    );

    expect(screen.getByTestId("signal-card")).toBeInTheDocument();

    // Four observers should be registered: card root + 3 foldback layers.
    expect(StubIntersectionObserver.instances).toHaveLength(4);

    for (const observer of StubIntersectionObserver.instances) {
      observer.trigger(true);
      await Promise.resolve();
    }

    const fetchMock = vi.mocked(fetch);
    const layerEvents = fetchMock.mock.calls
      .map(([, init]) => (init?.body ? JSON.parse(String(init.body)) : null))
      .filter((payload) => payload?.eventName === "signal_layer_open");

    expect(layerEvents).toHaveLength(4);

    const layers = layerEvents.map((event) => event.metadata.layer);
    expect(new Set(layers)).toEqual(
      new Set(["what_happened", "why_it_matters", "what_led_to_this", "what_it_connects_to"]),
    );

    const allFourFlags = layerEvents.map((event) => event.metadata.allFourOpened);
    expect(allFourFlags.filter(Boolean)).toHaveLength(1);
    expect(allFourFlags[allFourFlags.length - 1]).toBe(true);
  });

  it("does not re-emit a layer that was already opened in this session", async () => {
    window.sessionStorage.setItem(
      `bootup:mvp-measurement:layers:${SIGNAL_POST_ID}`,
      JSON.stringify(["what_happened"]),
    );

    render(
      <SignalCard
        signal={{
          id: SIGNAL_POST_ID,
          title: "Test Signal",
          publishedWhyItMatters: "Body",
        }}
        defaultExpanded={false}
        mvpLayerTracking={{
          route: "/",
          surface: "home_top_event",
          signalPostId: SIGNAL_POST_ID,
          signalRank: 1,
          briefingDate: "2026-05-01",
        }}
      />,
    );

    // The card root layer is already in sessionStorage, so its observer
    // should never register or fire.
    expect(StubIntersectionObserver.instances).toHaveLength(0);
  });
});
