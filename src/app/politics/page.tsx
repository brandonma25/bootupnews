import type { Metadata } from "next";

import { renderHomepageCategoryPage } from "@/app/category-page";

export const metadata: Metadata = {
  title: "Bootup News — Politics",
};

export default function PoliticsPage() {
  return renderHomepageCategoryPage({
    category: "politics",
    path: "/politics",
  });
}
