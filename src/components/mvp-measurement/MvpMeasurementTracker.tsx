"use client";

import { useEffect, useRef } from "react";

import type { MvpMeasurementEventInput } from "@/lib/mvp-measurement";
import {
  readMvpMeasurementDataset,
  trackMvpMeasurementEvent,
} from "@/lib/mvp-measurement-client";

type PageViewEvent = Omit<MvpMeasurementEventInput, "visitorId" | "sessionId">;

export function MvpMeasurementTracker({
  pageView,
}: {
  pageView: PageViewEvent;
}) {
  const trackedPageView = useRef(false);

  useEffect(() => {
    if (!trackedPageView.current) {
      trackedPageView.current = true;
      void trackMvpMeasurementEvent(pageView);
    }
  }, [pageView]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target instanceof Element ? event.target : null;
      const element = target?.closest("[data-mvp-measurement-event]");

      if (!(element instanceof HTMLElement)) {
        return;
      }

      const measurementEvent = readMvpMeasurementDataset(element);
      if (!measurementEvent) {
        return;
      }

      void trackMvpMeasurementEvent({
        ...measurementEvent,
        route: measurementEvent.route ?? pageView.route,
        briefingDate: measurementEvent.briefingDate ?? pageView.briefingDate,
        publishedSlateId: measurementEvent.publishedSlateId ?? pageView.publishedSlateId,
      });
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [pageView]);

  return null;
}
