import type { Metadata } from "next";

import { renderHomepageCategoryPage } from "@/app/category-page";

export const metadata: Metadata = {
  title: "Boot Up — Tech",
};

export default function TechnologyPage() {
  return renderHomepageCategoryPage({
    category: "tech",
    path: "/technology",
  });
}
