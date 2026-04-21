"use client";

import { Checkbox } from "@/components/ui/checkbox";

export type AccountCategoryKey = "tech" | "finance" | "politics";

type CategoryPreferenceCheckboxesProps = {
  saved: AccountCategoryKey[];
  current: AccountCategoryKey[];
  onChange: (updated: AccountCategoryKey[]) => void;
  disabled: boolean;
};

const CATEGORY_OPTIONS: { key: AccountCategoryKey; label: string }[] = [
  { key: "tech", label: "Tech News" },
  { key: "finance", label: "Finance" },
  { key: "politics", label: "Politics" },
];

function normalizeCategories(categories: AccountCategoryKey[]) {
  return CATEGORY_OPTIONS.map((option) => option.key).filter((key) => categories.includes(key));
}

export function CategoryPreferenceCheckboxes({
  saved,
  current,
  onChange,
  disabled,
}: CategoryPreferenceCheckboxesProps) {
  const defaultCategories = CATEGORY_OPTIONS.map((option) => option.key);
  const savedCategories = saved.length > 0 ? normalizeCategories(saved) : defaultCategories;
  const currentCategories =
    current.length > 0 ? normalizeCategories(current) : saved.length > 0 ? [] : savedCategories;

  function updateCategory(category: AccountCategoryKey, checked: boolean) {
    const nextCategories = checked
      ? [...currentCategories, category]
      : currentCategories.filter((currentCategory) => currentCategory !== category);

    onChange(normalizeCategories(nextCategories));
  }

  return (
    <fieldset className="w-full space-y-3" disabled={disabled}>
      {CATEGORY_OPTIONS.map((option) => {
        const checked = currentCategories.includes(option.key);

        return (
          <label
            key={option.key}
            className="flex items-center gap-3 rounded-card border border-[var(--line)] p-3 text-sm font-medium text-[var(--foreground)]"
          >
            <Checkbox
              aria-label={option.label}
              checked={checked}
              disabled={disabled}
              onCheckedChange={(nextChecked) => updateCategory(option.key, nextChecked)}
            />
            {option.label}
          </label>
        );
      })}
    </fieldset>
  );
}
