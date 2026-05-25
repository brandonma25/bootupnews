"use client";

import { useState } from "react";

import { ComprehensionSelfReport } from "@/components/mvp-measurement/ComprehensionSelfReport";
import { SignalCard, type SignalCardSignal } from "@/components/signals/SignalCard";

const HARNESS_BRIEFING_DATE = "2026-05-25";

const MOCK_SIGNALS: ReadonlyArray<{
  signal: SignalCardSignal;
  defaultExpanded: boolean;
  note: string;
}> = [
  {
    signal: {
      id: "11111111-1111-4111-8111-111111111111",
      title: "Mock signal 1 — full three-layer card (tall, requires scroll)",
      publishedWhyItMatters:
        "The Signal layer carries the editorial interpretation of the development. " +
        "It is meant to be substantial enough that a reader has to slow down. " +
        "We pad it intentionally here so the card is taller than the viewport-edge area, " +
        "which forces the reader to scroll the page to reach the lower layers. " +
        "Without that scroll the dev harness cannot observe the scroll-while-visible requirement. " +
        "Imagine the kind of paragraph an editor would write to ground a structural shift in context: " +
        "what changed, what the change is structurally rather than topically, and why the reader should " +
        "treat it as a signal rather than a headline. That's the role of this layer. " +
        "We avoid news-of-the-day rhetoric here and lean on durable framing.",
      publishedWhatLedToIt:
        "Before This sets up the prior structural state that the signal emerged from. " +
        "It is causal, not topical: not 'last week's headline' but 'the prior condition the " +
        "system was in before this shift'. A few sentences of background framing is enough to " +
        "make the signal legible without burying the reader in source material. " +
        "Here we just expand the body so the foldback layer takes vertical space.",
      publishedWhatItConnectsTo:
        "The Ripple sketches the downstream trajectory: which adjacent systems become more or less " +
        "stable, which constraints tighten, which decisions become harder to defer. " +
        "Again it is structural rather than predictive — we are not forecasting, we are mapping " +
        "the topology around the signal. A few paragraphs of trajectory framing fills out the card.",
      sourceName: "Harness mock source A",
    },
    defaultExpanded: true,
    note: "Tall — used for the 20s dwell timer and the scroll-away / scroll-back reset.",
  },
  {
    signal: {
      id: "22222222-2222-4222-8222-222222222222",
      title: "Mock signal 2 — second tall card (for per-signal dedupe)",
      publishedWhyItMatters:
        "This second card exists so the user can scroll between two distinct signals and confirm " +
        "that dwell + scroll-while-visible is evaluated independently per signal. " +
        "Its content is intentionally the same shape as signal 1 — three populated editorial layers " +
        "padded out to require scrolling. The structural ranking and depth instrumentation should " +
        "treat this card as a separate row in mvp_measurement_events with a different signalPostId.",
      publishedWhatLedToIt:
        "The prior condition for this mock signal is whatever you imagine — the harness does not care. " +
        "The point of this layer existing is to make the card tall enough that the reader has to " +
        "scroll past signal 1 to view it, and then scroll back to test the dedupe rule.",
      publishedWhatItConnectsTo:
        "The trajectory here, again, is just enough copy to fill the layer. Imagine downstream " +
        "constraints tightening: that's the role of this section in the real product, and the " +
        "vertical space it occupies in the harness is what matters for dwell measurement.",
      sourceName: "Harness mock source B",
    },
    defaultExpanded: true,
    note: "Tall — used to verify signal_read fires per signal, not per page.",
  },
  {
    signal: {
      id: "33333333-3333-4333-8333-333333333333",
      title: "Mock signal 3 — short card (no scroll needed)",
      publishedWhyItMatters: "Short body — fits on screen without scrolling.",
      sourceName: "Harness mock source C",
    },
    defaultExpanded: false,
    note: "Short — used to verify no-scroll → no signal_read even if visible >20s.",
  },
];

const SESSION_KEYS_CLEARED_ON_RESET = [
  "bootup:mvp-measurement:session-id",
  "bootup:mvp-measurement:session-counted",
  "bootup:mvp-measurement:signal-read-fired",
  "bootup:mvp-measurement:signal-read:11111111-1111-4111-8111-111111111111",
  "bootup:mvp-measurement:signal-read:22222222-2222-4222-8222-222222222222",
  "bootup:mvp-measurement:signal-read:33333333-3333-4333-8333-333333333333",
];

const LOCAL_KEYS_CLEARED_ON_RESET = [
  "bootup:mvp-measurement:comprehension-last-shown",
  "bootup:mvp-measurement:session-count",
];

function readPersistedCohortLabel(): string {
  if (typeof window === "undefined") {
    return "(server render)";
  }
  const persisted = window.localStorage.getItem("bootup:mvp-measurement:cohort");
  return persisted ?? "(unset — defaults to internal on first event)";
}

