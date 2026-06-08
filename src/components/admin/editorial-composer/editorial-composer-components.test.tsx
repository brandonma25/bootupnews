import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CandidateRow } from "@/components/admin/editorial-composer/CandidateRow";
import {
  SlotPanel,
  type ComposerSlot,
} from "@/components/admin/editorial-composer/SlotPanel";
import { SignalPostEditor } from "@/app/dashboard/signals/editorial-review/StructuredEditorialFields";
import type { EditorialSignalPost } from "@/lib/signals-editorial";

vi.mock("@/app/dashboard/signals/editorial-review/actions", () => ({
  approveAllSignalPostsAction: vi.fn(),
  publishFinalSlateAction: vi.fn(),
  saveSignalDraftAction: vi.fn(),
  autosaveSignalDraftAction: vi.fn().mockResolvedValue({ ok: true, code: "draft_saved", message: "Saved" }),
  approveSignalPostAction: vi.fn(),
  holdSignalPostAction: vi.fn(),
  rejectSignalPostAction: vi.fn(),
  requestRewriteAction: vi.fn(),
  resetSignalPostToAiDraftAction: vi.fn(),
  republishLiveSignalPostAction: vi.fn(),
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
    aiWhatLedToIt: null,
    humanWhatLedToIt: null,
    editedWhatLedToIt: null,
    publishedWhatLedToIt: null,
    editedWhatLedToItStructured: null,
    publishedWhatLedToItStructured: null,
    aiWhatItConnectsTo: null,
    humanWhatItConnectsTo: null,
    editedWhatItConnectsTo: null,
    publishedWhatItConnectsTo: null,
    editedWhatItConnectsToStructured: null,
    publishedWhatItConnectsToStructured: null,
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

  it("opens the confirm dialog with title list and tier breakdown when Publish is clicked", async () => {
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

    const dialog = await screen.findByTestId("publish-confirm-dialog");
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByTestId("publish-confirm-tier-breakdown")).toHaveTextContent(
      "1 Core · 1 Context",
    );
    const titleList = within(dialog).getByTestId("publish-confirm-title-list");
    expect(titleList).toHaveTextContent("Core candidate one");
    expect(titleList).toHaveTextContent("Context candidate one");
  });

  it("closes the confirm dialog when Cancel is pressed without submitting", async () => {
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
    expect(await screen.findByTestId("publish-confirm-dialog")).toBeInTheDocument();

    fireEvent.click(screen.getAllByTestId("publish-confirm-cancel")[0]);

    expect(screen.queryByTestId("publish-confirm-dialog")).not.toBeInTheDocument();
  });

  it("includes a candidate via the one-click Include button (Pick → Publish)", () => {
    const onInclude = vi.fn().mockResolvedValue(undefined);

    render(
      <CandidateRow
        candidate={createCandidate()}
        openSlots={[1, 2, 6]}
        storageReady
        onInclude={onInclude}
        onRemove={vi.fn()}
      />,
    );

    expect(screen.getByText("WITM passed")).toBeInTheDocument();
    expect(screen.getByText("This matters because it changes the operating context.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Include Candidate title in the slate/i }));

    expect(onInclude).toHaveBeenCalledWith("candidate-1");
  });

  it("blocks Include for rewrite-required candidates", () => {
    render(
      <CandidateRow
        candidate={createCandidate({
          whyItMattersValidationStatus: "requires_human_rewrite",
          whyItMattersValidationDetails: ["Template placeholder language detected."],
        })}
        openSlots={[1]}
        storageReady
        onInclude={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    expect(screen.getByText("Needs rewrite")).toBeInTheDocument();
    expect(screen.getByText(/Template placeholder language detected/i)).toBeInTheDocument();
    const includeButton = screen.getByRole("button", { name: /Include Candidate title in the slate/i });
    expect(includeButton).toBeDisabled();
    expect(includeButton).toHaveTextContent("Rewrite first");
  });

  it("offers Remove for an already-included candidate (Pick → Publish)", () => {
    const onRemove = vi.fn().mockResolvedValue(undefined);

    render(
      <CandidateRow
        candidate={createCandidate({ finalSlateRank: 2, finalSlateTier: "core" })}
        openSlots={[1, 3]}
        storageReady
        onInclude={vi.fn()}
        onRemove={onRemove}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Remove Candidate title from the slate/i }));

    expect(onRemove).toHaveBeenCalledWith("candidate-1");
  });

  it("disables Include with a 'Slate full' label when no slots are open", () => {
    render(
      <CandidateRow
        candidate={createCandidate()}
        openSlots={[]}
        storageReady
        onInclude={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    const includeButton = screen.getByRole("button", { name: /Include Candidate title in the slate/i });
    expect(includeButton).toBeDisabled();
    expect(includeButton).toHaveTextContent("Slate full");
  });

  // #321 — the card must surface all three editorial layers at a glance,
  // labeled and in fixed order, each from its own column. Regression guard
  // against the "one block per signal" bug where only WITM was shown.
  it("renders all three layers labeled in order, each from its own column (#321)", () => {
    render(
      <CandidateRow
        candidate={createCandidate({
          editedWhyItMatters: "Signal body — what this means now.",
          editedWhatLedToIt: "Before This body — what produced it.",
          editedWhatItConnectsTo: "Ripple body — what it implies next.",
        })}
        openSlots={[1]}
        storageReady
        onInclude={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    const labels = screen
      .getAllByText(/^(The Signal|Before This|The Ripple)$/u)
      .map((node) => node.textContent);
    expect(labels).toEqual(["The Signal", "Before This", "The Ripple"]);

    expect(screen.getByText("Signal body — what this means now.")).toBeInTheDocument();
    expect(screen.getByText("Before This body — what produced it.")).toBeInTheDocument();
    expect(screen.getByText("Ripple body — what it implies next.")).toBeInTheDocument();
  });

  it("shows labeled empty states for absent depth layers without leaking WITM (#321)", () => {
    render(
      <CandidateRow
        candidate={createCandidate({ editedWhyItMatters: "Only the signal." })}
        openSlots={[1]}
        storageReady
        onInclude={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    expect(screen.getByText("Only the signal.")).toBeInTheDocument();
    expect(screen.getByText("No Before This draft yet.")).toBeInTheDocument();
    expect(screen.getByText("No Ripple draft yet.")).toBeInTheDocument();
  });
});

// #280 — "Re-publish live card" button in the SignalPostEditor panel.
// Shown only for cards that are currently published + live; submits to
// republishLiveSignalPostAction which snapshots the prior published_*
// and overwrites in place.
describe("SignalPostEditor — re-publish live card button (#280)", () => {
  function renderEditor(overrides: Partial<EditorialSignalPost> = {}) {
    const post = createCandidate(overrides);
    return render(
      <SignalPostEditor post={post} storageReady defaultExpanded />,
    );
  }

  it("shows the Re-publish button when the card is currently published + live + has publishedAt", () => {
    renderEditor({
      editorialStatus: "published",
      editorialDecision: "approved",
      finalSlateRank: 1,
      whyItMattersValidationStatus: "passed",
      isLive: true,
      publishedAt: "2026-05-23T12:00:00.000Z",
    });

    expect(screen.getByTestId("republish-live-card")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /re-publish live card/i })).toBeInTheDocument();
  });

  it("hides the Re-publish button on a never-published candidate (use the slate gate instead)", () => {
    renderEditor({
      editorialStatus: "approved",
      editorialDecision: "approved",
      finalSlateRank: 1,
      whyItMattersValidationStatus: "passed",
      isLive: false,
      publishedAt: null,
    });

    expect(screen.queryByTestId("republish-live-card")).not.toBeInTheDocument();
  });

  it("hides the Re-publish button on a draft / needs-review candidate", () => {
    renderEditor({
      editorialStatus: "needs_review",
      editorialDecision: null,
      finalSlateRank: null,
      whyItMattersValidationStatus: "passed",
      isLive: false,
      publishedAt: null,
    });

    expect(screen.queryByTestId("republish-live-card")).not.toBeInTheDocument();
  });

  it("disables the Re-publish button when WITM validator is failing on the live card", () => {
    renderEditor({
      editorialStatus: "published",
      editorialDecision: "approved",
      finalSlateRank: 1,
      whyItMattersValidationStatus: "requires_human_rewrite",
      whyItMattersValidationFailures: ["template_placeholder_language"],
      whyItMattersValidationDetails: ["placeholder language"],
      isLive: true,
      publishedAt: "2026-05-23T12:00:00.000Z",
    });

    const button = screen.getByTestId("republish-live-card");
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
  });
});
