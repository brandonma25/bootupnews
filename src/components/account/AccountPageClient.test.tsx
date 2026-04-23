import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AccountPageClient } from "@/components/account/AccountPageClient";

vi.mock("@/app/actions", () => ({
  addAccountFeedAction: vi.fn(),
  removeAccountFeedAction: vi.fn(),
  saveAccountCategoryPreferencesAction: vi.fn(),
  setNewsletterPreferenceAction: vi.fn(),
  signOutAction: vi.fn(),
}));

const viewer = {
  id: "user-1",
  email: "brandonma25@gmail.com",
  displayName: "Brandon",
  initials: "B",
  avatarUrl: null,
};

const preferences = {
  categories: ["tech", "finance", "politics"] as const,
  newsletterEnabled: false,
  storageReady: true,
  storageMessage: null,
};

describe("AccountPageClient admin entry point", () => {
  it("shows the editorial review entry point for admins", () => {
    render(
      <AccountPageClient
        viewer={viewer}
        sources={[]}
        preferences={preferences}
        isAdmin
      />,
    );

    const link = screen.getByRole("link", { name: "Editorial Review" });

    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/dashboard/signals/editorial-review");
  });

  it("hides the editorial review entry point for non-admins", () => {
    render(
      <AccountPageClient
        viewer={viewer}
        sources={[]}
        preferences={preferences}
        isAdmin={false}
      />,
    );

    expect(screen.queryByRole("link", { name: "Editorial Review" })).not.toBeInTheDocument();
  });
});
