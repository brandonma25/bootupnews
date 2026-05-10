import type { MetadataRoute } from "next";

import { buildPublicAppUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: buildPublicAppUrl("/sitemap.xml"),
  };
}
