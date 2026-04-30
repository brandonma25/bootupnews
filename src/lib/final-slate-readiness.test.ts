import { describe, expect, it } from "vitest";

import {
  validateFinalSlateReadiness,
  type FinalSlateValidationRow,
} from "@/lib/final-slate-readiness";

function makeRow(
  slot: number,
  overrides: Partial<FinalSlateValidationRow> = {},
): FinalSlateValidationRow {
  const hasFinalSlateRank = Object.prototype.hasOwnProperty.call(overrides, "finalSlateRank");
  const hasFinalSlateTier = Object.prototype.hasOwnProperty.call(overrides, "finalSlateTier");

  return {
    id: overrides.id ?? `signal-${slot}`,
    title: overrides.title ?? `Signal ${slot}`,
    rank: overrides.rank ?? slot,
    sourceName: overrides.sourceName ?? "Source",
    sourceUrl: overrides.sourceUrl ?? `https://example.com/source-${slot}`,
    editorialStatus: overrides.editorialStatus ?? "approved",
    isLive: overrides.isLive ?? false,
    publishedAt: overrides.publishedAt ?? null,
    whyItMattersValidationStatus: overrides.whyItMattersValidationStatus ?? "passed",
    whyItMattersValidationFailures: overrides.whyItMattersValidationFailures ?? [],
    whyItMattersValidationDetails: overrides.whyItMattersValidationDetails ?? [],
    finalSlateRank: hasFinalSlateRank ? overrides.finalSlateRank ?? null : slot,
    finalSlateTier: hasFinalSlateTier ? overrides.finalSlateTier ?? null : slot <= 5 ? "core" : "context",
  };
}

function validSlate(overrides: Record<number, Partial<FinalSlateValidationRow>> = {}) {
  return Array.from({ length: 7 }, (_, index) => {
    const slot = index + 1;
    return makeRow(slot, overrides[slot] ?? {});
  });
}

describe("final slate readiness", () => {
  it("passes a valid 5 Core + 2 Context slate", () => {
    const result = validateFinalSlateReadiness(validSlate());

    expect(result.ready).toBe(true);
    expect(result.failures).toEqual([]);
    expect(result.selectedRows).toHaveLength(7);
  });

  it("fails when fewer than 7 rows are selected", () => {
    const result = validateFinalSlateReadiness(validSlate().slice(0, 6));

    expect(result.ready).toBe(false);
    expect(result.failures.map((failure) => failure.message)).toContain(
      "Final slate requires exactly 7 selected rows. Current count: 6.",
    );
    expect(result.slotFailures[7]).toContain("Context slot 7 is empty.");
  });

  it("fails when the slate has 6 Core rows and 1 Context row", () => {
    const result = validateFinalSlateReadiness(
      validSlate({
        6: { finalSlateTier: "core" },
      }),
    );

    expect(result.ready).toBe(false);
    expect(result.failures.map((failure) => failure.message)).toContain(
      "6 Core rows selected; 5 required.",
    );
    expect(result.failures.map((failure) => failure.message)).toContain(
      "Only 1 Context rows selected; 2 required.",
    );
  });

  it("fails on duplicate ranks", () => {
    const result = validateFinalSlateReadiness(
      validSlate({
        5: { finalSlateRank: 4 },
      }),
    );

    expect(result.ready).toBe(false);
    expect(result.failures.map((failure) => failure.message)).toContain("Rank 4 is duplicated.");
    expect(result.rowFailures["signal-4"]).toContain("Rank 4 is duplicated.");
    expect(result.rowFailures["signal-5"]).toContain("Rank 4 is duplicated.");
  });

  it("fails on rank gaps", () => {
    const result = validateFinalSlateReadiness(
      validSlate({
        6: { finalSlateRank: null, finalSlateTier: null },
      }),
    );

    expect(result.ready).toBe(false);
    expect(result.slotFailures[6]).toContain("Context slot 6 is empty.");
  });

  it("fails when a selected row has WITM failure status", () => {
    const result = validateFinalSlateReadiness(
      validSlate({
        3: {
          whyItMattersValidationStatus: "requires_human_rewrite",
          whyItMattersValidationFailures: ["minimum_specificity"],
          whyItMattersValidationDetails: ["missing specificity"],
        },
      }),
    );

    expect(result.ready).toBe(false);
    expect(result.rowFailures["signal-3"]).toContain("Row 3 has WITM status requires_human_rewrite.");
    expect(result.rowFailures["signal-3"]).toContain("Selected row has unresolved WITM failure details.");
  });

  it("fails when a selected row is held", () => {
    const result = validateFinalSlateReadiness(
      validSlate({
        2: { editorialStatus: "held" },
      }),
    );

    expect(result.ready).toBe(false);
    expect(result.rowFailures["signal-2"]).toContain("Selected row is marked held.");
  });

  it("fails when a selected row is rejected", () => {
    const result = validateFinalSlateReadiness(
      validSlate({
        2: { editorialStatus: "rejected" },
      }),
    );

    expect(result.ready).toBe(false);
    expect(result.rowFailures["signal-2"]).toContain("Selected row is marked rejected.");
  });

  it("fails when a selected row is rewrite requested", () => {
    const result = validateFinalSlateReadiness(
      validSlate({
        2: { editorialStatus: "rewrite_requested" },
      }),
    );

    expect(result.ready).toBe(false);
    expect(result.rowFailures["signal-2"]).toContain("Selected row has rewrite_requested editorial status.");
  });

  it("fails when a selected row is already live before publish", () => {
    const result = validateFinalSlateReadiness(
      validSlate({
        1: { isLive: true },
      }),
    );

    expect(result.ready).toBe(false);
    expect(result.rowFailures["signal-1"]).toContain("Selected row is already live.");
  });

  it("fails when a selected row is already published before publish", () => {
    const result = validateFinalSlateReadiness(
      validSlate({
        1: {
          editorialStatus: "published",
          publishedAt: "2026-04-30T12:00:00.000Z",
        },
      }),
    );

    expect(result.ready).toBe(false);
    expect(result.rowFailures["signal-1"]).toContain("Selected row is already published.");
  });

  it("fails a Depth row unless it is assigned into Core or Context", () => {
    const invalidResult = validateFinalSlateReadiness(
      validSlate({
        5: {
          rank: 8,
          finalSlateRank: 8,
          finalSlateTier: "context",
        },
      }),
    );
    const validResult = validateFinalSlateReadiness(
      validSlate({
        5: {
          rank: 8,
          finalSlateRank: 5,
          finalSlateTier: "core",
        },
      }),
    );

    expect(invalidResult.ready).toBe(false);
    expect(invalidResult.rowFailures["signal-5"]).toContain("Selected row is missing a valid final-slate rank.");
    expect(validResult.ready).toBe(true);
  });

  it("returns row-level failure reasons", () => {
    const result = validateFinalSlateReadiness(
      validSlate({
        7: {
          sourceUrl: "",
          editorialStatus: "needs_review",
        },
      }),
    );

    expect(result.ready).toBe(false);
    expect(result.rowFailures["signal-7"]).toEqual(
      expect.arrayContaining([
        "Selected row must be approved before final slate readiness.",
        "Selected row is missing source URL.",
      ]),
    );
  });
});
