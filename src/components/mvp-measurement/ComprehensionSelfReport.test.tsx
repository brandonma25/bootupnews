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

function setLocationSearch(search: string) {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...window.location, search },
  });
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const SIGNAL_READ_SESSION_FIRED_KEY = "bootup:mvp-measurement:signal-read-fired";

function markSignalReadFiredInSession() {
  window.sessionStorage.setItem(SIGNAL_READ_SESSION_FIRED_KEY, "1");
}

describe("ComprehensionSelfReport", () => {
  beforeEach(() => {
    installStorage("localStorage");
    installStorage("sessionStorage");
    setLocationSearch("");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 202 })),
    );
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not render on the very first ever session (first_session suppression)", () => {
    markSignalReadFiredInSession();

    render(
      <ComprehensionSelfReport
        briefingDate="2026-05-01"
        inactivityMs={1000}
        now={() => 1_700_000_000_000}
      />,
    );

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.queryByTestId("comprehension-self-report")).toBeNull();
    expect(window.localStorage.getItem(COMPREHENSION_SESSION_COUNT_KEY)).toBe("1");
    expect(window.sessionStorage.getItem(COMPREHENSION_SESSION_COUNTED_KEY)).toBe("1");
  });

  it("does not render without at least one signal_read in the current session (no_signal_read)", () => {
    window.localStorage.setItem(COMPREHENSION_SESSION_COUNT_KEY, "3");

    render(
      <ComprehensionSelfReport
        briefingDate="2026-05-01"
        inactivityMs={1000}
        now={() => 1_700_000_000_000}
      />,
    );

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.queryByTestId("comprehension-self-report")).toBeNull();
  });

  it("respects the 7-day frequency cap (cap_active)", () => {
    window.localStorage.setItem(COMPREHENSION_SESSION_COUNT_KEY, "5");
    markSignalReadFiredInSession();
    const nowMs = 1_700_000_000_000;
    window.localStorage.setItem(
      COMPREHENSION_LAST_SHOWN_KEY,
      String(nowMs - (SEVEN_DAYS_MS - 60_000)),
    );

    render(
      <ComprehensionSelfReport
        briefingDate="2026-05-01"
        inactivityMs={1000}
        now={() => nowMs}
      />,
    );

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.queryByTestId("comprehension-self-report")).toBeNull();
  });

  it("renders again after the 7-day cap has elapsed", () => {
    window.localStorage.setItem(COMPREHENSION_SESSION_COUNT_KEY, "5");
    markSignalReadFiredInSession();
    const nowMs = 1_700_000_000_000;
    window.localStorage.setItem(
      COMPREHENSION_LAST_SHOWN_KEY,
      String(nowMs - (SEVEN_DAYS_MS + 60_000)),
    );

    render(
      <ComprehensionSelfReport
        briefingDate="2026-05-01"
        inactivityMs={1000}
        now={() => nowMs}
      />,
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByTestId("comprehension-self-report")).toBeInTheDocument();
  });

  it("shows after the inactivity timeout once a signal_read has fired", () => {
    window.localStorage.setItem(COMPREHENSION_SESSION_COUNT_KEY, "3");
    markSignalReadFiredInSession();

    render(
      <ComprehensionSelfReport
        briefingDate="2026-05-01"
        inactivityMs={1000}
        now={() => 1_700_000_000_000}
      />,
    );

    expect(screen.queryByTestId("comprehension-self-report")).toBeNull();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByTestId("comprehension-self-report")).toBeInTheDocument();
  });

  it("shows on exit-intent (mouseout with clientY <= 0)", () => {
    window.localStorage.setItem(COMPREHENSION_SESSION_COUNT_KEY, "3");
    markSignalReadFiredInSession();

    render(
      <ComprehensionSelfReport
        briefingDate="2026-05-01"
        inactivityMs={60_000}
        now={() => 1_700_000_000_000}
      />,
    );

    act(() => {
      fireEvent(document, new MouseEvent("mouseout", { clientY: 0 }));
    });

    expect(screen.getByTestId("comprehension-self-report")).toBeInTheDocument();
  });

  it("shows on visibilitychange to hidden (mobile fallback)", () => {
    window.localStorage.setItem(COMPREHENSION_SESSION_COUNT_KEY, "3");
    markSignalReadFiredInSession();

    render(
      <ComprehensionSelfReport
        briefingDate="2026-05-01"
        inactivityMs={60_000}
        now={() => 1_700_000_000_000}
      />,
    );

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(screen.getByTestId("comprehension-self-report")).toBeInTheDocument();
  });

  it("emits comprehension_self_report and trips the 7-day cap when answered", () => {
    window.localStorage.setItem(COMPREHENSION_SESSION_COUNT_KEY, "3");
    markSignalReadFiredInSession();
    const nowMs = 1_700_000_000_000;

    render(
      <ComprehensionSelfReport
        briefingDate="2026-05-01"
        inactivityMs={1000}
        now={() => nowMs}
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
    expect(window.localStorage.getItem(COMPREHENSION_LAST_SHOWN_KEY)).toBe(String(nowMs));
  });

  it("hides on dismiss without emitting an event AND without tripping the cap", () => {
    window.localStorage.setItem(COMPREHENSION_SESSION_COUNT_KEY, "3");
    markSignalReadFiredInSession();

    render(
      <ComprehensionSelfReport
        briefingDate="2026-05-01"
        inactivityMs={1000}
        now={() => 1_700_000_000_000}
      />,
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    fireEvent.click(screen.getByTestId("comprehension-self-report-dismiss"));

    expect(screen.queryByTestId("comprehension-self-report")).toBeNull();

    const fetchMock = vi.mocked(fetch);
    const surveyCalls = fetchMock.mock.calls.filter(([url, init]) => {
      if (!String(url).startsWith("/api/mvp-measurement/events")) return false;
      const body = init?.body ? JSON.parse(String(init.body)) : null;
      return body?.eventName === "comprehension_self_report";
    });
    expect(surveyCalls).toHaveLength(0);
    expect(window.localStorage.getItem(COMPREHENSION_LAST_SHOWN_KEY)).toBeNull();
  });

  it("?mvp_survey_debug=1 bypasses first-session AND cap but NOT the signal_read gate", () => {
    setLocationSearch("?mvp_survey_debug=1");
    const nowMs = 1_700_000_000_000;
    // Cap active AND no signal_read in session.
    window.localStorage.setItem(COMPREHENSION_LAST_SHOWN_KEY, String(nowMs - 60_000));

    const info = vi.fn();
    render(
      <ComprehensionSelfReport
        briefingDate="2026-05-01"
        inactivityMs={1000}
        now={() => nowMs}
        logger={{ info }}
      />,
    );

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.queryByTestId("comprehension-self-report")).toBeNull();
    expect(info).toHaveBeenCalledWith(
      "[comprehension-self-report] suppressed: no_signal_read",
    );
  });

  it("?mvp_survey_debug=1 shows the prompt as soon as a signal_read fires, even on first session and within cap", () => {
    setLocationSearch("?mvp_survey_debug=1");
    markSignalReadFiredInSession();
    const nowMs = 1_700_000_000_000;
    window.localStorage.setItem(COMPREHENSION_LAST_SHOWN_KEY, String(nowMs - 60_000));

    render(
      <ComprehensionSelfReport
        briefingDate="2026-05-01"
        inactivityMs={1000}
        now={() => nowMs}
      />,
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByTestId("comprehension-self-report")).toBeInTheDocument();
  });
});
