import * as Sentry from "@sentry/nextjs";

import {
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
      return sanitizeSentryEvent(event);
    },
    beforeBreadcrumb(breadcrumb) {
      return sanitizeBreadcrumb(breadcrumb);
    },
  });
}
