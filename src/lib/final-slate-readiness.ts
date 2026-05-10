export type FinalSlateTier = "core" | "context";

export const FINAL_SLATE_MIN_PUBLIC_ROWS = 1;
export const FINAL_SLATE_MAX_PUBLIC_ROWS = 5;
export const FINAL_SLATE_CORE_RANKS = [1, 2, 3, 4, 5] as const;
export const FINAL_SLATE_CONTEXT_RANKS = [6, 7] as const;
export const FINAL_SLATE_RANKS = [
  ...FINAL_SLATE_CORE_RANKS,
  ...FINAL_SLATE_CONTEXT_RANKS,
] as const;

export type FinalSlateRank = (typeof FINAL_SLATE_RANKS)[number];

export type FinalSlateValidationRow = {
  id: string;
  title: string;
  rank?: number | null;
  sourceName?: string | null;
  sourceUrl?: string | null;
  editorialStatus?: string | null;
  editorialDecision?: string | null;
  isLive?: boolean | null;
  publishedAt?: string | null;
  whyItMattersValidationStatus?: string | null;
  whyItMattersValidationFailures?: string[] | null;
  whyItMattersValidationDetails?: string[] | null;
  finalSlateRank?: number | null;
  finalSlateTier?: string | null;
  replacementOfRowId?: string | null;
};

export type FinalSlateValidationFailure = {
  code: string;
  message: string;
  rowId?: string;
  rank?: number;
};

export type FinalSlateReadinessResult = {
  ready: boolean;
  failures: FinalSlateValidationFailure[];
  rowFailures: Record<string, string[]>;
  slotFailures: Record<number, string[]>;
  selectedRows: FinalSlateValidationRow[];
};

export const MISSING_PUBLIC_SOURCE_URL_REASON = "missing_public_source_url";

const CORE_RANK_SET = new Set<number>(FINAL_SLATE_CORE_RANKS);
const CONTEXT_RANK_SET = new Set<number>(FINAL_SLATE_CONTEXT_RANKS);
const FINAL_RANK_SET = new Set<number>(FINAL_SLATE_RANKS);

