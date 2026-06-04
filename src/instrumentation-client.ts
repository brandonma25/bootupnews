import * as Sentry from "@sentry/nextjs";

import { initializePostHogClient } from "@/lib/posthog-client";
import {
  readSentryDsn,
  readSentryEnvironment,
  readSentryRelease,
  readSentryReplaysOnErrorSampleRate,
  readSentryReplaysSessionSampleRate,
  readSentryTracesSampleRate,
  sanitizeBreadcrumb,
  sanitizeSentryEvent,
  scheduleDeferredSentryReplay,
} from "@/lib/sentry-config";

const dsn = readSentryDsn("client");

if (dsn) {
  // Sentry CORE initializes synchronously so error/exception/trace capture is
  // active from the very first moment of page load. The heavy Session Replay
  // integration is intentionally NOT listed here — it previously ran inside the
  // render-blocking window before First Contentful Paint. Replay is now attached
  // after first paint via scheduleDeferredSentryReplay(). See
  // src/lib/sentry-replay.ts. [perf: defer-sentry]
  Sentry.init({
    dsn,
    environment: readSentryEnvironment(),
    release: readSentryRelease(),
    sendDefaultPii: false,
    tracesSampleRate: readSentryTracesSampleRate(),
    enableLogs: true,
    maxBreadcrumbs: 50,
    replaysSessionSampleRate: readSentryReplaysSessionSampleRate(),
    replaysOnErrorSampleRate: readSentryReplaysOnErrorSampleRate(),
    beforeSend(event) {
      return sanitizeSentryEvent(event);
    },
    beforeBreadcrumb(breadcrumb) {
      return sanitizeBreadcrumb(breadcrumb);
    },
  });

  // Attach Session Replay after first paint instead of synchronously, keeping
  // its instantiation + recording start out of the FCP/LCP window.
  scheduleDeferredSentryReplay(() => {
    Sentry.addIntegration(
      Sentry.replayIntegration({
        maskAllText: true,
        maskAllInputs: true,
        blockAllMedia: true,
      }),
    );
  });
}

window.setTimeout(() => {
  initializePostHogClient();
}, 3000);

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
