import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CandidateRow } from "@/components/admin/editorial-composer/CandidateRow";
import { SlotPanel, type ComposerSlot } from "@/components/admin/editorial-composer/SlotPanel";
import type { EditorialSignalPost } from "@/lib/signals-editorial";

vi.mock("@/app/dashboard/signals/editorial-review/actions", () => ({
  publishFinalSlateAction: vi.fn(),
  saveSignalDraftAction: vi.fn(),
  approveSignalPostAction: vi.fn(),
  holdSignalPostAction: vi.fn(),
  rejectSignalPostAction: vi.fn(),
  requestRewriteAction: vi.fn(),
  resetSignalPostToAiDraftAction: vi.fn(),
}));

function createCandidate(overrides: Partial<EditorialSignalPost> = {}): EditorialSignalPost {
  return {
    id: "candidate-1",
    briefingDate: "2026-05-13",
    rank: 1,
    title: "Candidate title",
    sourceName: "Reuters",
    sourceUrl: "https://www.reuters.com/story",
    summary: "Candidate summary",
    tags: ["Finance"],
    signalScore: 88,
    selectionReason: "Important enough for review.",
    aiWhyItMatters: "This matters because it changes the operating context.",
    editedWhyItMatters: null,
    publishedWhyItMatters: null,
    editedWhyItMattersStructured: null,
    publishedWhyItMattersStructured: null,
    whyItMattersValidationStatus: "passed",
    whyItMattersValidationFailures: [],
    whyItMattersValidationDetails: [],
    whyItMattersValidatedAt: "2026-05-13T12:00:00.000Z",
    editorialStatus: "approved",
    finalSlateRank: null,
    finalSlateTier: null,
    editorialDecision: "approved",
    decisionNote: null,
    rejectedReason: null,
    heldReason: null,
    replacementOfRowId: null,
    reviewedBy: null,
    reviewedAt: null,
    editedBy: null,
    editedAt: null,
    approvedBy: null,
    approvedAt: null,
    publishedAt: null,
    isLive: false,
    createdAt: "2026-05-13T12:00:00.000Z",
    updatedAt: "2026-05-13T12:00:00.000Z",
    persisted: true,
    ...overrides,
  };
}

describe("editorial composer components", () => {
  it("renders empty and filled slots in the sticky slot panel", () => {
    const slots: ComposerSlot[] = [
      { rank: 1, tier: "core", post: createCandidate({ title: "Assigned core" }) },
      { rank: 2, tier: "core", post: null },
      { rank: 6, tier: "context", post: createCandidate({ title: "Assigned context" }) },
    ];

    render(<SlotPanel slots={slots} canPublish publishDisabledReason={null} />);

    expect(screen.getAllByText("Final slate").length).toBeGreaterThan(0);
    expect(screen.getAllByText("2 / 7").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Assigned core").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Empty").length).toBeGreaterThan(0);
    expect(
      screen
        .getAllByRole("button", { name: /Publish slate/i })
        .every((button) => !button.hasAttribute("disabled")),
    ).toBe(true);
  });

  it("renders the mobile final slate as a collapsible drawer", () => {
    const { container } = render(
      <SlotPanel slots={[{ rank: 1, tier: "core", post: null }]} canPublish={false} />,
    );

    const drawer = container.querySelector("details");

    expect(drawer).toBeInTheDocument();
    expect(drawer?.querySelector("summary")).toHaveTextContent("Final slate");
  });

  it("disables publish when no rows are publishable", () => {
    render(
      <SlotPanel
        slots={[{ rank: 1, tier: "core", post: null }]}
        canPublish={false}
        publishDisabledReason="Cannot publish an empty slate."
      />,
    );

    expect(
      screen
        .getAllByRole("button", { name: /Publish slate/i })
        .every((button) => button.hasAttribute("disabled")),
    ).toBe(true);
    expect(screen.getAllByText("Cannot publish an empty slate.").length).toBeGreaterThan(0);
  });

  it("shows WITM inline and assigns a candidate through the picker", () => {
    const onAssign = vi.fn().mockResolvedValue(undefined);

    render(
      <CandidateRow
        candidate={createCandidate()}
        openSlots={[1, 2, 6]}
        storageReady
        onAssign={onAssign}
      />,
    );

    expect(screen.getByText("WITM passed")).toBeInTheDocument();
    expect(screen.getByText("This matters because it changes the operating context.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Assign Candidate title to a slot/i), {
      target: { value: "2" },
    });

    expect(onAssign).toHaveBeenCalledWith("candidate-1", "2");
  });

  it("blocks assignment for rewrite-required candidates", () => {
    render(
      <CandidateRow
        candidate={createCandidate({
          whyItMattersValidationStatus: "requires_human_rewrite",
          whyItMattersValidationDetails: ["Template placeholder language detected."],
        })}
        openSlots={[1]}
        storageReady
        onAssign={vi.fn()}
      />,
    );

    expect(screen.getByText("Needs rewrite")).toBeInTheDocument();
    expect(screen.getByText(/Template placeholder language detected/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Assign Candidate title to a slot/i)).toBeDisabled();
  });
});