export function MvpHarnessClient() {
  const [resetTick, setResetTick] = useState(0);

  // resetTick is read here so the label refreshes after a reset click;
  // without the reference, React would skip recomputing on a same-render
  // run after sessionStorage was cleared.
  void resetTick;
  const cohortLabel = readPersistedCohortLabel();

  function handleResetSession() {
    if (typeof window === "undefined") return;
    for (const key of SESSION_KEYS_CLEARED_ON_RESET) {
      try {
        window.sessionStorage.removeItem(key);
      } catch {
        // ignore
      }
    }
    setResetTick((value) => value + 1);
    console.info("[mvp-harness] session reset — signal_read can fire again");
  }

  function handleResetVisitor() {
    if (typeof window === "undefined") return;
    for (const key of LOCAL_KEYS_CLEARED_ON_RESET) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // ignore
      }
    }
    handleResetSession();
    console.info(
      "[mvp-harness] visitor reset — session counter + 7-day cap timestamp cleared",
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <header className="mb-8 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-semibold">/dev/mvp-harness — manual QA harness (dev only)</p>
        <p className="mt-2">
          Open DevTools → Console. Each behavior below maps to a console.info line.
        </p>
        <ol className="mt-3 list-decimal space-y-1 pl-5">
          <li>
            <b>Continuous dwell:</b> sit on signal 1, ≥50% visible for 20s, then scroll
            once. Expect{" "}
            <code>[mvp-measurement] signal_read &#123; signalId: 11…, scrolled: true &#125;</code>.
            Scroll signal 1 out before 20s — no event. Scroll back, dwell 20s, scroll —
            event fires (fresh continuous window).
          </li>
          <li>
            <b>No scroll, no read:</b> stay on signal 3 (short) — it fits on screen so no
            scroll happens. After 30s of dwell, expect <i>nothing</i> for signal 3.
          </li>
          <li>
            <b>Per-signal dedupe:</b> dwell signal 1 → emits once. Scroll to signal 2,
            dwell, scroll — signal 2 emits. Scroll back to signal 1, dwell, scroll —
            signal 1 does <i>not</i> re-emit. Click <code>Reset session</code> below and
            re-dwell signal 1 — it emits again in the new session.
          </li>
          <li>
            <b>Survey gate:</b> reload with{" "}
            <code>?mvp_survey_debug=1</code>. Before any signal_read: expect{" "}
            <code>[comprehension-self-report] suppressed: no_signal_read</code>. After
            one signal_read: stop interacting for 45s OR move the mouse to the very top
            edge (exit-intent) OR switch tabs (visibilitychange) — the survey appears.
            Click Agree/Disagree → expect{" "}
            <code>[mvp-measurement] comprehension_self_report &#123; response, cohort &#125;</code>.
          </li>
        </ol>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleResetSession}
            className="rounded border border-amber-600 px-3 py-1 text-xs font-medium hover:bg-amber-100"
          >
            Reset session (sessionStorage)
          </button>
          <button
            type="button"
            onClick={handleResetVisitor}
            className="rounded border border-amber-700 px-3 py-1 text-xs font-medium hover:bg-amber-100"
          >
            Reset visitor (session + 7-day cap + session counter)
          </button>
          <span className="text-xs text-amber-800">
            Persisted cohort: <code>{cohortLabel}</code>
          </span>
        </div>
        <p className="mt-3 text-xs">
          Cohort entry: add <code>?mvp_qa=1</code>, <code>?c=tester</code>, or{" "}
          <code>?c=internal</code> to the URL once; cohort persists in{" "}
          <code>localStorage</code> after that.
        </p>
      </header>

      <div className="space-y-4">
        {MOCK_SIGNALS.map(({ signal, defaultExpanded, note }, index) => (
          <div key={`${resetTick}-${signal.id}`} className="space-y-1">
            <p className="text-xs text-gray-500">{note}</p>
            <SignalCard
              signal={signal}
              rank={index + 1}
              tier="core"
              defaultExpanded={defaultExpanded}
              mvpDwellTracking={{
                route: "/dev/mvp-harness",
                surface: "dev_mvp_harness",
                signalPostId: signal.id,
                signalSlug: signal.title,
                signalRank: index + 1,
                briefingDate: HARNESS_BRIEFING_DATE,
              }}
            />
          </div>
        ))}
      </div>

      {/* Bottom spacer so signal 3 can be fully on screen while signal 1/2 are
          scrolled out — needed for behaviors 1 and 3. */}
      <div className="h-[60vh]" />

      <ComprehensionSelfReport
        key={`survey-${resetTick}`}
        briefingDate={HARNESS_BRIEFING_DATE}
      />
    </div>
  );
}
