import * as Sentry from "@sentry/nextjs";

import {
  readSentryDsn,
  readSentryEnvironment,
  readSentryRelease,
  readSentryReplaysOnErrorSampleRate,
  readSentryReplaysSessionSampleRate,
  readSentryTracesSampleRate,
  sanitizeBreadcrumb,
  sanitizeSentryEvent,
} from "@/lib/sentry-config";

const dsn = readSentryDsn("client");

if (dsn) {
  Sentry.init({
    dsn,
    environment: readSentryEnvironment(),
    release: readSentryRelease(),
    sendDefaultPii: false,
    tracesSampleRate: readSentryTracesSampleRate(),
    enableLogs: true,
    maxBreadcrumbs: 50,
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        maskAllInputs: true,
        blockAllMedia: true,
      }),
    ],
    replaysSessionSampleRate: readSentryReplaysSessionSampleRate(),
    replaysOnErrorSampleRate: readSentryReplaysOnErrorSampleRate(),
    beforeSend(event) {
      return sanitizeSentryEvent(event);
    },
    beforeBreadcrumb(breadcrumb) {
      return sanitizeBreadcrumb(breadcrumb);
    },
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
