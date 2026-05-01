import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MvpMeasurementTracker } from "@/components/mvp-measurement/MvpMeasurementTracker";

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

describe("MvpMeasurementTracker", () => {
  beforeEach(() => {
    installStorage("localStorage");
    installStorage("sessionStorage");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ ok: true, stored: true }), { status: 202 })),
    );
  });

  it("emits a homepage view event with anonymous visitor and session identifiers", async () => {
    render(
      <MvpMeasurementTracker
        pageView={{
          eventName: "homepage_view",
          route: "/",
          surface: "home",
          briefingDate: "2026-05-01",
          metadata: {
            visibleSignalCount: 5,
          },
        }}
      />,
    );

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
    const payload = JSON.parse(String(init?.body));

    expect(payload).toMatchObject({
      eventName: "homepage_view",
      route: "/",
      surface: "home",
      briefingDate: "2026-05-01",
      metadata: {
        visibleSignalCount: 5,
      },
    });
    expect(payload.visitorId).toMatch(/^mvp_/);
    expect(payload.sessionId).toMatch(/^mvp_session_/);
  });

  it("emits source click events from instrumented links", async () => {
    render(
      <>
        <MvpMeasurementTracker
          pageView={{
            eventName: "signals_page_view",
            route: "/signals",
            surface: "signals_index",
            briefingDate: "2026-05-01",
          }}
        />
        <a
          href="https://example.com"
          data-mvp-measurement-event="source_click"
          data-mvp-route="/signals"
          data-mvp-surface="signals_published_slate"
          data-mvp-signal-post-id="3156ce1e-d052-4f88-af1b-4630f78e1104"
          data-mvp-signal-rank="7"
          data-mvp-source-name="Example"
        >
          Source
        </a>
      </>,
    );

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("link", { name: "Source" }));

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[1]!;
    const payload = JSON.parse(String(init?.body));

    expect(payload).toMatchObject({
      eventName: "source_click",
      route: "/signals",
      surface: "signals_published_slate",
      signalPostId: "3156ce1e-d052-4f88-af1b-4630f78e1104",
      signalRank: 7,
      briefingDate: "2026-05-01",
      metadata: {
        sourceName: "Example",
        linkText: "Source",
      },
    });
  });
});
