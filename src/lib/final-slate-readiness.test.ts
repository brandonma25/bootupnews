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
    editorialDecision: overrides.editorialDecision ?? null,
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
  it.each([1, 2, 3, 4, 5])("passes a valid partial public slate with %s selected rows", (count) => {
    const result = validateFinalSlateReadiness(validSlate().slice(0, count));

    expect(result.ready).toBe(true);
    expect(result.failures).toEqual([]);
    expect(result.selectedRows).toHaveLength(count);
  });

  it("fails when no rows are selected", () => {
    const result = validateFinalSlateReadiness([]);

    expect(result.ready).toBe(false);
    expect(result.failures.map((failure) => failure.message)).toContain(
      "Cannot publish an empty slate. Select 1-5 rows before publishing.",
    );
  });

  it("fails when the slate exceeds the PRD-36 public cap", () => {
    const result = validateFinalSlateReadiness(validSlate().slice(0, 6));

    expect(result.ready).toBe(false);
    expect(result.failures.map((failure) => failure.message)).toContain(
      "PRD-36 caps the public slate at 5 rows. Current count: 6.",
    );
  });

  it("passes a partial slate that includes an optional Context row", () => {
    const result = validateFinalSlateReadiness([
      makeRow(1),
      makeRow(2),
      makeRow(6),
    ]);

    expect(result.ready).toBe(true);
    expect(result.selectedRows.map((row) => row.finalSlateRank)).toEqual([1, 2, 6]);
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

  it("does not treat unfilled slots as publish blockers for a partial slate", () => {
    const result = validateFinalSlateReadiness(
      validSlate({
        6: { finalSlateRank: null, finalSlateTier: null },
      }),
    );

    expect(result.ready).toBe(false);
    expect(result.failures.map((failure) => failure.message)).toContain(
      "PRD-36 caps the public slate at 5 rows. Current count: 6.",
    );
    expect(result.slotFailures[6]).toBeUndefined();
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

  it("fails when a selected row has a held editorial decision", () => {
    const result = validateFinalSlateReadiness(
      validSlate({
        2: { editorialDecision: "held" },
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

  it("fails when a selected row has a rejected editorial decision", () => {
    const result = validateFinalSlateReadiness(
      validSlate({
        2: { editorialDecision: "rejected" },
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

  it("fails when a selected row has a rewrite-requested editorial decision", () => {
    const result = validateFinalSlateReadiness(
      validSlate({
        2: { editorialDecision: "rewrite_requested" },
      }),
    );

    expect(result.ready).toBe(false);
    expect(result.rowFailures["signal-2"]).toContain("Selected row has rewrite_requested editorial status.");
  });

  it("fails when an approved selected row still has a draft-edited decision", () => {
    const result = validateFinalSlateReadiness(
      validSlate({
        2: { editorialDecision: "draft_edited" },
      }),
    );

    expect(result.ready).toBe(false);
    expect(result.rowFailures["signal-2"]).toContain(
      "Selected row must have an approved editorial decision before readiness.",
    );
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
      [
        makeRow(1),
        makeRow(2),
        makeRow(3),
        makeRow(4),
        makeRow(5, {
          rank: 8,
          finalSlateRank: 8,
          finalSlateTier: "context",
        }),
      ],
    );
    const validResult = validateFinalSlateReadiness(
      [
        makeRow(1),
        makeRow(2),
        makeRow(3),
        makeRow(4),
        makeRow(5, {
          rank: 8,
          finalSlateRank: 5,
          finalSlateTier: "core",
        }),
      ],
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
