import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  COMPREHENSION_LAST_SHOWN_KEY,
  COMPREHENSION_SESSION_COUNT_KEY,
  COMPREHENSION_SESSION_COUNTED_KEY,
  ComprehensionSelfReport,
} from "@/components/mvp-measurement/ComprehensionSelfReport";

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

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

describe("ComprehensionSelfReport", () => {
  beforeEach(() => {
    installStorage("localStorage");
    installStorage("sessionStorage");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 202 })),
    );
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not render on the very first ever session", () => {
    render(<ComprehensionSelfReport briefingDate="2026-05-01" delayMs={1000} />);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.queryByTestId("comprehension-self-report")).toBeNull();
    expect(window.localStorage.getItem(COMPREHENSION_SESSION_COUNT_KEY)).toBe("1");
    expect(window.sessionStorage.getItem(COMPREHENSION_SESSION_COUNTED_KEY)).toBe("1");
  });

  it("renders the prompt on the second session after the delay and persists the last-shown timestamp", () => {
    window.localStorage.setItem(COMPREHENSION_SESSION_COUNT_KEY, "1");
    const now = vi.fn(() => 1_700_000_000_000);

    render(
      <ComprehensionSelfReport
        briefingDate="2026-05-01"
        delayMs={1000}
        now={now}
      />,
    );

    expect(screen.queryByTestId("comprehension-self-report")).toBeNull();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByTestId("comprehension-self-report")).toBeInTheDocument();
    expect(window.localStorage.getItem(COMPREHENSION_LAST_SHOWN_KEY)).toBe(
      String(1_700_000_000_000),
    );
  });

  it("respects the 7-day frequency cap and does not show again", () => {
    window.localStorage.setItem(COMPREHENSION_SESSION_COUNT_KEY, "5");
    const nowMs = 1_700_000_000_000;
    window.localStorage.setItem(
      COMPREHENSION_LAST_SHOWN_KEY,
      String(nowMs - (SEVEN_DAYS_MS - 60_000)),
    );

    render(
      <ComprehensionSelfReport
        briefingDate="2026-05-01"
        delayMs={1000}
        now={() => nowMs}
      />,
    );

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.queryByTestId("comprehension-self-report")).toBeNull();
  });

  it("renders again after the cap has elapsed", () => {
    window.localStorage.setItem(COMPREHENSION_SESSION_COUNT_KEY, "5");
    const nowMs = 1_700_000_000_000;
    window.localStorage.setItem(
      COMPREHENSION_LAST_SHOWN_KEY,
      String(nowMs - (SEVEN_DAYS_MS + 60_000)),
    );

    render(
      <ComprehensionSelfReport
        briefingDate="2026-05-01"
        delayMs={1000}
        now={() => nowMs}
      />,
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByTestId("comprehension-self-report")).toBeInTheDocument();
  });

  it("emits a comprehension_self_report event with metadata when answered", () => {
    window.localStorage.setItem(COMPREHENSION_SESSION_COUNT_KEY, "1");
    window.localStorage.setItem(
      "bootup:mvp-measurement:visitor-id",
      "mvp_test_visitor",
    );
    window.sessionStorage.setItem(
      "bootup:mvp-measurement:session-id",
      "mvp_session_test_session",
    );

    render(
      <ComprehensionSelfReport
        briefingDate="2026-05-01"
        delayMs={1000}
        now={() => 1_700_000_000_000}
      />,
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    fireEvent.click(screen.getByTestId("comprehension-self-report-agree"));

    const fetchMock = vi.mocked(fetch);
    const call = fetchMock.mock.calls.find(([url]) =>
      String(url).startsWith("/api/mvp-measurement/events"),
    );
    expect(call).toBeDefined();
    const payload = JSON.parse(String(call?.[1]?.body));
    expect(payload).toMatchObject({
      eventName: "comprehension_self_report",
      briefingDate: "2026-05-01",
      metadata: {
        response: "agree",
        briefingDate: "2026-05-01",
      },
    });
  });

  it("hides on dismiss without emitting an event", () => {
    window.localStorage.setItem(COMPREHENSION_SESSION_COUNT_KEY, "1");

    render(
      <ComprehensionSelfReport
        briefingDate="2026-05-01"
        delayMs={1000}
        now={() => 1_700_000_000_000}
      />,
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    fireEvent.click(screen.getByTestId("comprehension-self-report-dismiss"));

    expect(screen.queryByTestId("comprehension-self-report")).toBeNull();
    const fetchMock = vi.mocked(fetch);
    const matching = fetchMock.mock.calls.filter(([url, init]) => {
      if (!String(url).startsWith("/api/mvp-measurement/events")) {
        return false;
      }
      const body = init?.body ? JSON.parse(String(init.body)) : null;
      return body?.eventName === "comprehension_self_report";
    });
    expect(matching).toHaveLength(0);
  });
});
