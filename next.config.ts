import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN?.trim();
const sentryBuildPluginEnabled = Boolean(sentryAuthToken);

// Dev-only routes use the `.dev.tsx` extension. In production they are
// excluded from `pageExtensions`, so Next.js never registers them as
// routes and Webpack does not compile them into the production bundle.
// See `src/app/dev/mvp-harness/page.dev.tsx` (PRD-68 manual QA harness).
const isProductionBuild = process.env.NODE_ENV === "production";
const pageExtensions = isProductionBuild
  ? ["tsx", "ts", "jsx", "js"]
  : ["dev.tsx", "dev.ts", "tsx", "ts", "jsx", "js"];

const nextConfig: NextConfig = {
  pageExtensions,
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: sentryAuthToken,
  silent: !process.env.CI || !sentryBuildPluginEnabled,
  sourcemaps: {
    disable: !sentryBuildPluginEnabled,
  },
  webpack: {
    unstable_sentryWebpackPluginOptions: {
      // Release creation and sourcemap upload require SENTRY_AUTH_TOKEN, which
      // may intentionally be absent in preview builds.
      disable: !sentryBuildPluginEnabled,
    },
    treeshake: {
      removeDebugLogging: true,
    },
  },
});
