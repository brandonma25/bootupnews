import type { Metadata } from "next";

import LandingHomepage from "@/components/landing/homepage";
import { getHomepagePageState } from "@/lib/data";
import { isAdminUser } from "@/lib/admin-auth";
import { buildPublicAppUrl, getPublicAppOrigin, isHomepageDebugConfigured } from "@/lib/env";
import { applyHomepageEditorialOverridesToDashboardData } from "@/lib/homepage-editorial-overrides";
import { buildHomepageViewModel } from "@/lib/homepage-model";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const homepageUrl = buildPublicAppUrl("/");

export const metadata: Metadata = {
  title: "Bootup News — Today's signals",
  metadataBase: new URL(getPublicAppOrigin()),
  alternates: {
    canonical: homepageUrl,
  },
  openGraph: {
    url: homepageUrl,
  },
  other: {
    "twitter:url": homepageUrl,
  },
};

export default async function Page({ searchParams }: PageProps) {
  // Keep homepage SSR on persisted read models only. Do not route this page
  // through the ingestion pipeline or feed parser import chain.
  const [pageState, resolvedSearchParams] = await Promise.all([
    getHomepagePageState("/"),
    searchParams ? searchParams : Promise.resolve(undefined),
  ]);
  const data = await applyHomepageEditorialOverridesToDashboardData(pageState.data);
  const rawAuthState = readSingleParam(resolvedSearchParams?.auth);
  // If the user is already authenticated, suppress the callback-error — this
  // happens when Safari replays the OAuth redirect chain after a successful
  // session exchange, causing a duplicate "State has already been used" error
  // that lands back on the homepage with ?auth=callback-error.
  const authState = pageState.viewer && rawAuthState === "callback-error" ? undefined : rawAuthState;
  const debugParam = readSingleParam(resolvedSearchParams?.debug);
  const debugEnabled = isHomepageDebugConfigured || /^(1|true|yes|on)$/i.test(debugParam ?? "");
  const homepageViewModel = buildHomepageViewModel(data, null, { includeCategoryTabEvents: false });
  const homepageClientViewModel = {
    ...homepageViewModel,
    developingNowEvents: [],
    categoryPreviewEvents: {
      tech: [],
      finance: [],
      politics: [],
    },
    trending: [],
    earlySignals: [],
  };
  const homepageClientData = {
    mode: data.mode,
    briefing: {
      briefingDate: data.briefing.briefingDate,
    },
    homepageFreshnessNotice: data.homepageFreshnessNotice,
    publicRankedSignalCount: data.publicRankedItems?.length ?? homepageViewModel.debug.rankedEventsCount,
  };

  return (
    <LandingHomepage
      data={homepageClientData}
      viewer={pageState.viewer}
      isAdmin={isAdminUser({ email: pageState.viewer?.email ?? undefined })}
      authState={authState}
      debugEnabled={debugEnabled}
      homepageViewModel={homepageClientViewModel}
    />
  );
}
