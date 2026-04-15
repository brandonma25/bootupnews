import LandingHomepage from "@/components/landing/homepage";
import { getDashboardData, getViewerAccount } from "@/lib/data";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function Page({ searchParams }: PageProps) {
  const [data, viewer] = await Promise.all([getDashboardData(), getViewerAccount()]);
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const authState = readSingleParam(resolvedSearchParams?.auth);

  return <LandingHomepage data={data} viewer={viewer} authState={authState} />;
}