export function isValidPublicSourceUrl(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";

  if (!normalized) {
    return false;
  }

  try {
    const parsed = new URL(normalized);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function getFinalSlateTierForRank(rank: number): FinalSlateTier | null {
  if (CORE_RANK_SET.has(rank)) {
    return "core";
  }

  if (CONTEXT_RANK_SET.has(rank)) {
    return "context";
  }

  return null;
}

export function isFinalSlateRank(rank: number | null | undefined): rank is FinalSlateRank {
  return typeof rank === "number" && FINAL_RANK_SET.has(rank);
}

export function validateFinalSlateReadiness(
  rows: FinalSlateValidationRow[],
): FinalSlateReadinessResult {
  const failures: FinalSlateValidationFailure[] = [];
  const rowFailures: Record<string, string[]> = {};
  const slotFailures: Record<number, string[]> = {};
  const selectedRows = rows.filter(isSelectedForFinalSlate);
  const selectedRowsByRank = new Map<number, FinalSlateValidationRow[]>();

  function addFailure(failure: FinalSlateValidationFailure) {
    failures.push(failure);
  }

  function addRowFailure(row: FinalSlateValidationRow, message: string, code: string, rank?: number) {
    rowFailures[row.id] ??= [];
    rowFailures[row.id].push(message);
    addFailure({
      code,
      message,
      rowId: row.id,
      rank,
    });
  }

  function addSlotFailure(rank: number, message: string, code: string) {
    slotFailures[rank] ??= [];
    slotFailures[rank].push(message);
    addFailure({
      code,
      message,
      rank,
    });
  }

  for (const row of selectedRows) {
    const rank = row.finalSlateRank;
    const tier = row.finalSlateTier;

    if (!isFinalSlateRank(rank)) {
      addRowFailure(row, "Selected row is missing a valid final-slate rank.", "invalid_rank");
    } else {
      selectedRowsByRank.set(rank, [...(selectedRowsByRank.get(rank) ?? []), row]);
    }

    if (tier !== "core" && tier !== "context") {
      addRowFailure(row, "Selected row is missing a Core/Context final-slate tier.", "invalid_tier", rank ?? undefined);
    } else if (isFinalSlateRank(rank)) {
      const expectedTier = getFinalSlateTierForRank(rank);
      if (expectedTier && tier !== expectedTier) {
        addRowFailure(
          row,
          `Rank ${rank} must be assigned to ${formatTier(expectedTier)}.`,
          "rank_tier_mismatch",
          rank,
        );
      }
    }

    addRowContentFailures(row, addRowFailure);
  }

  if (selectedRows.length < FINAL_SLATE_MIN_PUBLIC_ROWS) {
    addFailure({
      code: "empty_public_slate",
      message: "Cannot publish an empty slate. Select 1-5 rows before publishing.",
    });
  }

  if (selectedRows.length > FINAL_SLATE_MAX_PUBLIC_ROWS) {
    addFailure({
      code: "prd36_public_slate_cap",
      message: `PRD-36 caps the public slate at 5 rows. Current count: ${selectedRows.length}.`,
    });
  }

  for (const [rank, rowsAtRank] of selectedRowsByRank.entries()) {
    if (rowsAtRank.length > 1) {
      const message = `Rank ${rank} is duplicated.`;
      addSlotFailure(rank, message, "duplicate_rank");
      rowsAtRank.forEach((row) => addRowFailure(row, message, "duplicate_rank", rank));
    }
  }

  return {
    ready: failures.length === 0,
    failures: dedupeFailures(failures),
    rowFailures,
    slotFailures,
    selectedRows,
  };
}

function isSelectedForFinalSlate(row: FinalSlateValidationRow) {
  return (
    (row.finalSlateRank !== null && row.finalSlateRank !== undefined) ||
    (row.finalSlateTier !== null && row.finalSlateTier !== undefined)
  );
}

function addRowContentFailures(
  row: FinalSlateValidationRow,
  addRowFailure: (
    row: FinalSlateValidationRow,
    message: string,
    code: string,
    rank?: number,
  ) => void,
) {
  const rank = row.finalSlateRank ?? undefined;
  const editorialStatus = row.editorialStatus ?? "";
  const editorialDecision = row.editorialDecision ?? "";
  const validationStatus = row.whyItMattersValidationStatus ?? "";
  const validationFailures = row.whyItMattersValidationFailures ?? [];
  const validationDetails = row.whyItMattersValidationDetails ?? [];

  if (editorialDecision === "rejected" || editorialStatus === "rejected") {
    addRowFailure(row, "Selected row is marked rejected.", "rejected_row", rank);
  } else if (editorialDecision === "held" || editorialStatus === "held") {
    addRowFailure(row, "Selected row is marked held.", "held_row", rank);
  } else if (editorialDecision === "rewrite_requested" || editorialStatus === "rewrite_requested") {
    addRowFailure(row, "Selected row has rewrite_requested editorial status.", "rewrite_requested_row", rank);
  } else if (editorialDecision === "removed_from_slate") {
    addRowFailure(row, "Selected row was removed from the final slate.", "removed_from_slate", rank);
  } else if (editorialDecision && editorialDecision !== "approved") {
    addRowFailure(row, "Selected row must have an approved editorial decision before readiness.", "decision_not_approved", rank);
  } else if (editorialStatus === "published") {
    addRowFailure(row, "Selected row is already published.", "already_published", rank);
  } else if (editorialStatus !== "approved") {
    addRowFailure(row, "Selected row must be approved before final slate readiness.", "not_approved", rank);
  }

  if (validationStatus !== "passed") {
    addRowFailure(
      row,
      validationStatus
        ? `Row ${rank ?? row.rank ?? row.id} has WITM status ${validationStatus}.`
        : `Row ${rank ?? row.rank ?? row.id} is missing WITM validation status.`,
      "witm_failed",
      rank,
    );
  }

  if (validationFailures.length > 0 || validationDetails.length > 0) {
    addRowFailure(row, "Selected row has unresolved WITM failure details.", "witm_failure_details", rank);
  }

  if (row.isLive) {
    addRowFailure(row, "Selected row is already live.", "already_live", rank);
  }

  if (row.publishedAt) {
    addRowFailure(row, "Selected row is already published.", "already_published", rank);
  }

  if (!row.sourceName?.trim()) {
    addRowFailure(row, "Selected row is missing source name.", "missing_source_name", rank);
  }

  if (!isValidPublicSourceUrl(row.sourceUrl)) {
    addRowFailure(
      row,
      "Selected row is missing a valid public source URL.",
      MISSING_PUBLIC_SOURCE_URL_REASON,
      rank,
    );
  }
}

function formatTier(tier: FinalSlateTier) {
  return tier === "core" ? "Core" : "Context";
}

export function formatSlotLabel(rank: number) {
  const tier = getFinalSlateTierForRank(rank);
  return `${tier === "context" ? "Context" : "Core"} slot ${rank}`;
}

function dedupeFailures(failures: FinalSlateValidationFailure[]) {
  const seen = new Set<string>();

  return failures.filter((failure) => {
    const key = `${failure.code}:${failure.rowId ?? ""}:${failure.rank ?? ""}:${failure.message}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}
