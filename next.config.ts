import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN?.trim();
const sentryBuildPluginEnabled = Boolean(sentryAuthToken);

const nextConfig: NextConfig = {
  typescript: {
    // Next 16.3 type-checks the full tsconfig `include` set at build time.
    // Point it at the build config so the *.test.* fixture backlog stays
    // excluded, matching the `typecheck` production gate.
    tsconfigPath: "tsconfig.build.json",
  },
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
