import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  BulkApproveForm,
  isEligibleForBulkApprove,
} from "@/components/admin/editorial-composer/BulkApproveForm";
import { CandidateRow } from "@/components/admin/editorial-composer/CandidateRow";
import {
  SlotPanel,
  type ComposerSlot,
} from "@/components/admin/editorial-composer/SlotPanel";
import type { EditorialSignalPost } from "@/lib/signals-editorial";

vi.mock("@/app/dashboard/signals/editorial-review/actions", () => ({
  approveAllSignalPostsAction: vi.fn(),
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

    render(
      <SlotPanel
        slots={slots}
        canPublish
        publishDisabledReason={null}
        publishCounts={{ approved: 2, pendingPublish: 2, alreadyLive: 0 }}
      />,
    );

    expect(screen.getAllByText("Final slate").length).toBeGreaterThan(0);
    expect(screen.getAllByText("2 / 7").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Assigned core").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Empty").length).toBeGreaterThan(0);
    expect(
      screen
        .getAllByTestId("publish-slate-open")
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
        .getAllByTestId("publish-slate-open")
        .every((button) => button.hasAttribute("disabled")),
    ).toBe(true);
    expect(screen.getAllByText("Cannot publish an empty slate.").length).toBeGreaterThan(0);
  });

  it("disables publish when nothing is pending publish even if other readiness gates pass", () => {
    render(
      <SlotPanel
        slots={[{ rank: 1, tier: "core", post: createCandidate({ title: "Live" }) }]}
        canPublish
        publishDisabledReason={null}
        publishCounts={{ approved: 0, pendingPublish: 0, alreadyLive: 1 }}
      />,
    );

    expect(
      screen
        .getAllByTestId("publish-slate-open")
        .every((button) => button.hasAttribute("disabled")),
    ).toBe(true);
    expect(
      screen.getAllByText("No approved candidates pending publish.").length,
    ).toBeGreaterThan(0);
  });

  it("renders the publish summary line with live counts", () => {
    render(
      <SlotPanel
        slots={[{ rank: 1, tier: "core", post: null }]}
        canPublish
        publishCounts={{ approved: 4, pendingPublish: 3, alreadyLive: 1 }}
      />,
    );

    const summaries = screen.getAllByTestId("publish-summary");
    expect(summaries.length).toBeGreaterThan(0);
    expect(summaries[0]).toHaveTextContent("4 approved · 3 pending publish · 1 already live");
  });

  it("uses the pending-publish count in the dynamic button label", () => {
    render(
      <SlotPanel
        slots={[{ rank: 1, tier: "core", post: createCandidate() }]}
        canPublish
        publishCounts={{ approved: 3, pendingPublish: 3, alreadyLive: 0 }}
      />,
    );

    expect(
      screen
        .getAllByTestId("publish-slate-open")
        .every((button) => button.textContent?.includes("Publish 3 candidates")),
    ).toBe(true);
  });

  it("opens the confirm dialog with title list and tier breakdown when Publish is clicked", () => {
    const pending = [
      createCandidate({
        id: "p1",
        title: "Core candidate one",
        finalSlateRank: 1,
        finalSlateTier: "core",
      }),
      createCandidate({
        id: "p2",
        title: "Context candidate one",
        finalSlateRank: 6,
        finalSlateTier: "context",
      }),
    ];

    render(
      <SlotPanel
        slots={[
          { rank: 1, tier: "core", post: pending[0] },
          { rank: 6, tier: "context", post: pending[1] },
        ]}
        canPublish
        publishCounts={{ approved: 2, pendingPublish: 2, alreadyLive: 0 }}
        pendingPublishCandidates={pending}
      />,
    );

    expect(screen.queryByTestId("publish-confirm-dialog")).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByTestId("publish-slate-open")[0]);

    const dialog = screen.getByTestId("publish-confirm-dialog");
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByTestId("publish-confirm-tier-breakdown")).toHaveTextContent(
      "1 Core · 1 Context",
    );
    const titleList = within(dialog).getByTestId("publish-confirm-title-list");
    expect(titleList).toHaveTextContent("Core candidate one");
    expect(titleList).toHaveTextContent("Context candidate one");
  });

  it("closes the confirm dialog when Cancel is pressed without submitting", () => {
    const pending = [
      createCandidate({
        id: "p1",
        title: "Core candidate",
        finalSlateRank: 1,
        finalSlateTier: "core",
      }),
    ];

    render(
      <SlotPanel
        slots={[{ rank: 1, tier: "core", post: pending[0] }]}
        canPublish
        publishCounts={{ approved: 1, pendingPublish: 1, alreadyLive: 0 }}
        pendingPublishCandidates={pending}
      />,
    );

    fireEvent.click(screen.getAllByTestId("publish-slate-open")[0]);
    expect(screen.getByTestId("publish-confirm-dialog")).toBeInTheDocument();

    fireEvent.click(screen.getAllByTestId("publish-confirm-cancel")[0]);

    expect(screen.queryByTestId("publish-confirm-dialog")).not.toBeInTheDocument();
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

describe("BulkApproveForm", () => {
  it("renders the WITM-passed label and a hidden input per eligible candidate", () => {
    const candidates = [
      createCandidate({
        id: "ready-1",
        title: "Ready candidate 1",
        finalSlateRank: 1,
        editorialStatus: "needs_review",
        editorialDecision: null,
      }),
      createCandidate({
        id: "ready-2",
        title: "Ready candidate 2",
        finalSlateRank: 2,
        editorialStatus: "draft",
        editorialDecision: null,
      }),
    ];

    render(<BulkApproveForm eligibleCandidates={candidates} />);

    expect(screen.getByText(/2 candidates ready/i)).toBeInTheDocument();

    const button = screen.getByTestId("bulk-approve-submit");
    expect(button).toBeEnabled();
    expect(button).toHaveTextContent("Approve all WITM-passed");

    const form = screen.getByTestId("bulk-approve-form") as HTMLFormElement;
    const postIdInputs = form.querySelectorAll('input[name="postId"]');
    expect(Array.from(postIdInputs).map((input) => (input as HTMLInputElement).value)).toEqual([
      "ready-1",
      "ready-2",
    ]);
  });

  it("renders disabled with the expected tooltip when zero candidates qualify", () => {
    render(<BulkApproveForm eligibleCandidates={[]} />);

    const button = screen.getByTestId("bulk-approve-submit");
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("title", "No WITM-passed candidates assigned to slots");
    expect(
      screen.getByText("No WITM-passed candidates currently assigned to a slot."),
    ).toBeInTheDocument();
  });
});

describe("isEligibleForBulkApprove", () => {
  it("requires WITM passed status", () => {
    expect(
      isEligibleForBulkApprove(
        createCandidate({
          editorialStatus: "needs_review",
          editorialDecision: null,
          finalSlateRank: 1,
          whyItMattersValidationStatus: "requires_human_rewrite",
        }),
        true,
      ),
    ).toBe(false);
  });

  it("requires a slot assignment", () => {
    expect(
      isEligibleForBulkApprove(
        createCandidate({
          editorialStatus: "needs_review",
          editorialDecision: null,
          finalSlateRank: null,
          whyItMattersValidationStatus: "passed",
        }),
        true,
      ),
    ).toBe(false);
  });

  it("excludes already-approved candidates", () => {
    expect(
      isEligibleForBulkApprove(
        createCandidate({
          editorialStatus: "approved",
          editorialDecision: "approved",
          finalSlateRank: 1,
          whyItMattersValidationStatus: "passed",
        }),
        true,
      ),
    ).toBe(false);
  });

  it("excludes published / live candidates", () => {
    expect(
      isEligibleForBulkApprove(
        createCandidate({
          editorialStatus: "published",
          editorialDecision: "approved",
          finalSlateRank: 1,
          whyItMattersValidationStatus: "passed",
          isLive: true,
          publishedAt: "2026-05-13T12:00:00.000Z",
        }),
        true,
      ),
    ).toBe(false);
  });

  it("excludes candidates with blocking editorial decisions", () => {
    for (const blocking of ["rejected", "held", "rewrite_requested", "removed_from_slate"]) {
      expect(
        isEligibleForBulkApprove(
          createCandidate({
            editorialStatus: "needs_review",
            editorialDecision: blocking,
            finalSlateRank: 1,
            whyItMattersValidationStatus: "passed",
          }),
          true,
        ),
      ).toBe(false);
    }
  });

  it("requires storage to be ready", () => {
    expect(
      isEligibleForBulkApprove(
        createCandidate({
          editorialStatus: "needs_review",
          editorialDecision: null,
          finalSlateRank: 1,
          whyItMattersValidationStatus: "passed",
        }),
        false,
      ),
    ).toBe(false);
  });

  it("returns true for the happy path", () => {
    expect(
      isEligibleForBulkApprove(
        createCandidate({
          editorialStatus: "needs_review",
          editorialDecision: null,
          finalSlateRank: 1,
          whyItMattersValidationStatus: "passed",
          isLive: false,
          publishedAt: null,
        }),
        true,
      ),
    ).toBe(true);
  });
});
