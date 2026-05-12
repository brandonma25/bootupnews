import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN?.trim();
const sentryBuildPluginEnabled = Boolean(sentryAuthToken);

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/technology",
        destination: "/",
        permanent: false,
      },
      {
        source: "/economics",
        destination: "/",
        permanent: false,
      },
      {
        source: "/politics",
        destination: "/",
        permanent: false,
      },
    ];
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
