import type { MetadataRoute } from "next";

import { buildPublicAppUrl } from "@/lib/env";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: buildPublicAppUrl("/"),
      changeFrequency: "daily",
      priority: 1,
    },
  ];
}
