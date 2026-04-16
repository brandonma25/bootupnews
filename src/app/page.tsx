import LandingHomepage from "@/components/landing/homepage";
import { getDashboardPageState } from "@/lib/data";
import { isHomepageDebugConfigured } from "@/lib/env";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function Page({ searchParams }: PageProps) {
  const [{ data, viewer }, resolvedSearchParams] = await Promise.all([
    getDashboardPageState("/"),
    searchParams ? searchParams : Promise.resolve(undefined),
  ]);
  const authState = readSingleParam(resolvedSearchParams?.auth);
  const debugParam = readSingleParam(resolvedSearchParams?.debug);
  const debugEnabled = isHomepageDebugConfigured || /^(1|true|yes|on)$/i.test(debugParam ?? "");

  return (
    <LandingHomepage
      data={data}
      viewer={viewer}
      authState={authState}
      debugEnabled={debugEnabled}
    />
  );
}
