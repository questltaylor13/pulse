import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BROWSE_CONFIGS, isValidBrowseCategory } from "@/lib/browse/browse-configs";
import { filtersFromParams } from "@/lib/browse/filters";
import { fetchBrowse } from "@/lib/browse/fetch-browse";
import BrowseMapPage from "@/components/browse/BrowseMapPage";

interface PageProps {
  params: Promise<{ category: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category } = await params;
  if (!isValidBrowseCategory(category)) {
    return { title: "Not Found | Pulse" };
  }
  const config = BROWSE_CONFIGS[category];
  return { title: `${config.title} Map | Pulse` };
}

export default async function BrowseMapRoute({ params, searchParams }: PageProps) {
  const { category } = await params;
  const sp = await searchParams;

  if (!isValidBrowseCategory(category)) {
    notFound();
  }

  const config = BROWSE_CONFIGS[category];
  const urlParams = new URLSearchParams();
  for (const [key, val] of Object.entries(sp)) {
    if (typeof val === "string") urlParams.set(key, val);
    else if (Array.isArray(val)) val.forEach((v) => urlParams.append(key, v));
  }
  const filters = filtersFromParams(urlParams);
  const { items } = await fetchBrowse(config, filters);

  return <BrowseMapPage config={config} items={items} />;
}
