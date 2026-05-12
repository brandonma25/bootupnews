import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("renders disabled primary buttons with neutral disabled styling", () => {
    render(
      <Button type="button" disabled>
        Publish Final Slate
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Publish Final Slate" });

    expect(button).toBeDisabled();
    expect(button.className).toContain("disabled:bg-[var(--bu-border-default)]");
    expect(button.className).toContain("disabled:!text-[var(--bu-text-tertiary)]");
    expect(button.className).toContain("disabled:opacity-100");
  });

  it("keeps enabled primary buttons styled as active actions", () => {
    render(<Button type="button">Publish Final Slate</Button>);

    const button = screen.getByRole("button", { name: "Publish Final Slate" });

    expect(button).toBeEnabled();
    expect(button.className).toContain("bg-[var(--bu-accent)]");
    expect(button.className).toContain("text-[var(--bu-accent-on)]");
  });
});
