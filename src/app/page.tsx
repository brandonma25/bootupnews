import LandingHomepage from "@/components/landing/homepage";
import { getHomepagePageState } from "@/lib/data";
import { isHomepageDebugConfigured } from "@/lib/env";
import { applyHomepageEditorialOverridesToDashboardData } from "@/lib/homepage-editorial-overrides";
import { buildHomepageViewModel } from "@/lib/homepage-model";
import { formatHomeBriefingDateLabel } from "@/lib/utils";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function Page({ searchParams }: PageProps) {
  // Keep homepage SSR on persisted read models only. Do not route this page
  // through the ingestion pipeline or feed parser import chain.
  const [pageState, resolvedSearchParams] = await Promise.all([
    getHomepagePageState("/"),
    searchParams ? searchParams : Promise.resolve(undefined),
  ]);
  const data = await applyHomepageEditorialOverridesToDashboardData(pageState.data);
  const authState = readSingleParam(resolvedSearchParams?.auth);
  const debugParam = readSingleParam(resolvedSearchParams?.debug);
  const debugEnabled = isHomepageDebugConfigured || /^(1|true|yes|on)$/i.test(debugParam ?? "");
  const briefingDateLabel = formatHomeBriefingDateLabel(data.briefing.briefingDate);
  const homepageViewModel = buildHomepageViewModel(data);

  return (
    <LandingHomepage
      data={data}
      viewer={pageState.viewer}
      authState={authState}
      debugEnabled={debugEnabled}
      briefingDateLabel={briefingDateLabel}
      homepageViewModel={homepageViewModel}
    />
  );
}
