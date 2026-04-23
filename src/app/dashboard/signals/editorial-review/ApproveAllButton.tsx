"use client";

import type { MouseEvent } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

export function ApproveAllButton({
  disabled,
}: {
  disabled: boolean;
}) {
  const { pending } = useFormStatus();

  function populateCurrentEditorialText(event: MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.form;
    const fieldContainer = form?.querySelector("[data-approve-all-fields]");

    if (!fieldContainer) {
      return;
    }

    fieldContainer.replaceChildren();

    document
      .querySelectorAll<HTMLTextAreaElement>("textarea[data-approve-all-post-id]")
      .forEach((textarea) => {
        const postId = textarea.dataset.approveAllPostId;

        if (!postId) {
          return;
        }

        const postIdInput = document.createElement("input");
        postIdInput.type = "hidden";
        postIdInput.name = "postId";
        postIdInput.value = postId;

        const editorialInput = document.createElement("input");
        editorialInput.type = "hidden";
        editorialInput.name = "editedWhyItMatters";
        editorialInput.value = textarea.value;

        fieldContainer.append(postIdInput, editorialInput);
      });
  }

  return (
    <Button
      type="submit"
      disabled={pending || disabled}
      className="w-full"
      onClick={populateCurrentEditorialText}
    >
      {pending ? (
        <>
          <span className="mr-2 h-3.5 w-3.5 animate-spin rounded-button border-2 border-current border-t-transparent" />
          Approving...
        </>
      ) : (
        "Approve All"
      )}
    </Button>
  );
}
