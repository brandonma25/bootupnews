import type { HomepageCategoryKey } from "@/lib/homepage-taxonomy";

export const CATEGORY_NAVIGATION_LABELS: Record<HomepageCategoryKey, string> = {
  tech: "Technology",
  finance: "Finance",
  politics: "Politics",
};

export function getCategoryNavigationLabel(categoryKey: HomepageCategoryKey) {
  return CATEGORY_NAVIGATION_LABELS[categoryKey];
}
