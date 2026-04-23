import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ApproveAllButton } from "@/app/dashboard/signals/editorial-review/ApproveAllButton";

describe("ApproveAllButton", () => {
  it("copies current eligible textarea values into the bulk approval form", () => {
    render(
      <div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
          }}
        >
          <div data-approve-all-fields hidden />
          <ApproveAllButton disabled={false} />
        </form>
        <textarea data-approve-all-post-id="signal-1" defaultValue="Edited value 1" />
        <textarea data-approve-all-post-id="signal-2" defaultValue="Edited value 2" />
        <textarea defaultValue="Not eligible" />
      </div>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Approve All" }));

    const postIds = screen
      .getByRole("button", { name: "Approve All" })
      .form?.querySelectorAll<HTMLInputElement>('input[name="postId"]');
    const editedValues = screen
      .getByRole("button", { name: "Approve All" })
      .form?.querySelectorAll<HTMLInputElement>('input[name="editedWhyItMatters"]');

    expect(Array.from(postIds ?? []).map((input) => input.value)).toEqual([
      "signal-1",
      "signal-2",
    ]);
    expect(Array.from(editedValues ?? []).map((input) => input.value)).toEqual([
      "Edited value 1",
      "Edited value 2",
    ]);
  });
});
