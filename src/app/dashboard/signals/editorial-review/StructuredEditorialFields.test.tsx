import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StructuredEditorialFields } from "@/app/dashboard/signals/editorial-review/StructuredEditorialFields";

describe("StructuredEditorialFields", () => {
  it("authors structured editorial content and previews collapsed and expanded homepage states", () => {
    render(
      <StructuredEditorialFields
        postId="signal-1"
        aiWhyItMatters="AI draft fallback."
        legacyText="Legacy editorial text."
        structuredContent={{
          preview: "Collapsed homepage teaser.",
          thesis: "Executive thesis.",
          sections: [{ title: "Market impact", body: "This changes what operators should watch." }],
        }}
        eligibleForApproveAll
      />,
    );

    expect(screen.getByLabelText("Homepage teaser / collapsed preview")).toHaveValue(
      "Collapsed homepage teaser.",
    );
    expect(screen.getByLabelText("Thesis / opening statement")).toHaveValue("Executive thesis.");
    expect(screen.getByText("Collapsed homepage version")).toBeInTheDocument();
    expect(screen.getAllByText("Collapsed homepage teaser.")).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "expanded" }));

    expect(screen.getByText("Expanded homepage version")).toBeInTheDocument();
    expect(screen.getAllByText("Executive thesis.")).toHaveLength(2);
    expect(screen.getByText("Market impact")).toBeInTheDocument();
    expect(screen.getAllByText("This changes what operators should watch.")).toHaveLength(2);
  });

  it("keeps hidden legacy text and structured JSON in sync for server actions", () => {
    render(
      <StructuredEditorialFields
        postId="signal-1"
        aiWhyItMatters="AI draft fallback."
        legacyText="Legacy editorial text."
        structuredContent={null}
        eligibleForApproveAll={false}
      />,
    );

    fireEvent.change(screen.getByLabelText("Homepage teaser / collapsed preview"), {
      target: { value: "New teaser." },
    });
    fireEvent.change(screen.getByLabelText("Thesis / opening statement"), {
      target: { value: "New thesis." },
    });
    fireEvent.change(screen.getByLabelText("Section 1 title"), {
      target: { value: "First point" },
    });
    fireEvent.change(screen.getByLabelText("Section 1 body"), {
      target: { value: "Supporting explanation." },
    });

    const legacyTextarea = document.querySelector<HTMLInputElement>('input[name="editedWhyItMatters"]');
    const structuredInput = document.querySelector<HTMLInputElement>('input[name="structuredWhyItMatters"]');

    expect(legacyTextarea?.value).toBe("New thesis.\n\nFirst point: Supporting explanation.");
    expect(JSON.parse(structuredInput?.value ?? "{}")).toEqual({
      preview: "New teaser.",
      thesis: "New thesis.",
      sections: [{ title: "First point", body: "Supporting explanation." }],
    });
  });

  it("renders the collapsed homepage simulation with a complete sentence preview", () => {
    const longPreview =
      "Full Self-Driving improvements are gaining attention because the update reframes investor expectations around autonomy economics and forces operators to reconsider how quickly deployment assumptions can change across the fleet.";

    render(
      <StructuredEditorialFields
        postId="signal-1"
        aiWhyItMatters="AI draft fallback."
        legacyText="Legacy editorial text."
        structuredContent={{
          preview: longPreview,
          thesis: "Expanded thesis.",
          sections: [],
        }}
        eligibleForApproveAll={false}
      />,
    );

    const collapsedPreview = screen.getByText(longPreview, { selector: "p" });

    expect(collapsedPreview).not.toHaveClass("line-clamp-3");
    expect(collapsedPreview.textContent).toMatch(/[.!?]$/);
    expect(collapsedPreview).not.toHaveTextContent("...");
  });

  it("cleans pre-truncated collapsed preview simulation text", () => {
    render(
      <StructuredEditorialFields
        postId="signal-1"
        aiWhyItMatters="AI draft fallback."
        legacyText="Legacy editorial text."
        structuredContent={{
          preview: "Tesla resets the corporate baseline because Full Self-Driving wa...",
          thesis: "Expanded thesis.",
          sections: [],
        }}
        eligibleForApproveAll={false}
      />,
    );

    const collapsedPreview = screen.getByText(
      "Tesla resets the corporate baseline because Full Self-Driving.",
      { selector: "p" },
    );

    expect(collapsedPreview.textContent).toMatch(/[.!?]$/);
    expect(collapsedPreview).not.toHaveTextContent("...");
  });
});
