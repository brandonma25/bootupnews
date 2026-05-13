import type { Metadata } from "next";

import { renderHomepageCategoryPage } from "@/app/category-page";

export const metadata: Metadata = {
  title: "Bootup News — Finance",
};

export default function EconomicsPage() {
  return renderHomepageCategoryPage({
    category: "finance",
    path: "/economics",
  });
}
