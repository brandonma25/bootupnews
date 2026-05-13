import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ApproveAllButton } from "@/app/dashboard/signals/editorial-review/ApproveAllButton";

describe("ApproveAllButton", () => {
  it("renders with the WITM-passed label and is enabled when eligible candidates exist", () => {
    render(<ApproveAllButton disabled={false} />);

    const button = screen.getByRole("button", { name: /Approve all WITM-passed/i });
    expect(button).toBeEnabled();
    expect(button).toHaveTextContent("Approve all WITM-passed");
  });

  it("is disabled and surfaces the provided reason as a tooltip", () => {
    render(
      <ApproveAllButton
        disabled
        disabledReason="No WITM-passed candidates assigned to slots"
      />,
    );

    const button = screen.getByTestId("bulk-approve-submit");
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("title", "No WITM-passed candidates assigned to slots");
    expect(button).toHaveAttribute(
      "aria-label",
      "Approve all WITM-passed — No WITM-passed candidates assigned to slots",
    );
  });

  it("omits the tooltip when no reason is provided", () => {
    render(<ApproveAllButton disabled />);

    const button = screen.getByTestId("bulk-approve-submit");
    expect(button).toBeDisabled();
    expect(button).not.toHaveAttribute("title");
  });
});
