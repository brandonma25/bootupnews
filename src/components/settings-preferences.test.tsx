import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { SettingsPreferences } from "@/components/settings-preferences";

describe("SettingsPreferences", () => {
  beforeEach(() => {
    const storage = new Map<string, string>();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
        clear: () => storage.clear(),
      },
    });
  });

  it("shows unsaved changes clearly and saves them to browser storage", () => {
    render(
      <SettingsPreferences
        defaultEmail="analyst@example.com"
        availableTopics={[
          { id: "tech", label: "Tech" },
          { id: "finance", label: "Finance" },
        ]}
        suggestedEntities={["Nvidia"]}
        signedIn
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /track tech/i }));

    expect(screen.getByText(/profile details/i)).toBeInTheDocument();
    expect(screen.getByText(/delivery cadence/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/display name/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /daily digest emails/i })).not.toBeInTheDocument();
    expect(screen.getAllByText(/changes not saved yet/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/save to apply these changes on this browser/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /save preferences/i }));

    expect(screen.getAllByText(/saved on this browser/i).length).toBeGreaterThan(0);
    const stored = window.localStorage.getItem("daily-intel-preferences");
    expect(stored).toContain('"profile"');
    expect(stored).toContain('"savedAt"');
    expect(stored).toContain('"Tech"');
  });
});
