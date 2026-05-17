import * as Sentry from "@sentry/nextjs";

import {
  isFilteredRssNoiseEvent,
  readSentryDsn,
  readSentryEnvironment,
  readSentryRelease,
  readSentryTracesSampleRate,
  sanitizeBreadcrumb,
  sanitizeSentryEvent,
} from "@/lib/sentry-config";

const dsn = readSentryDsn("server");

if (dsn) {
  Sentry.init({
    dsn,
    environment: readSentryEnvironment(),
    release: readSentryRelease(),
    sendDefaultPii: false,
    tracesSampleRate: readSentryTracesSampleRate(),
    enableLogs: true,
    maxBreadcrumbs: 50,
    beforeSend(event) {
      // PRD-65 Phase 4.5 — drop post-retry-exhaustion RSS feed events.
      // These are now tracked in the Notion Source Health Log instead.
      if (isFilteredRssNoiseEvent(event)) {
        return null;
      }
      return sanitizeSentryEvent(event);
    },
    beforeBreadcrumb(breadcrumb) {
      return sanitizeBreadcrumb(breadcrumb);
    },
  });
}
