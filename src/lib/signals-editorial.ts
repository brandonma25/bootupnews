import type { User } from "@supabase/supabase-js";

import { isAdminUser } from "@/lib/admin-auth";
import {
  buildEditorialWhyItMattersText,
  createEditorialContentFromLegacyText,
  parseEditorialWhyItMattersContent,
  type EditorialWhyItMattersContent,
} from "@/lib/editorial-content";
import { logServerEvent } from "@/lib/observability";
import {
  createSupabaseServiceRoleClient,
  safeGetUser,
} from "@/lib/supabase/server";
import { captureRssFailure, type RssFailureType, type RssPhase } from "@/lib/observability/rss";
import {
  FINAL_SLATE_MAX_PUBLIC_ROWS,
  FINAL_SLATE_MIN_PUBLIC_ROWS,
  getFinalSlateTierForRank,
  isFinalSlateRank,
  isValidPublicSourceUrl,
  MISSING_PUBLIC_SOURCE_URL_REASON,
  validateFinalSlateReadiness,
  type FinalSlateTier,
  type FinalSlateValidationFailure,
} from "@/lib/final-slate-readiness";
import type { BriefingItem, EditorialDecision, EditorialStatus } from "@/lib/types";
import {
  validateWhyItMatters,
  type WhyItMattersReviewStatus,
  type WhyItMattersValidationResult,
} from "@/lib/why-it-matters-quality-gate";

export const SIGNALS_EDITORIAL_ROUTE = "/dashboard/signals/editorial-review";
export const PUBLIC_SIGNALS_ROUTE = "/signals";

const PUBLIC_SIGNAL_POST_REQUIRED_COLUMNS = [
  "id",
  "briefing_date",
  "rank",
  "title",
  "source_name",
  "source_url",
  "summary",
  "tags",
  "signal_score",
  "selection_reason",
  "published_why_it_matters",
  "published_why_it_matters_payload",
  "why_it_matters_validation_status",
  "why_it_matters_validation_failures",
  "why_it_matters_validation_details",
  "why_it_matters_validated_at",
  "editorial_status",
  "published_at",
  "is_live",
  "created_at",
  "updated_at",
];

const PUBLIC_SIGNAL_POST_OPTIONAL_PLACEMENT_COLUMNS = [
  "final_slate_rank",
  "final_slate_tier",
  "editorial_decision",
];

const ADMIN_SIGNAL_POST_REQUIRED_COLUMNS = [
  "id",
  "briefing_date",
  "rank",
  "title",
  "source_name",
  "source_url",
  "summary",
  "tags",
  "signal_score",
  "selection_reason",
  "ai_why_it_matters",
  "edited_why_it_matters",
  "published_why_it_matters",
  "edited_why_it_matters_payload",
  "published_why_it_matters_payload",
  "why_it_matters_validation_status",
  "why_it_matters_validation_failures",
  "why_it_matters_validation_details",
  "why_it_matters_validated_at",
  "editorial_status",
  "final_slate_rank",
  "final_slate_tier",
  "editorial_decision",
  "decision_note",
  "rejected_reason",
  "held_reason",
  "replacement_of_row_id",
  "reviewed_by",
  "reviewed_at",
  "edited_by",
  "edited_at",
  "approved_by",
  "approved_at",
  "published_at",
  "is_live",
  "created_at",
  "updated_at",
];

const SIGNAL_POST_SELECT = ADMIN_SIGNAL_POST_REQUIRED_COLUMNS.join(", ");
const PUBLIC_SIGNAL_POST_BASE_SELECT = PUBLIC_SIGNAL_POST_REQUIRED_COLUMNS.join(", ");
const PUBLIC_SIGNAL_POST_WITH_OPTIONAL_PLACEMENT_SELECT = [
  ...PUBLIC_SIGNAL_POST_REQUIRED_COLUMNS,
  ...PUBLIC_SIGNAL_POST_OPTIONAL_PLACEMENT_COLUMNS,
].join(", ");

const PUBLISHED_SLATE_REQUIRED_COLUMNS = [
  "id",
  "published_at",
  "published_by",
  "row_count",
  "core_count",
  "context_count",
  "previous_live_row_ids",
  "published_row_ids",
  "rollback_note",
  "verification_checklist_json",
  "created_at",
];

const PUBLISHED_SLATE_ITEM_REQUIRED_COLUMNS = [
  "id",
  "published_slate_id",
  "signal_post_id",
  "final_slate_rank",
  "final_slate_tier",
  "title_snapshot",
  "why_it_matters_snapshot",
  "summary_snapshot",
  "source_name_snapshot",
  "source_url_snapshot",
  "editorial_decision_snapshot",
  "replacement_of_row_id_snapshot",
  "decision_note_snapshot",
  "held_reason_snapshot",
  "rejected_reason_snapshot",
  "reviewed_by_snapshot",
  "reviewed_at_snapshot",
  "created_at",
];

const PUBLISHED_SLATE_SELECT = PUBLISHED_SLATE_REQUIRED_COLUMNS.join(", ");
const PUBLISHED_SLATE_ITEM_SELECT = PUBLISHED_SLATE_ITEM_REQUIRED_COLUMNS.join(", ");

const EDITORIAL_PAGE_SIZE = 20;
const SIGNAL_POST_CANDIDATE_DEPTH_LIMIT = 20;
const TOP_SIGNAL_SET_SIZE = 5;
const CONTEXT_SIGNAL_SET_SIZE = 2;
const PUBLIC_SIGNAL_SET_SIZE = TOP_SIGNAL_SET_SIZE + CONTEXT_SIGNAL_SET_SIZE;
const NEWSLETTER_DISCOVERY_SELECTION_REASON = "Newsletter discovery candidate; BM review required.";

type EditorialClient = NonNullable<ReturnType<typeof createSupabaseServiceRoleClient>>;

// Operational contract: signal_posts is Surface Placement + Card copy/public
// read model storage. It must not be treated as canonical Signal identity.
// See docs/engineering/SIGNAL_POSTS_OPERATIONAL_CONTRACT.md.
type StoredSignalPost = {
  id: string;
  briefing_date: string | null;
  rank: number;
  title: string;
  source_name: string | null;
  source_url: string | null;
  summary: string | null;
  tags: string[] | null;
  signal_score: number | null;
  selection_reason: string | null;
  ai_why_it_matters: string | null;
  edited_why_it_matters: string | null;
  published_why_it_matters: string | null;
  edited_why_it_matters_payload: unknown | null;
  published_why_it_matters_payload: unknown | null;
  why_it_matters_validation_status: WhyItMattersReviewStatus | null;
  why_it_matters_validation_failures: string[] | null;
  why_it_matters_validation_details: string[] | null;
  why_it_matters_validated_at: string | null;
  editorial_status: EditorialStatus;
  final_slate_rank: number | null;
  final_slate_tier: FinalSlateTier | null;
  editorial_decision: EditorialDecision | null;
  decision_note: string | null;
  rejected_reason: string | null;
  held_reason: string | null;
  replacement_of_row_id: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  edited_by: string | null;
  edited_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  published_at: string | null;
  is_live: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

type StoredPublishedSlate = {
  id: string;
  published_at: string;
  published_by: string | null;
  row_count: number;
  core_count: number;
  context_count: number;
  previous_live_row_ids: unknown;
  published_row_ids: unknown;
  rollback_note: string | null;
  verification_checklist_json: unknown;
  created_at: string | null;
};

type StoredPublishedSlateItem = {
  id: string;
  published_slate_id: string;
  signal_post_id: string;
  final_slate_rank: number;
  final_slate_tier: FinalSlateTier;
  title_snapshot: string;
  why_it_matters_snapshot: string;
  summary_snapshot: string | null;
  source_name_snapshot: string | null;
  source_url_snapshot: string | null;
  editorial_decision_snapshot: EditorialDecision | null;
  replacement_of_row_id_snapshot: string | null;
  decision_note_snapshot: string | null;
  held_reason_snapshot: string | null;
  rejected_reason_snapshot: string | null;
  reviewed_by_snapshot: string | null;
  reviewed_at_snapshot: string | null;
  created_at: string | null;
};

type FinalSlatePublicationCandidate = {
  post: EditorialSignalPost;
  structuredContent: EditorialWhyItMattersContent | null;
  text: string;
  validation: WhyItMattersValidationResult;
};

export type EditorialSignalPost = {
  id: string;
  briefingDate: string | null;
  rank: number;
  title: string;
  sourceName: string;
  sourceUrl: string;
  summary: string;
  tags: string[];
  signalScore: number | null;
  selectionReason: string;
  aiWhyItMatters: string;
  editedWhyItMatters: string | null;
  publishedWhyItMatters: string | null;
  editedWhyItMattersStructured: EditorialWhyItMattersContent | null;
  publishedWhyItMattersStructured: EditorialWhyItMattersContent | null;
  whyItMattersValidationStatus: WhyItMattersReviewStatus;
  whyItMattersValidationFailures: string[];
  whyItMattersValidationDetails: string[];
  whyItMattersValidatedAt: string | null;
  editorialStatus: EditorialStatus;
  finalSlateRank: number | null;
  finalSlateTier: FinalSlateTier | null;
  editorialDecision: EditorialDecision | null;
  decisionNote: string | null;
  rejectedReason: string | null;
  heldReason: string | null;
  replacementOfRowId: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  editedBy: string | null;
  editedAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  publishedAt: string | null;
  isLive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  persisted: boolean;
};

export type PublishedSlateVerificationChecklist = {
  status: "not_run";
  items: string[];
};

export type PublishedSlateAuditItem = {
  id: string;
  publishedSlateId: string;
  signalPostId: string;
  finalSlateRank: number;
  finalSlateTier: FinalSlateTier;
  titleSnapshot: string;
  whyItMattersSnapshot: string;
  summarySnapshot: string;
  sourceNameSnapshot: string;
  sourceUrlSnapshot: string;
  editorialDecisionSnapshot: EditorialDecision | null;
  replacementOfRowIdSnapshot: string | null;
  decisionNoteSnapshot: string | null;
  heldReasonSnapshot: string | null;
  rejectedReasonSnapshot: string | null;
  reviewedBySnapshot: string | null;
  reviewedAtSnapshot: string | null;
  createdAt: string | null;
};

export type PublishedSlateAudit = {
  id: string;
  publishedAt: string;
  publishedBy: string | null;
  rowCount: number;
  coreCount: number;
  contextCount: number;
  previousLiveRowIds: string[];
  publishedRowIds: string[];
  rollbackNote: string | null;
  verificationChecklist: PublishedSlateVerificationChecklist | null;
  createdAt: string | null;
  items: PublishedSlateAuditItem[];
};

export type EditorialPostStatusFilter = "all" | "review" | EditorialStatus;
export type EditorialScopeFilter = "all" | "current" | "historical";

export type EditorialReviewQuery = {
  status?: EditorialPostStatusFilter;
  scope?: EditorialScopeFilter;
  date?: string | null;
  query?: string | null;
  page?: number;
};

export type EditorialReviewState =
  | {
      kind: "unauthenticated";
      sessionCookiePresent: boolean;
    }
  | {
      kind: "unauthorized";
      userEmail: string | null;
    }
  | {
      kind: "authorized";
      adminEmail: string;
      posts: EditorialSignalPost[];
      currentTopFive: EditorialSignalPost[];
      currentCandidates: EditorialSignalPost[];
      storageReady: boolean;
      warning: string | null;
      page: number;
      pageSize: number;
      totalMatchingPosts: number;
      latestBriefingDate: string | null;
      latestPublishedSlateAudit: PublishedSlateAudit | null;
      auditStorageReady: boolean;
      auditWarning: string | null;
      appliedScope: EditorialScopeFilter;
      appliedStatus: EditorialPostStatusFilter;
      appliedQuery: string;
      appliedDate: string | null;
    };

export type EditorialMutationResult = {
  ok: boolean;
  message: string;
  publishedSlateId?: string;
  code:
    | "approved"
    | "bulk_approved"
    | "decision_updated"
    | "draft_saved"
    | "empty_editorial_text"
    | "missing_public_source_url"
    | "not_admin"
    | "not_authenticated"
    | "not_found"
    | "published"
    | "publish_blocked"
    | "reset"
    | "replacement_updated"
    | "slate_updated"
    | "storage_unavailable"
    | "storage_error";
};

export type SkippedSignalPostCandidate = {
  title: string;
  candidateOrigin: string;
  pipelineRank: number;
  reason: typeof MISSING_PUBLIC_SOURCE_URL_REASON;
};

export type SignalSnapshotPersistenceResult = {
  ok: boolean;
  briefingDate: string;
  insertedCount: number;
  insertedPostIds?: string[];
  skippedCandidates?: SkippedSignalPostCandidate[];
  mode?: SignalPostPersistenceMode;
  message: string;
};

export type SignalPostPersistenceMode = "normal" | "draft_only";

export type HomepageSignalSnapshot = {
  source: "published_live" | "recent_published" | "none";
  posts: EditorialSignalPost[];
  depthPosts: EditorialSignalPost[];
  briefingDate: string | null;
  errorMessage?: string;
};

export type PublicSignalsPageState =
  | {
      kind: "published";
      posts: EditorialSignalPost[];
    }
  | {
      kind: "empty";
      posts: [];
    }
  | {
      kind: "temporarily_unavailable";
      posts: [];
    };

type SignalPostsSchemaPreflightResult =
  | {
      ok: true;
      missingColumns: [];
      message: null;
    }
  | {
      ok: false;
      missingColumns: string[];
      message: string;
    };

type SignalPostCandidateSource = {
  sourceName: string;
  sourceUrl: string;
};

type BuiltSignalPostCandidates = {
  candidates: EditorialSignalPost[];
  skippedCandidates: SkippedSignalPostCandidate[];
};

let signalPostsSchemaPreflightPromise: Promise<SignalPostsSchemaPreflightResult> | null = null;
let publicSignalPostsSchemaPreflightPromise: Promise<SignalPostsSchemaPreflightResult> | null = null;
let publicSignalPostsOptionalPlacementPreflightPromise: Promise<SignalPostsSchemaPreflightResult> | null = null;
let publishedSlateAuditSchemaPreflightPromise: Promise<SignalPostsSchemaPreflightResult> | null = null;

function buildSchemaPreflightFailure(label: string, missingColumns: string[]): SignalPostsSchemaPreflightResult {
  return {
    ok: false,
    missingColumns,
    message: `${label} schema preflight failed. Missing expected columns: ${missingColumns.join(", ")}.`,
  };
}

function buildSignalPostsSchemaPreflightFailure(missingColumns: string[]): SignalPostsSchemaPreflightResult {
  return buildSchemaPreflightFailure("signal_posts", missingColumns);
}

function buildPublishedSlateAuditSchemaPreflightFailure(missingColumns: string[]): SignalPostsSchemaPreflightResult {
  return buildSchemaPreflightFailure("published_slate audit", missingColumns);
}

function isMissingColumnError(error: unknown, column: string, tableName = "signal_posts") {
  const maybeError = error as { code?: unknown; message?: unknown; details?: unknown; hint?: unknown };
  const normalizedColumn = column.toLowerCase();
  const normalizedTableName = tableName.toLowerCase();
  const haystack = [
    maybeError.code,
    maybeError.message,
    maybeError.details,
    maybeError.hint,
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();

  return (
    haystack.includes("42703") ||
    (haystack.includes("does not exist") &&
      (haystack.includes(normalizedColumn) || haystack.includes(`${normalizedTableName}.${normalizedColumn}`))) ||
    (haystack.includes("could not find") &&
      haystack.includes(normalizedColumn) &&
      haystack.includes("column"))
  );
}

function isMissingRelationError(error: unknown, tableName: string) {
  const maybeError = error as { code?: unknown; message?: unknown; details?: unknown; hint?: unknown };
  const normalizedTableName = tableName.toLowerCase();
  const haystack = [
    maybeError.code,
    maybeError.message,
    maybeError.details,
    maybeError.hint,
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();

  return (
    haystack.includes("42p01") ||
    (haystack.includes("does not exist") && haystack.includes(normalizedTableName)) ||
    (haystack.includes("could not find") && haystack.includes(normalizedTableName))
  );
}

async function runSignalPostsSchemaPreflight(
  client: EditorialClient,
  input: {
    columns?: string[];
    label?: string;
    failureBuilder?: (missingColumns: string[]) => SignalPostsSchemaPreflightResult;
    logLevel?: "warn" | "error";
  } = {},
): Promise<SignalPostsSchemaPreflightResult> {
  const columns = input.columns ?? ADMIN_SIGNAL_POST_REQUIRED_COLUMNS;
  const label = input.label ?? "signal_posts schema preflight";
  const missingColumns: string[] = [];
  const errorMessages: string[] = [];
  const nonSchemaErrorMessages: string[] = [];

  for (const column of columns) {
    const result = await client.from("signal_posts").select(column).limit(0);

    if (result.error && isMissingColumnError(result.error, column)) {
      missingColumns.push(column);
      errorMessages.push(`${column}: ${result.error.message}`);
    } else if (result.error) {
      nonSchemaErrorMessages.push(`${column}: ${result.error.message}`);
    }
  }

  if (nonSchemaErrorMessages.length > 0 && missingColumns.length === 0) {
    logServerEvent("warn", `${label} could not verify columns`, {
      errorMessages: nonSchemaErrorMessages,
    });
  }

  if (missingColumns.length === 0) {
    return {
      ok: true,
      missingColumns: [],
      message: null,
    };
  }

  const failure = input.failureBuilder
    ? input.failureBuilder(missingColumns)
    : buildSignalPostsSchemaPreflightFailure(missingColumns);

  logServerEvent(input.logLevel ?? "error", `${label} failed`, {
    missingColumns,
    errorMessages,
  });

  return failure;
}

function getSignalPostsSchemaPreflight(
  client: EditorialClient,
): Promise<SignalPostsSchemaPreflightResult> {
  signalPostsSchemaPreflightPromise ??= runSignalPostsSchemaPreflight(client);
  return signalPostsSchemaPreflightPromise;
}

function getPublicSignalPostsSchemaPreflight(
  client: EditorialClient,
): Promise<SignalPostsSchemaPreflightResult> {
  publicSignalPostsSchemaPreflightPromise ??= runSignalPostsSchemaPreflight(client, {
    columns: PUBLIC_SIGNAL_POST_REQUIRED_COLUMNS,
    label: "public signal_posts schema preflight",
    failureBuilder: (missingColumns) => buildSchemaPreflightFailure("public signal_posts", missingColumns),
    logLevel: "warn",
  });
  return publicSignalPostsSchemaPreflightPromise;
}

function getPublicSignalPostsOptionalPlacementPreflight(
  client: EditorialClient,
): Promise<SignalPostsSchemaPreflightResult> {
  publicSignalPostsOptionalPlacementPreflightPromise ??= runSignalPostsSchemaPreflight(client, {
    columns: PUBLIC_SIGNAL_POST_OPTIONAL_PLACEMENT_COLUMNS,
    label: "public optional signal_posts placement preflight",
    failureBuilder: (missingColumns) =>
      buildSchemaPreflightFailure("public optional signal_posts placement", missingColumns),
    logLevel: "warn",
  });
  return publicSignalPostsOptionalPlacementPreflightPromise;
}

async function runPublishedSlateAuditSchemaPreflight(
  client: EditorialClient,
): Promise<SignalPostsSchemaPreflightResult> {
  const missingColumns: string[] = [];
  const errorMessages: string[] = [];
  const nonSchemaErrorMessages: string[] = [];
  const requiredChecks = [
    {
      tableName: "published_slates",
      columns: PUBLISHED_SLATE_REQUIRED_COLUMNS,
    },
    {
      tableName: "published_slate_items",
      columns: PUBLISHED_SLATE_ITEM_REQUIRED_COLUMNS,
    },
  ];

  for (const check of requiredChecks) {
    for (const column of check.columns) {
      const result = await client.from(check.tableName).select(column).limit(0);
      const qualifiedColumn = `${check.tableName}.${column}`;

      if (result.error && isMissingRelationError(result.error, check.tableName)) {
        missingColumns.push(`${check.tableName}.*`);
        errorMessages.push(`${check.tableName}: ${result.error.message}`);
        break;
      }

      if (result.error && isMissingColumnError(result.error, column, check.tableName)) {
        missingColumns.push(qualifiedColumn);
        errorMessages.push(`${qualifiedColumn}: ${result.error.message}`);
      } else if (result.error) {
        nonSchemaErrorMessages.push(`${qualifiedColumn}: ${result.error.message}`);
      }
    }
  }

  if (nonSchemaErrorMessages.length > 0 && missingColumns.length === 0) {
    logServerEvent("warn", "published slate audit schema preflight could not verify columns", {
      errorMessages: nonSchemaErrorMessages,
    });
  }

  if (missingColumns.length === 0) {
    return {
      ok: true,
      missingColumns: [],
      message: null,
    };
  }

  const failure = buildPublishedSlateAuditSchemaPreflightFailure(missingColumns);

  logServerEvent("error", "published slate audit schema preflight failed", {
    missingColumns,
    errorMessages,
  });

  return failure;
}

function getPublishedSlateAuditSchemaPreflight(
  client: EditorialClient,
): Promise<SignalPostsSchemaPreflightResult> {
  publishedSlateAuditSchemaPreflightPromise ??= runPublishedSlateAuditSchemaPreflight(client);
  return publishedSlateAuditSchemaPreflightPromise;
}

function normalizeEditorialText(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function normalizePublicSourceUrl(value: string | null | undefined) {
  const normalized = normalizeEditorialText(value);
  return isValidPublicSourceUrl(normalized) ? normalized : "";
}

function buildMissingPublicSourceUrlMessage(action: string) {
  return `${MISSING_PUBLIC_SOURCE_URL_REASON}: Add a valid public source URL before ${action}.`;
}

function normalizeDateValue(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : null;
}

function normalizeSearchQuery(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function normalizeDecisionNote(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function isBlockingEditorialDecision(value: EditorialDecision | string | null | undefined) {
  return (
    value === "rejected" ||
    value === "held" ||
    value === "rewrite_requested" ||
    value === "removed_from_slate"
  );
}

function isPubliclyAllowedEditorialDecision(value: EditorialDecision | string | null | undefined) {
  return value === null || value === undefined || value === "approved" || value === "draft_edited";
}

function normalizePageNumber(page?: number) {
  return Number.isFinite(page) && page && page > 0 ? Math.floor(page) : 1;
}

function captureRssEditorialStorageFailure(input: {
  failureType: Extract<RssFailureType, "rss_cache_read_failed" | "rss_cache_write_failed">;
  phase: Extract<RssPhase, "store" | "publish">;
  operation: string;
  message: string;
  route?: string;
  briefingDate?: string | null;
  postId?: string;
  postCount?: number;
}) {
  captureRssFailure(new Error(input.message), {
    failureType: input.failureType,
    phase: input.phase,
    level: "error",
    message: input.message,
    extra: {
      operation: input.operation,
      route: input.route ?? SIGNALS_EDITORIAL_ROUTE,
      briefingDate: input.briefingDate ?? undefined,
      postId: input.postId,
      postCount: input.postCount,
    },
  });
}

function mapStoredSignalPost(row: StoredSignalPost): EditorialSignalPost {
  return {
    id: row.id,
    briefingDate: row.briefing_date,
    rank: row.rank,
    title: row.title,
    sourceName: row.source_name ?? "",
    sourceUrl: row.source_url ?? "",
    summary: row.summary ?? "",
    tags: row.tags ?? [],
    signalScore: row.signal_score,
    selectionReason: row.selection_reason ?? "",
    aiWhyItMatters: row.ai_why_it_matters ?? "",
    editedWhyItMatters: row.edited_why_it_matters,
    publishedWhyItMatters: row.published_why_it_matters,
    editedWhyItMattersStructured: parseEditorialWhyItMattersContent(row.edited_why_it_matters_payload),
    publishedWhyItMattersStructured: parseEditorialWhyItMattersContent(row.published_why_it_matters_payload),
    whyItMattersValidationStatus: row.why_it_matters_validation_status ?? "passed",
    whyItMattersValidationFailures: row.why_it_matters_validation_failures ?? [],
    whyItMattersValidationDetails: row.why_it_matters_validation_details ?? [],
    whyItMattersValidatedAt: row.why_it_matters_validated_at,
    editorialStatus: row.editorial_status,
    finalSlateRank: row.final_slate_rank,
    finalSlateTier: row.final_slate_tier,
    editorialDecision: row.editorial_decision,
    decisionNote: row.decision_note,
    rejectedReason: row.rejected_reason,
    heldReason: row.held_reason,
    replacementOfRowId: row.replacement_of_row_id,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    editedBy: row.edited_by,
    editedAt: row.edited_at,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    publishedAt: row.published_at,
    isLive: Boolean(row.is_live),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    persisted: true,
  };
}

function mapStoredPublicSignalPost(row: Partial<StoredSignalPost> & Pick<
  StoredSignalPost,
  | "id"
  | "briefing_date"
  | "rank"
  | "title"
  | "source_name"
  | "source_url"
  | "summary"
  | "tags"
  | "signal_score"
  | "selection_reason"
  | "published_why_it_matters"
  | "published_why_it_matters_payload"
  | "why_it_matters_validation_status"
  | "why_it_matters_validation_failures"
  | "why_it_matters_validation_details"
  | "why_it_matters_validated_at"
  | "editorial_status"
  | "published_at"
  | "is_live"
  | "created_at"
  | "updated_at"
>) {
  return mapStoredSignalPost({
    ai_why_it_matters: "",
    edited_why_it_matters: null,
    edited_why_it_matters_payload: null,
    final_slate_rank: null,
    final_slate_tier: null,
    editorial_decision: null,
    decision_note: null,
    rejected_reason: null,
    held_reason: null,
    replacement_of_row_id: null,
    reviewed_by: null,
    reviewed_at: null,
    edited_by: null,
    edited_at: null,
    approved_by: null,
    approved_at: null,
    ...row,
  });
}

function normalizeStringArrayFromJson(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return normalizeStringArrayFromJson(parsed);
    } catch {
      return [];
    }
  }

  return [];
}

function parsePublishedSlateVerificationChecklist(value: unknown): PublishedSlateVerificationChecklist | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as { status?: unknown; items?: unknown };

  if (candidate.status !== "not_run" || !Array.isArray(candidate.items)) {
    return null;
  }

  return {
    status: "not_run",
    items: candidate.items.filter((item): item is string => typeof item === "string"),
  };
}

function mapStoredPublishedSlateItem(row: StoredPublishedSlateItem): PublishedSlateAuditItem {
  return {
    id: row.id,
    publishedSlateId: row.published_slate_id,
    signalPostId: row.signal_post_id,
    finalSlateRank: row.final_slate_rank,
    finalSlateTier: row.final_slate_tier,
    titleSnapshot: row.title_snapshot,
    whyItMattersSnapshot: row.why_it_matters_snapshot,
    summarySnapshot: row.summary_snapshot ?? "",
    sourceNameSnapshot: row.source_name_snapshot ?? "",
    sourceUrlSnapshot: row.source_url_snapshot ?? "",
    editorialDecisionSnapshot: row.editorial_decision_snapshot,
    replacementOfRowIdSnapshot: row.replacement_of_row_id_snapshot,
    decisionNoteSnapshot: row.decision_note_snapshot,
    heldReasonSnapshot: row.held_reason_snapshot,
    rejectedReasonSnapshot: row.rejected_reason_snapshot,
    reviewedBySnapshot: row.reviewed_by_snapshot,
    reviewedAtSnapshot: row.reviewed_at_snapshot,
    createdAt: row.created_at,
  };
}

function mapStoredPublishedSlate(
  row: StoredPublishedSlate,
  items: StoredPublishedSlateItem[],
): PublishedSlateAudit {
  return {
    id: row.id,
    publishedAt: row.published_at,
    publishedBy: row.published_by,
    rowCount: row.row_count,
    coreCount: row.core_count,
    contextCount: row.context_count,
    previousLiveRowIds: normalizeStringArrayFromJson(row.previous_live_row_ids),
    publishedRowIds: normalizeStringArrayFromJson(row.published_row_ids),
    rollbackNote: row.rollback_note,
    verificationChecklist: parsePublishedSlateVerificationChecklist(row.verification_checklist_json),
    createdAt: row.created_at,
    items: items
      .slice()
      .sort((left, right) => left.final_slate_rank - right.final_slate_rank)
      .map(mapStoredPublishedSlateItem),
  };
}

// Converts MVP BriefingItem view-models into signal_posts placement candidates.
// The persisted rows are editorial/public placement rows, not durable Signal
// history or Phase 2 progression identity.
function mapBriefingItemToSignalPost(
  item: BriefingItem,
  index: number,
  source: SignalPostCandidateSource,
): EditorialSignalPost {
  const tags = [
    item.topicName,
    item.signalRole,
    item.importanceLabel,
  ].filter((value): value is string => Boolean(value));
  const aiWhyItMatters = normalizeEditorialText(item.aiWhyItMatters ?? item.whyItMatters);
  const validation = item.whyItMattersValidation ?? validateWhyItMatters(aiWhyItMatters, {
    title: item.title,
    eligibilityTier: item.selectionEligibility?.tier ?? "core_signal_eligible",
    contentAccessibility: item.selectionEligibility?.contentAccessibility ?? null,
    accessibleTextLength: item.selectionEligibility?.accessibleTextLength ?? null,
    eventType: item.selectionEligibility?.eventType ?? item.eventIntelligence?.eventType ?? null,
  });

  return {
    id: `candidate-${index + 1}`,
    briefingDate: null,
    rank: index + 1,
    title: item.title,
    sourceName: source.sourceName,
    sourceUrl: source.sourceUrl,
    summary: item.whatHappened,
    tags,
    signalScore: item.importanceScore ?? item.matchScore ?? null,
    selectionReason: item.rankingSignals?.[0] ?? "",
    aiWhyItMatters,
    editedWhyItMatters: null,
    publishedWhyItMatters: null,
    editedWhyItMattersStructured: null,
    publishedWhyItMattersStructured: null,
    whyItMattersValidationStatus: getValidationStatus(validation),
    whyItMattersValidationFailures: validation.failures,
    whyItMattersValidationDetails: validation.failureDetails,
    whyItMattersValidatedAt: new Date().toISOString(),
    editorialStatus: "needs_review",
    finalSlateRank: null,
    finalSlateTier: null,
    editorialDecision: "pending_review",
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
    createdAt: null,
    updatedAt: null,
    persisted: false,
  };
}

function getValidationStatus(validation: WhyItMattersValidationResult): WhyItMattersReviewStatus {
  return validation.passed ? "passed" : "requires_human_rewrite";
}

function buildWhyItMattersValidationFields(validation: WhyItMattersValidationResult, validatedAt: string) {
  return {
    why_it_matters_validation_status: getValidationStatus(validation),
    why_it_matters_validation_failures: validation.failures,
    why_it_matters_validation_details: validation.failureDetails,
    why_it_matters_validated_at: validatedAt,
  };
}

function getValidationFailureMessage(validation: WhyItMattersValidationResult) {
  const details = validation.failureDetails.slice(0, 3).join("; ");
  return details
    ? `Why it matters requires a human rewrite before publishing: ${details}`
    : "Why it matters requires a human rewrite before publishing.";
}

function getBriefingItemSourceCandidates(item: BriefingItem): SignalPostCandidateSource[] {
  return [
    ...item.sources.map((source) => ({
      sourceName: normalizeEditorialText(source.title) || "Unknown source",
      sourceUrl: normalizeEditorialText(source.url),
    })),
    ...(item.relatedArticles ?? []).map((article) => ({
      sourceName: normalizeEditorialText(article.sourceName || article.title) || "Unknown source",
      sourceUrl: normalizeEditorialText(article.url),
    })),
  ];
}

function selectPublicSourceForBriefingItem(item: BriefingItem): SignalPostCandidateSource | null {
  const source = getBriefingItemSourceCandidates(item).find((candidate) =>
    isValidPublicSourceUrl(candidate.sourceUrl),
  );

  if (!source) {
    return null;
  }

  return {
    sourceName: source.sourceName,
    sourceUrl: normalizePublicSourceUrl(source.sourceUrl),
  };
}

function buildSkippedCandidateForBriefingItem(
  item: BriefingItem,
  pipelineRank: number,
): SkippedSignalPostCandidate {
  const origin = getBriefingItemSourceCandidates(item)[0]?.sourceName ?? item.topicName ?? "unknown";

  return {
    title: item.title,
    candidateOrigin: origin,
    pipelineRank,
    reason: MISSING_PUBLIC_SOURCE_URL_REASON,
  };
}

function buildSkippedCandidateForSignalPost(post: EditorialSignalPost): SkippedSignalPostCandidate {
  return {
    title: post.title,
    candidateOrigin: post.sourceName || "unknown",
    pipelineRank: post.rank,
    reason: MISSING_PUBLIC_SOURCE_URL_REASON,
  };
}

function buildSignalPostCandidates(items: BriefingItem[]): BuiltSignalPostCandidates {
  const candidates: EditorialSignalPost[] = [];
  const skippedCandidates: SkippedSignalPostCandidate[] = [];

  items.slice(0, SIGNAL_POST_CANDIDATE_DEPTH_LIMIT).forEach((item, index) => {
    const source = selectPublicSourceForBriefingItem(item);

    if (!source) {
      skippedCandidates.push(buildSkippedCandidateForBriefingItem(item, index + 1));
      return;
    }

    candidates.push(mapBriefingItemToSignalPost(item, index, source));
  });

  return {
    candidates,
    skippedCandidates,
  };
}

function parseEditorialSortTime(value: string | null | undefined) {
  const timestamp = Date.parse(value ?? "");
  return Number.isFinite(timestamp) ? timestamp : null;
}

function compareTimestampDescending(left: string | null | undefined, right: string | null | undefined) {
  const leftTime = parseEditorialSortTime(left);
  const rightTime = parseEditorialSortTime(right);

  if (leftTime === null && rightTime === null) {
    return 0;
  }

  if (leftTime === null) {
    return 1;
  }

  if (rightTime === null) {
    return -1;
  }

  return rightTime - leftTime;
}

function compareNumberDescending(left: number | null | undefined, right: number | null | undefined) {
  const leftValue = typeof left === "number" && Number.isFinite(left) ? left : null;
  const rightValue = typeof right === "number" && Number.isFinite(right) ? right : null;

  if (leftValue === null && rightValue === null) {
    return 0;
  }

  if (leftValue === null) {
    return 1;
  }

  if (rightValue === null) {
    return -1;
  }

  return rightValue - leftValue;
}

function compareEditorialHistoryPosts(left: EditorialSignalPost, right: EditorialSignalPost) {
  const briefingDateComparison = compareTimestampDescending(left.briefingDate, right.briefingDate);

  if (briefingDateComparison !== 0) {
    return briefingDateComparison;
  }

  const publishedComparison = compareTimestampDescending(left.publishedAt, right.publishedAt);

  if (publishedComparison !== 0) {
    return publishedComparison;
  }

  const scoreComparison = compareNumberDescending(left.signalScore, right.signalScore);

  if (scoreComparison !== 0) {
    return scoreComparison;
  }

  const createdComparison = compareTimestampDescending(left.createdAt, right.createdAt);

  if (createdComparison !== 0) {
    return createdComparison;
  }

  const updatedComparison = compareTimestampDescending(left.updatedAt, right.updatedAt);

  if (updatedComparison !== 0) {
    return updatedComparison;
  }

  return left.id.localeCompare(right.id);
}

export function sortEditorialHistoryPostsReverseChronological(posts: EditorialSignalPost[]) {
  return posts.slice().sort(compareEditorialHistoryPosts);
}

async function loadStoredSignalPosts(
  client: EditorialClient,
  input: {
    status: EditorialPostStatusFilter;
    scope: EditorialScopeFilter;
    query: string;
    date: string | null;
    page: number;
    latestBriefingDate: string | null;
  },
) {
  let queryBuilder = client
    .from("signal_posts")
    .select(SIGNAL_POST_SELECT, { count: "exact" });

  if (input.date) {
    queryBuilder = queryBuilder.eq("briefing_date", input.date);
  } else if (input.scope === "current" && input.latestBriefingDate) {
    queryBuilder = queryBuilder.eq("briefing_date", input.latestBriefingDate);
  } else if (input.scope === "historical" && input.latestBriefingDate) {
    queryBuilder = queryBuilder.lt("briefing_date", input.latestBriefingDate);
  }

  if (input.status === "review") {
    queryBuilder = queryBuilder.in("editorial_status", ["draft", "needs_review"]);
  } else if (input.status !== "all") {
    queryBuilder = queryBuilder.eq("editorial_status", input.status);
  }

  if (input.query) {
    const escaped = input.query.replace(/[%_,]/g, "");
    queryBuilder = queryBuilder.or(`title.ilike.%${escaped}%,source_name.ilike.%${escaped}%`);
  }

  const from = (input.page - 1) * EDITORIAL_PAGE_SIZE;
  const to = from + EDITORIAL_PAGE_SIZE - 1;
  const result = await queryBuilder
    .order("briefing_date", { ascending: false, nullsFirst: false })
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("signal_score", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: true })
    .range(from, to);

  if (result.error) {
    return {
      posts: [],
      totalCount: 0,
      errorMessage: result.error.message,
    };
  }

  return {
    posts: sortEditorialHistoryPostsReverseChronological(
      ((result.data ?? []) as unknown as StoredSignalPost[]).map(mapStoredSignalPost),
    ),
    totalCount: result.count ?? 0,
    errorMessage: null,
  };
}

async function persistSignalPostCandidates(
  client: EditorialClient,
  input: {
    briefingDate: string;
    candidates: EditorialSignalPost[];
    skippedCandidates?: SkippedSignalPostCandidate[];
    mode?: SignalPostPersistenceMode;
  },
): Promise<SignalSnapshotPersistenceResult> {
  const briefingDate = normalizeDateValue(input.briefingDate) ?? new Date().toISOString().slice(0, 10);
  const mode = input.mode ?? "normal";
  const preSkippedCandidates = input.skippedCandidates ?? [];
  const sourceReadyCandidates = input.candidates.filter((post) =>
    isValidPublicSourceUrl(post.sourceUrl),
  );
  const skippedCandidates = [
    ...preSkippedCandidates,
    ...input.candidates
      .filter((post) => !isValidPublicSourceUrl(post.sourceUrl))
      .map(buildSkippedCandidateForSignalPost),
  ];

  if (sourceReadyCandidates.length === 0) {
    return {
      ok: false,
      briefingDate,
      insertedCount: 0,
      mode,
      skippedCandidates,
      message: skippedCandidates.length > 0
        ? `No signal posts were persisted because ${skippedCandidates.length} candidate(s) were missing a valid public source URL.`
        : "The current signal pipeline returned no structurally eligible signal posts for editorial review.",
    };
  }

  if (mode !== "draft_only" && sourceReadyCandidates.length < TOP_SIGNAL_SET_SIZE) {
    return {
      ok: false,
      briefingDate,
      insertedCount: 0,
      skippedCandidates,
      message: `The current signal pipeline returned ${sourceReadyCandidates.length} source-ready signal posts. Persisting the daily snapshot requires at least five.`,
    };
  }

  const existingResult = await client
    .from("signal_posts")
    .select("id, rank, selection_reason, editorial_status, final_slate_rank, is_live, published_at")
    .eq("briefing_date", briefingDate);

  if (existingResult.error) {
    captureRssEditorialStorageFailure({
      failureType: "rss_cache_read_failed",
      phase: "store",
      operation: "check_existing_signal_snapshot",
      briefingDate,
      message: "RSS signal snapshot storage could not be checked before persistence.",
    });

    return {
      ok: false,
      briefingDate,
      insertedCount: 0,
      skippedCandidates,
      message: `The current signal snapshot could not be checked: ${existingResult.error.message}`,
    };
  }

  const existingRows = ((existingResult.data ?? []) as ExistingSignalSnapshotRow[]);
  const newsletterRankReservation = await reserveNewsletterCandidateRanksForRssSnapshot(
    client,
    existingRows,
  );

  if (!newsletterRankReservation.ok) {
    return {
      ok: false,
      briefingDate,
      insertedCount: 0,
      skippedCandidates,
      mode,
      message: newsletterRankReservation.message,
    };
  }

  const candidatesForPersistence = sourceReadyCandidates.filter((post) =>
    !newsletterRankReservation.reservedRanks.has(post.rank),
  );
  const existingRanks = new Set(
    newsletterRankReservation.rows
      .map((row) => row.rank)
      .filter((rank): rank is number => typeof rank === "number"),
  );
  const missingCandidates = candidatesForPersistence.filter((post) => !existingRanks.has(post.rank));

  if (missingCandidates.length === 0) {
    return {
      ok: true,
      briefingDate,
      insertedCount: 0,
      insertedPostIds: [],
      skippedCandidates,
      mode,
      message: "The daily signal snapshot already exists for this briefing date.",
    };
  }

  const now = new Date().toISOString();

  const insertResult = await client.from("signal_posts").insert(
    missingCandidates.map((post) => ({
      briefing_date: briefingDate,
      rank: post.rank,
      title: post.title,
      source_name: post.sourceName,
      source_url: post.sourceUrl,
      summary: post.summary,
      tags: post.tags,
      signal_score: post.signalScore,
      selection_reason: post.selectionReason,
      ai_why_it_matters: post.aiWhyItMatters,
      why_it_matters_validation_status: post.whyItMattersValidationStatus,
      why_it_matters_validation_failures: post.whyItMattersValidationFailures,
      why_it_matters_validation_details: post.whyItMattersValidationDetails,
      why_it_matters_validated_at: now,
      editorial_status: "needs_review",
      final_slate_rank: null,
      final_slate_tier: null,
      editorial_decision: "pending_review",
      decision_note: null,
      rejected_reason: null,
      held_reason: null,
      replacement_of_row_id: null,
      reviewed_by: null,
      reviewed_at: null,
      published_at: null,
      is_live: false,
      created_at: now,
      updated_at: now,
    })),
  ).select("id");

  if (insertResult.error) {
    captureRssEditorialStorageFailure({
      failureType: "rss_cache_write_failed",
      phase: "store",
      operation: "insert_signal_snapshot",
      briefingDate,
      postCount: missingCandidates.length,
      message: "Current RSS Top 5 snapshot could not be persisted for editing.",
    });

    return {
      ok: false,
      briefingDate,
      insertedCount: 0,
      skippedCandidates,
      message: `The current Top 5 could not be persisted for editing: ${insertResult.error.message}`,
    };
  }

  return {
    ok: true,
    briefingDate,
    insertedCount: missingCandidates.length,
    insertedPostIds: ((insertResult.data ?? []) as Array<{ id: string | null }>)
      .map((row) => row.id)
      .filter((id): id is string => Boolean(id)),
    skippedCandidates,
    mode,
    message:
      buildSignalPostPersistenceMessage(
        missingCandidates.length,
        newsletterRankReservation.reservedRanks.size,
      ),
  };
}

type ExistingSignalSnapshotRow = {
  id: string;
  rank: number | null;
  selection_reason: string | null;
  editorial_status: string | null;
  final_slate_rank: number | null;
  is_live: boolean | null;
  published_at: string | null;
};

type NewsletterRankReservationResult =
  | {
      ok: true;
      rows: ExistingSignalSnapshotRow[];
      reservedRanks: Set<number>;
    }
  | {
      ok: false;
      message: string;
    };

function isMovableNewsletterDiscoveryRow(row: ExistingSignalSnapshotRow) {
  return (
    row.selection_reason === NEWSLETTER_DISCOVERY_SELECTION_REASON &&
    typeof row.rank === "number" &&
    !row.is_live &&
    row.editorial_status !== "published" &&
    !row.published_at &&
    row.final_slate_rank === null
  );
}

async function reserveNewsletterCandidateRanksForRssSnapshot(
  client: EditorialClient,
  existingRows: ExistingSignalSnapshotRow[],
): Promise<NewsletterRankReservationResult> {
  const movableNewsletterRows = existingRows
    .filter(isMovableNewsletterDiscoveryRow)
    .sort((left, right) => (left.rank ?? 0) - (right.rank ?? 0));

  if (movableNewsletterRows.length === 0) {
    return {
      ok: true,
      rows: existingRows,
      reservedRanks: new Set<number>(),
    };
  }

  const movableNewsletterIds = new Set(movableNewsletterRows.map((row) => row.id));
  const fixedRanks = new Set(
    existingRows
      .filter((row) => !movableNewsletterIds.has(row.id))
      .map((row) => row.rank)
      .filter((rank): rank is number => typeof rank === "number"),
  );
  const targetRanks: number[] = [];

  for (let rank = SIGNAL_POST_CANDIDATE_DEPTH_LIMIT; rank >= 1; rank -= 1) {
    if (!fixedRanks.has(rank)) {
      targetRanks.push(rank);
    }

    if (targetRanks.length === movableNewsletterRows.length) {
      break;
    }
  }

  if (targetRanks.length < movableNewsletterRows.length) {
    return {
      ok: false,
      message:
        "RSS signal snapshot could not reserve rank space for existing newsletter candidates. No rows were changed.",
    };
  }

  targetRanks.sort((left, right) => left - right);
  const updatedRows = existingRows.map((row) => ({ ...row }));
  const rowsById = new Map(updatedRows.map((row) => [row.id, row]));

  const rankAssignments = movableNewsletterRows
    .map((newsletterRow, index) => ({
      newsletterRow,
      targetRank: targetRanks[index],
    }))
    .filter((assignment): assignment is { newsletterRow: ExistingSignalSnapshotRow; targetRank: number } =>
      typeof assignment.targetRank === "number"
    )
    .sort((left, right) => right.targetRank - left.targetRank);

  for (const { newsletterRow, targetRank } of rankAssignments) {
    const mutableRow = rowsById.get(newsletterRow.id);

    if (!mutableRow || mutableRow.rank === targetRank) {
      continue;
    }

    const updateResult = await client
      .from("signal_posts")
      .update({ rank: targetRank })
      .eq("id", newsletterRow.id);

    if (updateResult.error) {
      return {
        ok: false,
        message: `RSS signal snapshot could not reserve newsletter candidate rank space: ${updateResult.error.message}`,
      };
    }

    mutableRow.rank = targetRank;
  }

  return {
    ok: true,
    rows: updatedRows,
    reservedRanks: new Set(targetRanks),
  };
}

function buildSignalPostPersistenceMessage(insertedCount: number, reservedNewsletterRankCount: number) {
  const baseMessage = insertedCount === TOP_SIGNAL_SET_SIZE
    ? "Persisted a new daily Top 5 snapshot for editorial review."
    : `Persisted ${insertedCount} missing signal snapshot rows for editorial review.`;

  if (reservedNewsletterRankCount === 0) {
    return baseMessage;
  }

  return `${baseMessage} Reserved ${reservedNewsletterRankCount} newsletter discovery candidate rank(s) outside the RSS snapshot range.`;
}

export async function persistSignalPostsForBriefing(input: {
  briefingDate: string;
  items: BriefingItem[];
  mode?: SignalPostPersistenceMode;
}): Promise<SignalSnapshotPersistenceResult> {
  const client = createSupabaseServiceRoleClient();
  const briefingDate = normalizeDateValue(input.briefingDate) ?? new Date().toISOString().slice(0, 10);

  if (!client) {
    return {
      ok: false,
      briefingDate,
      insertedCount: 0,
      message: "Editorial storage is unavailable. Configure Supabase and SUPABASE_SERVICE_ROLE_KEY.",
    };
  }

  const schemaPreflight = await getSignalPostsSchemaPreflight(client);

  if (!schemaPreflight.ok) {
    return {
      ok: false,
      briefingDate,
      insertedCount: 0,
      message: schemaPreflight.message,
    };
  }

  const builtCandidates = buildSignalPostCandidates(input.items);

  return persistSignalPostCandidates(client, {
    briefingDate: input.briefingDate,
    candidates: builtCandidates.candidates,
    skippedCandidates: builtCandidates.skippedCandidates,
    mode: input.mode,
  });
}

async function getLatestBriefingDate(client: EditorialClient) {
  const result = await client
    .from("signal_posts")
    .select("briefing_date")
    .order("briefing_date", { ascending: false })
    .limit(1);

  if (result.error) {
    return {
      latestBriefingDate: null,
      errorMessage: result.error.message,
    };
  }

  const row = ((result.data ?? []) as Array<{ briefing_date: string | null }>)[0];
  return {
    latestBriefingDate: row?.briefing_date ?? null,
    errorMessage: null,
  };
}

async function loadCurrentSignalDepth(client: EditorialClient, briefingDate: string | null) {
  if (!briefingDate) {
    return [];
  }

  const result = await client
    .from("signal_posts")
    .select(SIGNAL_POST_SELECT)
    .eq("briefing_date", briefingDate)
    .order("rank", { ascending: true })
    .limit(SIGNAL_POST_CANDIDATE_DEPTH_LIMIT);

  if (result.error) {
    return [];
  }

  return ((result.data ?? []) as unknown as StoredSignalPost[]).map(mapStoredSignalPost);
}

async function loadLatestPublishedSlateAudit(client: EditorialClient): Promise<{
  audit: PublishedSlateAudit | null;
  errorMessage: string | null;
}> {
  const slateResult = await client
    .from("published_slates")
    .select(PUBLISHED_SLATE_SELECT)
    .order("published_at", { ascending: false })
    .limit(1);

  if (slateResult.error) {
    return {
      audit: null,
      errorMessage: slateResult.error.message,
    };
  }

  const slate = ((slateResult.data ?? []) as unknown as StoredPublishedSlate[])[0];

  if (!slate) {
    return {
      audit: null,
      errorMessage: null,
    };
  }

  const itemResult = await client
    .from("published_slate_items")
    .select(PUBLISHED_SLATE_ITEM_SELECT)
    .eq("published_slate_id", slate.id)
    .order("final_slate_rank", { ascending: true });

  if (itemResult.error) {
    return {
      audit: null,
      errorMessage: itemResult.error.message,
    };
  }

  return {
    audit: mapStoredPublishedSlate(
      slate,
      (itemResult.data ?? []) as unknown as StoredPublishedSlateItem[],
    ),
    errorMessage: null,
  };
}

function selectPublishedEditorialWhyItMatters(post: EditorialSignalPost) {
  if (post.editorialStatus !== "published") {
    return "";
  }

  if (!isPubliclyAllowedEditorialDecision(post.editorialDecision)) {
    return "";
  }

  if (post.whyItMattersValidationStatus === "requires_human_rewrite") {
    return "";
  }

  return normalizeEditorialText(post.publishedWhyItMatters);
}

function getPublicSlateRank(post: EditorialSignalPost) {
  if (isFinalSlateRank(post.finalSlateRank)) {
    return post.finalSlateRank;
  }

  return isFinalSlateRank(post.rank) ? post.rank : null;
}

function isPublicSlatePost(post: EditorialSignalPost) {
  return Boolean(selectPublishedEditorialWhyItMatters(post) && getPublicSlateRank(post));
}

function comparePublicSlatePosts(left: EditorialSignalPost, right: EditorialSignalPost) {
  const leftRank = getPublicSlateRank(left) ?? Number.MAX_SAFE_INTEGER;
  const rightRank = getPublicSlateRank(right) ?? Number.MAX_SAFE_INTEGER;

  if (leftRank !== rightRank) {
    return leftRank - rightRank;
  }

  return left.rank - right.rank;
}

function selectPublicSlatePosts(posts: EditorialSignalPost[], limit: number) {
  return posts
    .filter(isPublicSlatePost)
    .sort(comparePublicSlatePosts)
    .slice(0, limit);
}

async function loadMostRecentPublishedHomepageSnapshot(
  client: EditorialClient,
  limit: number,
  selectColumns: string,
) {
  const result = await client
    .from("signal_posts")
    .select(selectColumns)
    .eq("is_live", true)
    .eq("editorial_status", "published")
    .not("published_at", "is", null)
    .order("briefing_date", { ascending: false })
    .order("published_at", { ascending: false })
    .order("rank", { ascending: true })
    .limit(100);

  if (result.error) {
    return {
      briefingDate: null,
      posts: [] as EditorialSignalPost[],
      errorMessage: result.error.message,
    };
  }

  const publishedPosts = ((result.data ?? []) as unknown as Array<Parameters<typeof mapStoredPublicSignalPost>[0]>)
    .map(mapStoredPublicSignalPost)
    .filter(isPublicSlatePost);
  const briefingDate = publishedPosts[0]?.briefingDate ?? null;

  return {
    briefingDate,
    posts: briefingDate
      ? selectPublicSlatePosts(
          publishedPosts.filter((post) => post.briefingDate === briefingDate),
          limit,
        )
      : [],
    errorMessage: null,
  };
}

async function loadPublicHomepageSnapshotFast(client: EditorialClient, limit: number) {
  const snapshot = await loadMostRecentPublishedHomepageSnapshot(
    client,
    limit,
    PUBLIC_SIGNAL_POST_WITH_OPTIONAL_PLACEMENT_SELECT,
  );

  if (
    snapshot.errorMessage &&
    PUBLIC_SIGNAL_POST_OPTIONAL_PLACEMENT_COLUMNS.some((column) =>
      isMissingColumnError({ message: snapshot.errorMessage }, column),
    )
  ) {
    return loadMostRecentPublishedHomepageSnapshot(client, limit, PUBLIC_SIGNAL_POST_BASE_SELECT);
  }

  return snapshot;
}

async function getPublicSignalPostSelect(client: EditorialClient) {
  const schemaPreflight = await getPublicSignalPostsSchemaPreflight(client);

  if (!schemaPreflight.ok) {
    return {
      ok: false as const,
      selectColumns: null,
      errorMessage: schemaPreflight.message,
    };
  }

  const optionalPlacementPreflight = await getPublicSignalPostsOptionalPlacementPreflight(client);

  return {
    ok: true as const,
    selectColumns: optionalPlacementPreflight.ok
      ? PUBLIC_SIGNAL_POST_WITH_OPTIONAL_PLACEMENT_SELECT
      : PUBLIC_SIGNAL_POST_BASE_SELECT,
    errorMessage: null,
  };
}

async function getAdminEditorialContext(route: string): Promise<
  | {
      ok: true;
      client: EditorialClient;
      user: User;
    }
  | {
      ok: false;
      code: EditorialMutationResult["code"];
      message: string;
      userEmail?: string | null;
      sessionCookiePresent?: boolean;
    }
> {
  const { user, sessionCookiePresent } = await safeGetUser(route);

  if (!user) {
    return {
      ok: false,
      code: "not_authenticated",
      message: "Sign in with an admin/editor account to continue.",
      sessionCookiePresent,
    };
  }

  if (!isAdminUser(user)) {
    return {
      ok: false,
      code: "not_admin",
      message: "This account is not authorized for editorial review.",
      userEmail: user.email ?? null,
    };
  }

  const client = createSupabaseServiceRoleClient();

  if (!client) {
    return {
      ok: false,
      code: "storage_unavailable",
      message: "Editorial storage is unavailable. Configure Supabase and SUPABASE_SERVICE_ROLE_KEY.",
      userEmail: user.email ?? null,
    };
  }

  return {
    ok: true,
    client,
    user,
  };
}

export async function getEditorialReviewState(
  route = SIGNALS_EDITORIAL_ROUTE,
  input: EditorialReviewQuery = {},
): Promise<EditorialReviewState> {
  const context = await getAdminEditorialContext(route);
  const normalizedStatus = input.status ?? "all";
  const normalizedScope = input.scope ?? "all";
  const normalizedDate = normalizeDateValue(input.date ?? null);
  const normalizedQuery = normalizeSearchQuery(input.query ?? null);
  const normalizedPage = normalizePageNumber(input.page);

  if (!context.ok) {
    if (context.code === "not_authenticated") {
      return {
        kind: "unauthenticated",
        sessionCookiePresent: Boolean(context.sessionCookiePresent),
      };
    }

    if (context.code === "not_admin") {
      return {
        kind: "unauthorized",
        userEmail: context.userEmail ?? null,
      };
    }

    return {
      kind: "authorized",
      adminEmail: context.userEmail ?? "",
      posts: [],
      currentTopFive: [],
      currentCandidates: [],
      storageReady: false,
      warning: context.message,
      page: normalizedPage,
      pageSize: EDITORIAL_PAGE_SIZE,
      totalMatchingPosts: 0,
      latestBriefingDate: null,
      latestPublishedSlateAudit: null,
      auditStorageReady: false,
      auditWarning: context.message,
      appliedScope: normalizedScope,
      appliedStatus: normalizedStatus,
      appliedQuery: normalizedQuery,
      appliedDate: normalizedDate,
    };
  }

  const schemaPreflight = await getSignalPostsSchemaPreflight(context.client);

  if (!schemaPreflight.ok) {
    return {
      kind: "authorized",
      adminEmail: context.user.email ?? "",
      posts: [],
      currentTopFive: [],
      currentCandidates: [],
      storageReady: false,
      warning: schemaPreflight.message,
      page: normalizedPage,
      pageSize: EDITORIAL_PAGE_SIZE,
      totalMatchingPosts: 0,
      latestBriefingDate: null,
      latestPublishedSlateAudit: null,
      auditStorageReady: false,
      auditWarning: schemaPreflight.message,
      appliedScope: normalizedScope,
      appliedStatus: normalizedStatus,
      appliedQuery: normalizedQuery,
      appliedDate: normalizedDate,
    };
  }

  const latest = await getLatestBriefingDate(context.client);
  const latestBriefingDate = latest.latestBriefingDate;
  const auditSchemaPreflight = await getPublishedSlateAuditSchemaPreflight(context.client);
  const latestAudit = auditSchemaPreflight.ok
    ? await loadLatestPublishedSlateAudit(context.client)
    : { audit: null, errorMessage: auditSchemaPreflight.message };
  const loaded = await loadStoredSignalPosts(context.client, {
    status: normalizedStatus,
    scope: normalizedScope,
    query: normalizedQuery,
    date: normalizedDate,
    page: normalizedPage,
    latestBriefingDate,
  });

  if (latest.errorMessage) {
    logServerEvent("warn", "Editorial latest briefing date could not be loaded", {
      route,
      errorMessage: latest.errorMessage,
    });
  }

  if (latestAudit.errorMessage) {
    logServerEvent("warn", "Published slate audit history could not be loaded", {
      route,
      errorMessage: latestAudit.errorMessage,
    });
  }

  if (loaded.errorMessage) {
    logServerEvent("warn", "Editorial signal posts could not be loaded", {
      route,
      errorMessage: loaded.errorMessage,
    });

    return {
      kind: "authorized",
      adminEmail: context.user.email ?? "",
      posts: [],
      currentTopFive: [],
      currentCandidates: [],
      storageReady: false,
      warning: `Editorial signal storage could not be read: ${loaded.errorMessage}`,
      page: normalizedPage,
      pageSize: EDITORIAL_PAGE_SIZE,
      totalMatchingPosts: 0,
      latestBriefingDate,
      latestPublishedSlateAudit: latestAudit.audit,
      auditStorageReady: auditSchemaPreflight.ok,
      auditWarning: latestAudit.errorMessage
        ? `Published slate audit history could not be read: ${latestAudit.errorMessage}`
        : null,
      appliedScope: normalizedScope,
      appliedStatus: normalizedStatus,
      appliedQuery: normalizedQuery,
      appliedDate: normalizedDate,
    };
  }

  const currentCandidates = await loadCurrentSignalDepth(context.client, latestBriefingDate);
  const currentTopFive = currentCandidates.slice(0, TOP_SIGNAL_SET_SIZE);
  const warningParts = [
    !latestBriefingDate
      ? "No stored Top 5 signal snapshot exists yet. This page stays read-only until signal posts have been persisted."
      : null,
    getEditorialStorageWarning(loaded.totalCount, normalizedScope),
  ].filter(Boolean);
  const auditWarning = latestAudit.errorMessage
    ? `Published slate audit history could not be read: ${latestAudit.errorMessage}`
    : null;

  return {
    kind: "authorized",
    adminEmail: context.user.email ?? "",
    posts: loaded.posts,
    currentTopFive,
    currentCandidates,
    storageReady: true,
    warning: warningParts[0] ?? warningParts[1] ?? null,
    page: normalizedPage,
    pageSize: EDITORIAL_PAGE_SIZE,
    totalMatchingPosts: loaded.totalCount,
    latestBriefingDate,
    latestPublishedSlateAudit: latestAudit.audit,
    auditStorageReady: auditSchemaPreflight.ok,
    auditWarning,
    appliedScope: normalizedScope,
    appliedStatus: normalizedStatus,
    appliedQuery: normalizedQuery,
    appliedDate: normalizedDate,
  };
}

function getEditorialStorageWarning(postCount: number, scope: EditorialScopeFilter) {
  if (postCount < 5) {
    return scope === "historical"
      ? `Editorial archive currently has ${postCount} matching historical signal posts.`
      : `Editorial storage currently has ${postCount} matching signal posts. Publishing requires a validated ${FINAL_SLATE_MIN_PUBLIC_ROWS}-${FINAL_SLATE_MAX_PUBLIC_ROWS} row final slate.`;
  }

  if (postCount > 5 && scope === "all") {
    return `Editorial storage has ${postCount} matching signal posts. This page is paginated; publishing still uses only the latest validated final slate.`;
  }

  return null;
}

export async function saveSignalDraft(input: {
  postId: string;
  editedWhyItMatters: string;
  editedWhyItMattersStructured?: EditorialWhyItMattersContent | null;
  route?: string;
}): Promise<EditorialMutationResult> {
  const context = await getAdminEditorialContext(input.route ?? SIGNALS_EDITORIAL_ROUTE);

  if (!context.ok) {
    return {
      ok: false,
      code: context.code,
      message: context.message,
    };
  }

  const now = new Date().toISOString();
  const lookup = await context.client
    .from("signal_posts")
    .select("id, editorial_status, editorial_decision")
    .eq("id", input.postId)
    .maybeSingle();

  if (lookup.error || !lookup.data) {
    return {
      ok: false,
      code: "not_found",
      message: "The signal post could not be found.",
    };
  }

  const currentStatus = (lookup.data as Pick<StoredSignalPost, "editorial_status">).editorial_status;
  const shouldPreserveStatus = currentStatus === "approved" || currentStatus === "published";
  const structuredContent =
    input.editedWhyItMattersStructured ??
    createEditorialContentFromLegacyText(input.editedWhyItMatters);
  const editorialText = normalizeEditorialText(
    buildEditorialWhyItMattersText(structuredContent, input.editedWhyItMatters),
  );
  const validation = validateWhyItMatters(editorialText);

  if (!validation.passed && currentStatus === "published") {
    return {
      ok: false,
      code: "publish_blocked",
      message: getValidationFailureMessage(validation),
    };
  }

  let nextEditorialStatus: EditorialStatus = "needs_review";
  let successMessage = "Draft saved. Why it matters requires a human rewrite before approval.";

  if (validation.passed) {
    nextEditorialStatus = shouldPreserveStatus ? currentStatus : "draft";
    successMessage = shouldPreserveStatus ? "Editorial changes saved." : "Draft saved.";
  }

  const updateResult = await context.client
    .from("signal_posts")
    .update({
      edited_why_it_matters: editorialText,
      edited_why_it_matters_payload: structuredContent,
      ...(currentStatus === "published"
        ? {
            published_why_it_matters: editorialText,
            published_why_it_matters_payload: structuredContent,
          }
        : {}),
      editorial_status: nextEditorialStatus,
      editorial_decision: validation.passed ? (nextEditorialStatus === "approved" ? "approved" : "draft_edited") : "rewrite_requested",
      ...buildWhyItMattersValidationFields(validation, now),
      edited_by: context.user.email ?? null,
      edited_at: now,
      updated_at: now,
    })
    .eq("id", input.postId);

  if (updateResult.error) {
    return {
      ok: false,
      code: "storage_error",
      message: "The draft could not be saved.",
    };
  }

  return {
    ok: true,
    code: "draft_saved",
    message: successMessage,
  };
}

async function approveSignalPostWithContext(
  context: {
    client: EditorialClient;
    user: User;
  },
  input: {
    postId: string;
    editedWhyItMatters: string;
    editedWhyItMattersStructured?: EditorialWhyItMattersContent | null;
  },
): Promise<EditorialMutationResult> {
  const structuredContent =
    input.editedWhyItMattersStructured ??
    createEditorialContentFromLegacyText(input.editedWhyItMatters);
  const editorialText = normalizeEditorialText(
    buildEditorialWhyItMattersText(structuredContent, input.editedWhyItMatters),
  );

  if (!editorialText) {
    return {
      ok: false,
      code: "empty_editorial_text",
      message: "Add editorial Why it matters text before approving.",
    };
  }

  const sourceLookup = await context.client
    .from("signal_posts")
    .select("id, source_url")
    .eq("id", input.postId)
    .maybeSingle();

  if (sourceLookup.error) {
    return {
      ok: false,
      code: "storage_error",
      message: "The signal post could not be loaded for approval.",
    };
  }

  if (!sourceLookup.data) {
    return {
      ok: false,
      code: "not_found",
      message: "The signal post could not be found.",
    };
  }

  const sourceReadyPost = sourceLookup.data as Pick<StoredSignalPost, "id" | "source_url">;

  if (!isValidPublicSourceUrl(sourceReadyPost.source_url)) {
    return {
      ok: false,
      code: "missing_public_source_url",
      message: buildMissingPublicSourceUrlMessage("approval"),
    };
  }

  const now = new Date().toISOString();
  const validation = validateWhyItMatters(editorialText);

  if (!validation.passed) {
    const flagResult = await context.client
      .from("signal_posts")
      .update({
        edited_why_it_matters: editorialText,
        edited_why_it_matters_payload: structuredContent,
        editorial_status: "needs_review",
        editorial_decision: "rewrite_requested",
        ...buildWhyItMattersValidationFields(validation, now),
        edited_by: context.user.email ?? null,
        edited_at: now,
        updated_at: now,
      })
      .eq("id", input.postId);

    if (flagResult.error) {
      return {
        ok: false,
        code: "storage_error",
        message: "The signal post could not be flagged for rewrite.",
      };
    }

    return {
      ok: false,
      code: "publish_blocked",
      message: getValidationFailureMessage(validation),
    };
  }

  const updateResult = await context.client
    .from("signal_posts")
    .update({
      edited_why_it_matters: editorialText,
      edited_why_it_matters_payload: structuredContent,
      editorial_status: "approved",
      editorial_decision: "approved",
      decision_note: null,
      rejected_reason: null,
      held_reason: null,
      ...buildWhyItMattersValidationFields(validation, now),
      reviewed_by: context.user.email ?? null,
      reviewed_at: now,
      edited_by: context.user.email ?? null,
      edited_at: now,
      approved_by: context.user.email ?? null,
      approved_at: now,
      updated_at: now,
    })
    .eq("id", input.postId);

  if (updateResult.error) {
    return {
      ok: false,
      code: "storage_error",
      message: "The signal post could not be approved.",
    };
  }

  return {
    ok: true,
    code: "approved",
    message: "Signal post approved.",
  };
}

export async function approveSignalPost(input: {
  postId: string;
  editedWhyItMatters: string;
  editedWhyItMattersStructured?: EditorialWhyItMattersContent | null;
  route?: string;
}): Promise<EditorialMutationResult> {
  const context = await getAdminEditorialContext(input.route ?? SIGNALS_EDITORIAL_ROUTE);

  if (!context.ok) {
    return {
      ok: false,
      code: context.code,
      message: context.message,
    };
  }

  return approveSignalPostWithContext(context, input);
}

export async function approveSignalPosts(input: {
  posts: Array<{
    postId: string;
    editedWhyItMatters: string;
    editedWhyItMattersStructured?: EditorialWhyItMattersContent | null;
  }>;
  route?: string;
}): Promise<EditorialMutationResult> {
  const context = await getAdminEditorialContext(input.route ?? SIGNALS_EDITORIAL_ROUTE);

  if (!context.ok) {
    return {
      ok: false,
      code: context.code,
      message: context.message,
    };
  }

  const uniquePosts = Array.from(
    new Map(
      input.posts
        .map((post) => ({
          postId: normalizeEditorialText(post.postId),
          editedWhyItMatters: post.editedWhyItMatters,
          editedWhyItMattersStructured: post.editedWhyItMattersStructured,
        }))
        .filter((post) => post.postId)
        .map((post) => [post.postId, post]),
    ).values(),
  );

  if (uniquePosts.length === 0) {
    return {
      ok: false,
      code: "publish_blocked",
      message: "There are no eligible signal posts to approve.",
    };
  }

  const eligibilityLookup = await context.client
    .from("signal_posts")
    .select("id, editorial_status, editorial_decision")
    .in("id", uniquePosts.map((post) => post.postId));

  if (eligibilityLookup.error) {
    return {
      ok: false,
      code: "storage_error",
      message: "The signal posts could not be loaded for bulk approval.",
    };
  }

  const eligibleIds = new Set(
    (((eligibilityLookup.data ?? []) as Array<Pick<StoredSignalPost, "id" | "editorial_status" | "editorial_decision">>))
      .filter(
        (post) =>
          (post.editorial_status === "draft" || post.editorial_status === "needs_review") &&
          !isBlockingEditorialDecision(post.editorial_decision),
      )
      .map((post) => post.id),
  );
  const eligiblePosts = uniquePosts.filter((post) => eligibleIds.has(post.postId));

  if (eligiblePosts.length === 0) {
    return {
      ok: false,
      code: "publish_blocked",
      message: "There are no Draft or Needs Review signal posts without blocking editorial decisions to approve.",
    };
  }

  const results = await Promise.all(
    eligiblePosts.map((post) => approveSignalPostWithContext(context, post)),
  );
  const approvedCount = results.filter((result) => result.ok).length;
  const failedResults = results.filter((result) => !result.ok);

  if (failedResults.length > 0) {
    const nonStorageFailure = failedResults.every((result) =>
      result.code === "publish_blocked" ||
      result.code === "empty_editorial_text" ||
      result.code === "missing_public_source_url",
    );

    return {
      ok: false,
      code: nonStorageFailure ? "publish_blocked" : "storage_error",
      message:
        approvedCount > 0
          ? `Approved ${approvedCount} signal posts. ${failedResults.length} could not be approved.`
          : failedResults[0]?.message ?? "No signal posts could be approved.",
    };
  }

  return {
    ok: true,
    code: "bulk_approved",
    message:
      approvedCount === 1
        ? "Approved 1 signal post."
        : `Approved ${approvedCount} signal posts.`,
  };
}

export async function resetSignalPostToAiDraft(input: {
  postId: string;
  route?: string;
}): Promise<EditorialMutationResult> {
  const context = await getAdminEditorialContext(input.route ?? SIGNALS_EDITORIAL_ROUTE);

  if (!context.ok) {
    return {
      ok: false,
      code: context.code,
      message: context.message,
    };
  }

  const lookup = await context.client
    .from("signal_posts")
    .select("id, ai_why_it_matters")
    .eq("id", input.postId)
    .maybeSingle();

  if (lookup.error || !lookup.data) {
    return {
      ok: false,
      code: "not_found",
      message: "The signal post could not be found.",
    };
  }

  const aiDraft = normalizeEditorialText(
    (lookup.data as Pick<StoredSignalPost, "ai_why_it_matters">).ai_why_it_matters,
  );
  const now = new Date().toISOString();
  const validation = validateWhyItMatters(aiDraft);
  const updateResult = await context.client
    .from("signal_posts")
    .update({
      edited_why_it_matters: aiDraft,
      edited_why_it_matters_payload: null,
      editorial_status: validation.passed ? "draft" : "needs_review",
      editorial_decision: validation.passed ? "pending_review" : "rewrite_requested",
      ...buildWhyItMattersValidationFields(validation, now),
      edited_by: context.user.email ?? null,
      edited_at: now,
      updated_at: now,
    })
    .eq("id", input.postId);

  if (updateResult.error) {
    return {
      ok: false,
      code: "storage_error",
      message: "The AI draft could not be restored.",
    };
  }

  return {
    ok: true,
    code: "reset",
    message: "Editorial text reset to the AI draft.",
  };
}

async function loadDecisionTarget(
  context: {
    client: EditorialClient;
    user: User;
  },
  postId: string,
) {
  const lookup = await context.client
    .from("signal_posts")
    .select("id, briefing_date, source_url, editorial_status, editorial_decision, final_slate_rank, final_slate_tier, is_live, published_at")
    .eq("id", postId)
    .maybeSingle();

  if (lookup.error || !lookup.data) {
    return {
      ok: false as const,
      code: "not_found" as const,
      message: "The signal post could not be found.",
    };
  }

  const post = lookup.data as Pick<
    StoredSignalPost,
    | "id"
    | "briefing_date"
    | "source_url"
    | "editorial_status"
    | "editorial_decision"
    | "final_slate_rank"
    | "final_slate_tier"
    | "is_live"
    | "published_at"
  >;

  return {
    ok: true as const,
    post,
  };
}

function blockPublishedDecisionTarget(
  post: Pick<StoredSignalPost, "editorial_status" | "is_live" | "published_at">,
) {
  return Boolean(post.is_live || post.editorial_status === "published" || post.published_at);
}

export async function requestSignalPostRewrite(input: {
  postId: string;
  decisionNote?: string | null;
  route?: string;
}): Promise<EditorialMutationResult> {
  const context = await getAdminEditorialContext(input.route ?? SIGNALS_EDITORIAL_ROUTE);

  if (!context.ok) {
    return {
      ok: false,
      code: context.code,
      message: context.message,
    };
  }

  const target = await loadDecisionTarget(context, input.postId);

  if (!target.ok) {
    return target;
  }

  if (blockPublishedDecisionTarget(target.post)) {
    return {
      ok: false,
      code: "publish_blocked",
      message: "Live or already published rows cannot be marked for rewrite in this non-publish phase.",
    };
  }

  const now = new Date().toISOString();
  const updateResult = await context.client
    .from("signal_posts")
    .update({
      editorial_status: "needs_review",
      editorial_decision: "rewrite_requested",
      decision_note: normalizeDecisionNote(input.decisionNote) || null,
      final_slate_rank: null,
      final_slate_tier: null,
      reviewed_by: context.user.email ?? null,
      reviewed_at: now,
      updated_at: now,
    })
    .eq("id", input.postId);

  if (updateResult.error) {
    return {
      ok: false,
      code: "storage_error",
      message: "The signal post could not be marked for rewrite.",
    };
  }

  return {
    ok: true,
    code: "decision_updated",
    message: "Requested rewrite and removed the row from the draft final slate.",
  };
}

export async function rejectSignalPost(input: {
  postId: string;
  decisionNote?: string | null;
  route?: string;
}): Promise<EditorialMutationResult> {
  const context = await getAdminEditorialContext(input.route ?? SIGNALS_EDITORIAL_ROUTE);

  if (!context.ok) {
    return {
      ok: false,
      code: context.code,
      message: context.message,
    };
  }

  const note = normalizeDecisionNote(input.decisionNote);

  if (!note) {
    return {
      ok: false,
      code: "publish_blocked",
      message: "Add a rejection reason before rejecting this row.",
    };
  }

  const target = await loadDecisionTarget(context, input.postId);

  if (!target.ok) {
    return target;
  }

  if (blockPublishedDecisionTarget(target.post)) {
    return {
      ok: false,
      code: "publish_blocked",
      message: "Live or already published rows cannot be rejected in this non-publish phase.",
    };
  }

  const now = new Date().toISOString();
  const updateResult = await context.client
    .from("signal_posts")
    .update({
      editorial_decision: "rejected",
      decision_note: note,
      rejected_reason: note,
      final_slate_rank: null,
      final_slate_tier: null,
      reviewed_by: context.user.email ?? null,
      reviewed_at: now,
      updated_at: now,
    })
    .eq("id", input.postId);

  if (updateResult.error) {
    return {
      ok: false,
      code: "storage_error",
      message: "The signal post could not be rejected.",
    };
  }

  return {
    ok: true,
    code: "decision_updated",
    message: "Rejected row and removed it from the draft final slate.",
  };
}

export async function holdSignalPost(input: {
  postId: string;
  decisionNote?: string | null;
  route?: string;
}): Promise<EditorialMutationResult> {
  const context = await getAdminEditorialContext(input.route ?? SIGNALS_EDITORIAL_ROUTE);

  if (!context.ok) {
    return {
      ok: false,
      code: context.code,
      message: context.message,
    };
  }

  const note = normalizeDecisionNote(input.decisionNote);

  if (!note) {
    return {
      ok: false,
      code: "publish_blocked",
      message: "Add a hold reason before holding this row.",
    };
  }

  const target = await loadDecisionTarget(context, input.postId);

  if (!target.ok) {
    return target;
  }

  if (blockPublishedDecisionTarget(target.post)) {
    return {
      ok: false,
      code: "publish_blocked",
      message: "Live or already published rows cannot be held in this non-publish phase.",
    };
  }

  const now = new Date().toISOString();
  const updateResult = await context.client
    .from("signal_posts")
    .update({
      editorial_decision: "held",
      decision_note: note,
      held_reason: note,
      final_slate_rank: null,
      final_slate_tier: null,
      reviewed_by: context.user.email ?? null,
      reviewed_at: now,
      updated_at: now,
    })
    .eq("id", input.postId);

  if (updateResult.error) {
    return {
      ok: false,
      code: "storage_error",
      message: "The signal post could not be held.",
    };
  }

  return {
    ok: true,
    code: "decision_updated",
    message: "Held row as editorial evidence and removed it from the draft final slate.",
  };
}

export async function assignSignalPostToFinalSlateSlot(input: {
  postId: string;
  finalSlateRank: number;
  route?: string;
}): Promise<EditorialMutationResult> {
  const context = await getAdminEditorialContext(input.route ?? SIGNALS_EDITORIAL_ROUTE);

  if (!context.ok) {
    return {
      ok: false,
      code: context.code,
      message: context.message,
    };
  }

  if (!isFinalSlateRank(input.finalSlateRank)) {
    return {
      ok: false,
      code: "publish_blocked",
      message: "Choose a Core slot 1-5 or Context slot 6-7.",
    };
  }

  const schemaPreflight = await getSignalPostsSchemaPreflight(context.client);

  if (!schemaPreflight.ok) {
    return {
      ok: false,
      code: "storage_unavailable",
      message: schemaPreflight.message,
    };
  }

  const lookup = await context.client
    .from("signal_posts")
    .select("id, briefing_date, source_url, editorial_status, editorial_decision, is_live, published_at")
    .eq("id", input.postId)
    .maybeSingle();

  if (lookup.error || !lookup.data) {
    return {
      ok: false,
      code: "not_found",
      message: "The signal post could not be found.",
    };
  }

  const post = lookup.data as Pick<
    StoredSignalPost,
    "id" | "briefing_date" | "source_url" | "editorial_status" | "editorial_decision" | "is_live" | "published_at"
  >;
  const briefingDate = normalizeDateValue(post.briefing_date);

  if (!briefingDate) {
    return {
      ok: false,
      code: "publish_blocked",
      message: "The selected signal post is missing a briefing date.",
    };
  }

  if (post.is_live || post.editorial_status === "published" || post.published_at) {
    return {
      ok: false,
      code: "publish_blocked",
      message: "Live or already published rows cannot be assigned to the draft final slate.",
    };
  }

  if (isBlockingEditorialDecision(post.editorial_decision)) {
    return {
      ok: false,
      code: "publish_blocked",
      message: "Rejected, held, rewrite-requested, or removed rows cannot be assigned to the final slate.",
    };
  }

  if (!isValidPublicSourceUrl(post.source_url)) {
    return {
      ok: false,
      code: "missing_public_source_url",
      message: buildMissingPublicSourceUrlMessage("final-slate assignment"),
    };
  }

  const finalSlateTier = getFinalSlateTierForRank(input.finalSlateRank);
  const now = new Date().toISOString();
  const clearSlotResult = await context.client
    .from("signal_posts")
    .update({
      final_slate_rank: null,
      final_slate_tier: null,
      updated_at: now,
    })
    .eq("briefing_date", briefingDate)
    .eq("final_slate_rank", input.finalSlateRank);

  if (clearSlotResult.error) {
    return {
      ok: false,
      code: "storage_error",
      message: "The existing final-slate slot could not be cleared.",
    };
  }

  const updateResult = await context.client
    .from("signal_posts")
    .update({
      final_slate_rank: input.finalSlateRank,
      final_slate_tier: finalSlateTier,
      updated_at: now,
    })
    .eq("id", input.postId);

  if (updateResult.error) {
    return {
      ok: false,
      code: "storage_error",
      message: "The signal post could not be assigned to the final slate.",
    };
  }

  return {
    ok: true,
    code: "slate_updated",
    message: `Assigned signal post to ${finalSlateTier === "core" ? "Core" : "Context"} slot ${input.finalSlateRank}.`,
  };
}

export async function removeSignalPostFromFinalSlate(input: {
  postId: string;
  route?: string;
}): Promise<EditorialMutationResult> {
  const context = await getAdminEditorialContext(input.route ?? SIGNALS_EDITORIAL_ROUTE);

  if (!context.ok) {
    return {
      ok: false,
      code: context.code,
      message: context.message,
    };
  }

  const schemaPreflight = await getSignalPostsSchemaPreflight(context.client);

  if (!schemaPreflight.ok) {
    return {
      ok: false,
      code: "storage_unavailable",
      message: schemaPreflight.message,
    };
  }

  const target = await loadDecisionTarget(context, input.postId);

  if (!target.ok) {
    return target;
  }

  if (blockPublishedDecisionTarget(target.post)) {
    return {
      ok: false,
      code: "publish_blocked",
      message: "Live or already published rows cannot be removed from the draft final slate.",
    };
  }

  const updateResult = await context.client
    .from("signal_posts")
    .update({
      final_slate_rank: null,
      final_slate_tier: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.postId);

  if (updateResult.error) {
    return {
      ok: false,
      code: "storage_error",
      message: "The signal post could not be removed from the final slate.",
    };
  }

  return {
    ok: true,
    code: "slate_updated",
    message: "Removed signal post from the draft final slate.",
  };
}

export async function replaceSignalPostInFinalSlate(input: {
  originalPostId: string;
  replacementPostId: string;
  decisionNote?: string | null;
  route?: string;
}): Promise<EditorialMutationResult> {
  const context = await getAdminEditorialContext(input.route ?? SIGNALS_EDITORIAL_ROUTE);

  if (!context.ok) {
    return {
      ok: false,
      code: context.code,
      message: context.message,
    };
  }

  if (input.originalPostId === input.replacementPostId) {
    return {
      ok: false,
      code: "publish_blocked",
      message: "Choose a different row as the replacement.",
    };
  }

  const note = normalizeDecisionNote(input.decisionNote);

  if (!note) {
    return {
      ok: false,
      code: "publish_blocked",
      message: "Add a replacement reason before replacing this row.",
    };
  }

  const schemaPreflight = await getSignalPostsSchemaPreflight(context.client);

  if (!schemaPreflight.ok) {
    return {
      ok: false,
      code: "storage_unavailable",
      message: schemaPreflight.message,
    };
  }

  const [originalTarget, replacementTarget] = await Promise.all([
    loadDecisionTarget(context, input.originalPostId),
    loadDecisionTarget(context, input.replacementPostId),
  ]);

  if (!originalTarget.ok) {
    return originalTarget;
  }

  if (!replacementTarget.ok) {
    return replacementTarget;
  }

  const original = originalTarget.post;
  const replacement = replacementTarget.post;
  const originalRank = original.final_slate_rank;

  if (!isFinalSlateRank(originalRank)) {
    return {
      ok: false,
      code: "publish_blocked",
      message: "The original row must occupy a Core or Context slot before it can be replaced.",
    };
  }

  const briefingDate = normalizeDateValue(original.briefing_date);

  if (!briefingDate || normalizeDateValue(replacement.briefing_date) !== briefingDate) {
    return {
      ok: false,
      code: "publish_blocked",
      message: "Replacement candidates must belong to the same briefing date.",
    };
  }

  if (blockPublishedDecisionTarget(original) || blockPublishedDecisionTarget(replacement)) {
    return {
      ok: false,
      code: "publish_blocked",
      message: "Live or already published rows cannot participate in replacement.",
    };
  }

  if (isBlockingEditorialDecision(replacement.editorial_decision)) {
    return {
      ok: false,
      code: "publish_blocked",
      message: "Rejected, held, rewrite-requested, or removed rows cannot be used as replacements.",
    };
  }

  if (!isValidPublicSourceUrl(replacement.source_url)) {
    return {
      ok: false,
      code: "missing_public_source_url",
      message: buildMissingPublicSourceUrlMessage("final-slate replacement"),
    };
  }

  const finalSlateTier = getFinalSlateTierForRank(originalRank);
  const now = new Date().toISOString();
  const holdOriginal = await context.client
    .from("signal_posts")
    .update({
      editorial_decision: "held",
      decision_note: note,
      held_reason: note,
      final_slate_rank: null,
      final_slate_tier: null,
      reviewed_by: context.user.email ?? null,
      reviewed_at: now,
      updated_at: now,
    })
    .eq("id", input.originalPostId);

  if (holdOriginal.error) {
    return {
      ok: false,
      code: "storage_error",
      message: "The original row could not be held before replacement.",
    };
  }

  const clearSlotResult = await context.client
    .from("signal_posts")
    .update({
      final_slate_rank: null,
      final_slate_tier: null,
      updated_at: now,
    })
    .eq("briefing_date", briefingDate)
    .eq("final_slate_rank", originalRank);

  if (clearSlotResult.error) {
    return {
      ok: false,
      code: "storage_error",
      message: "The existing final-slate slot could not be cleared for replacement.",
    };
  }

  const assignReplacement = await context.client
    .from("signal_posts")
    .update({
      final_slate_rank: originalRank,
      final_slate_tier: finalSlateTier,
      replacement_of_row_id: input.originalPostId,
      reviewed_by: context.user.email ?? null,
      reviewed_at: now,
      updated_at: now,
    })
    .eq("id", input.replacementPostId);

  if (assignReplacement.error) {
    return {
      ok: false,
      code: "storage_error",
      message: "The replacement row could not be assigned to the final slate.",
    };
  }

  return {
    ok: true,
    code: "replacement_updated",
    message: `Held original row and assigned replacement to ${finalSlateTier === "core" ? "Core" : "Context"} slot ${originalRank}.`,
  };
}

export async function publishApprovedSignals(input: {
  route?: string;
} = {}): Promise<EditorialMutationResult> {
  const context = await getAdminEditorialContext(input.route ?? SIGNALS_EDITORIAL_ROUTE);

  if (!context.ok) {
    return {
      ok: false,
      code: context.code,
      message: context.message,
    };
  }

  const schemaPreflight = await getSignalPostsSchemaPreflight(context.client);

  if (!schemaPreflight.ok) {
    return {
      ok: false,
      code: "storage_unavailable",
      message: schemaPreflight.message,
    };
  }

  const auditSchemaPreflight = await getPublishedSlateAuditSchemaPreflight(context.client);

  if (!auditSchemaPreflight.ok) {
    return {
      ok: false,
      code: "storage_unavailable",
      message: auditSchemaPreflight.message,
    };
  }

  const latest = await getLatestBriefingDate(context.client);

  if (latest.errorMessage) {
    captureRssEditorialStorageFailure({
      failureType: "rss_cache_read_failed",
      phase: "publish",
      operation: "load_latest_final_slate_for_publish",
      route: input.route ?? SIGNALS_EDITORIAL_ROUTE,
      message: "Final slate candidates could not be loaded for publishing.",
    });

    return {
      ok: false,
      code: "storage_error",
      message: "The final slate candidates could not be loaded for publishing.",
    };
  }

  const currentCandidates = await loadCurrentSignalDepth(context.client, latest.latestBriefingDate);
  const readiness = validateFinalSlateReadiness(currentCandidates);

  if (!readiness.ready) {
    return {
      ok: false,
      code: "publish_blocked",
      message: buildFinalSlatePublishFailureMessage(readiness.failures),
    };
  }

  const selectedIds = new Set(readiness.selectedRows.map((row) => row.id));
  const selectedPosts = currentCandidates
    .filter((post) => selectedIds.has(post.id))
    .sort((left, right) => (left.finalSlateRank ?? 0) - (right.finalSlateRank ?? 0));
  const missingSelectedPosts = readiness.selectedRows.filter(
    (row) => !selectedPosts.some((post) => post.id === row.id),
  );

  if (selectedPosts.length !== readiness.selectedRows.length || missingSelectedPosts.length > 0) {
    return {
      ok: false,
      code: "publish_blocked",
      message: "Final slate selection changed before publish. Reload the composer and validate the slate again.",
    };
  }

  const now = new Date().toISOString();
  const publicationCandidates = selectedPosts.map((post) => {
    const structuredContent =
      post.editedWhyItMattersStructured ?? post.publishedWhyItMattersStructured;
    const text = normalizeEditorialText(
      buildEditorialWhyItMattersText(
        structuredContent,
        post.editedWhyItMatters || post.publishedWhyItMatters || "",
      ),
    );

    return {
      post,
      structuredContent,
      text,
      validation: validateWhyItMatters(text),
    };
  });

  const missingEditorialText = publicationCandidates.filter((entry) => !entry.text);

  if (missingEditorialText.length > 0) {
    return {
      ok: false,
      code: "publish_blocked",
      message: "Every selected final-slate row needs editorial Why it matters text before publishing. No rows were changed.",
    };
  }

  const invalidPublicationCandidates = publicationCandidates.filter((entry) => !entry.validation.passed);

  if (invalidPublicationCandidates.length > 0) {
    return {
      ok: false,
      code: "publish_blocked",
      message:
        invalidPublicationCandidates.length === 1
          ? `${getValidationFailureMessage(invalidPublicationCandidates[0].validation)} No rows were changed.`
          : `${invalidPublicationCandidates.length} final-slate rows require human rewrite before publishing. No rows were changed.`,
    };
  }

  const previousLiveResult = await context.client
    .from("signal_posts")
    .select("id")
    .eq("is_live", true);

  if (previousLiveResult.error) {
    captureRssEditorialStorageFailure({
      failureType: "rss_cache_read_failed",
      phase: "publish",
      operation: "load_previous_live_signal_set_for_publish",
      route: input.route ?? SIGNALS_EDITORIAL_ROUTE,
      briefingDate: latest.latestBriefingDate,
      message: "Previous live RSS signal set could not be loaded before publishing.",
    });

    return {
      ok: false,
      code: "storage_error",
      message: "The previous live signal set could not be loaded before publishing.",
    };
  }

  const previousLiveIds = ((previousLiveResult.data ?? []) as Array<Pick<StoredSignalPost, "id">>)
    .map((row) => row.id)
    .filter((id): id is string => Boolean(id));
  const selectedPostIds = publicationCandidates.map((entry) => entry.post.id);
  const auditResult = await createPublishedSlateAudit(context.client, {
    publicationCandidates,
    previousLiveIds,
    publishedAt: now,
    publishedBy: context.user.email ?? null,
  });

  if (!auditResult.ok) {
    captureRssEditorialStorageFailure({
      failureType: "rss_cache_write_failed",
      phase: "publish",
      operation: "create_published_slate_audit",
      route: input.route ?? SIGNALS_EDITORIAL_ROUTE,
      briefingDate: latest.latestBriefingDate,
      postCount: publicationCandidates.length,
      message: "Published slate audit record could not be created before publishing.",
    });

    return {
      ok: false,
      code: "storage_error",
      message: `The published slate audit record could not be created. No rows were changed. ${auditResult.message}`,
    };
  }

  if (previousLiveIds.length > 0) {
    const deactivateOldLiveSet = await context.client
      .from("signal_posts")
      .update({
        is_live: false,
      })
      .in("id", previousLiveIds);

    if (deactivateOldLiveSet.error) {
      captureRssEditorialStorageFailure({
        failureType: "rss_cache_write_failed",
        phase: "publish",
        operation: "archive_previous_live_signal_set_for_publish",
        route: input.route ?? SIGNALS_EDITORIAL_ROUTE,
        briefingDate: latest.latestBriefingDate,
        message: "Previous live RSS signal set could not be archived before publishing.",
      });
      await deletePublishedSlateAudit(context.client, auditResult.publishedSlateId);

      return {
        ok: false,
        code: "storage_error",
        message: "The previous live signal set could not be archived before publishing.",
      };
    }
  }

  const updateResults = await Promise.all(
    publicationCandidates.map(({ post, structuredContent, text, validation }) =>
      context.client
        .from("signal_posts")
        .update({
          published_why_it_matters: text,
          published_why_it_matters_payload: structuredContent,
          editorial_status: "published",
          editorial_decision: "approved",
          ...buildWhyItMattersValidationFields(validation, now),
          is_live: true,
          published_at: now,
          updated_at: now,
        })
        .eq("id", post.id),
    ),
  );

  if (updateResults.some((result) => result.error)) {
    await rollbackFailedFinalSlatePublish(context.client, {
      previousLiveIds,
      selectedPostIds,
      now,
    });
    await deletePublishedSlateAudit(context.client, auditResult.publishedSlateId);

    captureRssEditorialStorageFailure({
      failureType: "rss_cache_write_failed",
      phase: "publish",
      operation: "publish_final_slate_signal_set",
      route: input.route ?? SIGNALS_EDITORIAL_ROUTE,
      briefingDate: latest.latestBriefingDate,
      postCount: publicationCandidates.length,
      message: "Final slate signal set could not be published completely.",
    });

    return {
      ok: false,
      code: "storage_error",
      message: "The final slate could not be published completely. Previous live visibility was restored where possible.",
    };
  }

  return {
    ok: true,
    code: "published",
    publishedSlateId: auditResult.publishedSlateId,
    message:
      previousLiveIds.length > 0
        ? `Published final slate: ${publicationCandidates.length} rows are live. Archived ${previousLiveIds.length} previous live rows. Audit record ${auditResult.publishedSlateId}.`
        : `Published final slate: ${publicationCandidates.length} rows are live. No previous live slate was present to archive. Audit record ${auditResult.publishedSlateId}.`,
  };
}

function buildFinalSlatePublishFailureMessage(failures: FinalSlateValidationFailure[]) {
  const reasons = failures.slice(0, 3).map((failure) => failure.message);

  if (reasons.length === 0) {
    return "Final slate validation failed. No rows were changed.";
  }

  return `Final slate validation failed: ${reasons.join(" ")} No rows were changed.`;
}

async function rollbackFailedFinalSlatePublish(
  client: EditorialClient,
  input: {
    previousLiveIds: string[];
    selectedPostIds: string[];
    now: string;
  },
) {
  const rollbackResults = await Promise.all([
    input.selectedPostIds.length > 0
      ? client
          .from("signal_posts")
          .update({
            editorial_status: "approved",
            is_live: false,
            published_at: null,
            updated_at: input.now,
          })
          .in("id", input.selectedPostIds)
      : Promise.resolve({ error: null }),
    input.previousLiveIds.length > 0
      ? client
          .from("signal_posts")
          .update({
            is_live: true,
            updated_at: input.now,
          })
          .in("id", input.previousLiveIds)
      : Promise.resolve({ error: null }),
  ]);

  return rollbackResults.every((result) => !result.error);
}

function buildPublishedSlateVerificationChecklist(): PublishedSlateVerificationChecklist {
  return {
    status: "not_run",
    items: [
      "Homepage returns 200 and shows only the published rows for the new slate.",
      "/signals returns 200 and shows only the published rows for the new slate.",
      "Database live row count matches the approved public slate count.",
      "Held, rejected, rewrite-requested, Depth, and unselected rows stay hidden.",
      "Cron remains disabled.",
    ],
  };
}

function buildRollbackPreparationNote(input: {
  publishedRowIds: string[];
  previousLiveRowIds: string[];
}) {
  return input.previousLiveRowIds.length > 0
    ? "Rollback execution is not implemented in this phase. This audit record identifies the newly published rows to un-live and the archived previous live rows to restore."
    : "Rollback execution is not implemented in this phase. This audit record identifies the newly published rows to un-live; no previous live slate existed at publish time.";
}

async function deletePublishedSlateAudit(client: EditorialClient, publishedSlateId: string) {
  const deleteResult = await client
    .from("published_slates")
    .delete()
    .eq("id", publishedSlateId);

  if (deleteResult.error) {
    logServerEvent("warn", "Published slate audit cleanup failed after publish rollback", {
      publishedSlateId,
      errorMessage: deleteResult.error.message,
    });
  }
}

async function createPublishedSlateAudit(
  client: EditorialClient,
  input: {
    publicationCandidates: FinalSlatePublicationCandidate[];
    previousLiveIds: string[];
    publishedAt: string;
    publishedBy: string | null;
  },
): Promise<
  | {
      ok: true;
      publishedSlateId: string;
    }
  | {
      ok: false;
      message: string;
    }
> {
  const publishedRowIds = input.publicationCandidates.map((entry) => entry.post.id);
  const coreCount = input.publicationCandidates.filter((entry) => entry.post.finalSlateTier === "core").length;
  const contextCount = input.publicationCandidates.filter((entry) => entry.post.finalSlateTier === "context").length;
  const insertSlateResult = await client
    .from("published_slates")
    .insert({
      published_at: input.publishedAt,
      published_by: input.publishedBy,
      row_count: input.publicationCandidates.length,
      core_count: coreCount,
      context_count: contextCount,
      previous_live_row_ids: input.previousLiveIds,
      published_row_ids: publishedRowIds,
      rollback_note: buildRollbackPreparationNote({
        publishedRowIds,
        previousLiveRowIds: input.previousLiveIds,
      }),
      verification_checklist_json: buildPublishedSlateVerificationChecklist(),
      created_at: input.publishedAt,
    })
    .select("id")
    .maybeSingle();

  if (insertSlateResult.error || !insertSlateResult.data) {
    return {
      ok: false,
      message: insertSlateResult.error?.message ?? "The published slate audit record did not return an id.",
    };
  }

  const publishedSlateId = ((insertSlateResult.data ?? {}) as { id?: string | null }).id;

  if (!publishedSlateId) {
    return {
      ok: false,
      message: "The published slate audit record did not return an id.",
    };
  }

  const itemRows = input.publicationCandidates.map((entry) => ({
    published_slate_id: publishedSlateId,
    signal_post_id: entry.post.id,
    final_slate_rank: entry.post.finalSlateRank,
    final_slate_tier: entry.post.finalSlateTier,
    title_snapshot: entry.post.title,
    why_it_matters_snapshot: entry.text,
    summary_snapshot: entry.post.summary || null,
    source_name_snapshot: entry.post.sourceName || null,
    source_url_snapshot: entry.post.sourceUrl || null,
    editorial_decision_snapshot: entry.post.editorialDecision,
    replacement_of_row_id_snapshot: entry.post.replacementOfRowId,
    decision_note_snapshot: entry.post.decisionNote,
    held_reason_snapshot: entry.post.heldReason,
    rejected_reason_snapshot: entry.post.rejectedReason,
    reviewed_by_snapshot: entry.post.reviewedBy,
    reviewed_at_snapshot: entry.post.reviewedAt,
    created_at: input.publishedAt,
  }));

  const insertItemsResult = await client.from("published_slate_items").insert(itemRows);

  if (insertItemsResult.error) {
    await deletePublishedSlateAudit(client, publishedSlateId);

    return {
      ok: false,
      message: insertItemsResult.error.message,
    };
  }

  return {
    ok: true,
    publishedSlateId,
  };
}

export async function publishSignalPost(input: {
  postId: string;
  route?: string;
}): Promise<EditorialMutationResult> {
  const context = await getAdminEditorialContext(input.route ?? SIGNALS_EDITORIAL_ROUTE);

  if (!context.ok) {
    return {
      ok: false,
      code: context.code,
      message: context.message,
    };
  }

  return {
    ok: false,
    code: "publish_blocked",
    message: `Individual signal publishing is disabled. Use Publish Final Slate after a validated ${FINAL_SLATE_MIN_PUBLIC_ROWS}-${FINAL_SLATE_MAX_PUBLIC_ROWS} row slate passes validation.`,
  };
}

async function loadPublishedSignalPostsState(limit: number): Promise<PublicSignalsPageState> {
  const supabase = createSupabaseServiceRoleClient();

  if (!supabase) {
    return {
      kind: "temporarily_unavailable",
      posts: [],
    };
  }

  const publicSelect = await getPublicSignalPostSelect(supabase);

  if (!publicSelect.ok) {
    return {
      kind: "temporarily_unavailable",
      posts: [],
    };
  }

  const result = await supabase
    .from("signal_posts")
    .select(publicSelect.selectColumns)
    .eq("is_live", true)
    .eq("editorial_status", "published")
    .not("published_at", "is", null)
    .order("briefing_date", { ascending: false })
    .order("published_at", { ascending: false })
    .order("rank", { ascending: true })
    .limit(100);

  if (result.error) {
    logServerEvent("warn", "Published signal posts could not be loaded", {
      route: PUBLIC_SIGNALS_ROUTE,
      errorMessage: result.error.message,
    });
    return {
      kind: "temporarily_unavailable",
      posts: [],
    };
  }

  const publishedPosts = ((result.data ?? []) as unknown as Array<Parameters<typeof mapStoredPublicSignalPost>[0]>)
    .map(mapStoredPublicSignalPost)
    .filter(isPublicSlatePost);
  const briefingDate = publishedPosts[0]?.briefingDate ?? null;

  const posts = briefingDate
    ? selectPublicSlatePosts(
        publishedPosts.filter((post) => post.briefingDate === briefingDate),
        limit,
      )
    : [];

  return posts.length > 0
    ? {
        kind: "published",
        posts,
      }
    : {
        kind: "empty",
        posts: [],
      };
}

export async function getPublishedSignalPosts(): Promise<EditorialSignalPost[]> {
  const state = await loadPublishedSignalPostsState(PUBLIC_SIGNAL_SET_SIZE);

  return state.kind === "published" ? state.posts.slice(0, PUBLIC_SIGNAL_SET_SIZE) : [];
}

export async function getPublicSignalsPageState(): Promise<PublicSignalsPageState> {
  return loadPublishedSignalPostsState(PUBLIC_SIGNAL_SET_SIZE);
}

export async function getHomepageSignalSnapshot(input: { today?: Date } = {}): Promise<HomepageSignalSnapshot> {
  const supabase = createSupabaseServiceRoleClient();

  if (!supabase) {
    return {
      source: "none",
      posts: [],
      depthPosts: [],
      briefingDate: null,
    };
  }

  const todayKey = input.today?.toISOString().slice(0, 10) ?? new Date().toISOString().slice(0, 10);
  const snapshot = await loadPublicHomepageSnapshotFast(supabase, PUBLIC_SIGNAL_SET_SIZE);
  const posts = snapshot.posts.slice(0, TOP_SIGNAL_SET_SIZE);

  if (snapshot.errorMessage) {
    return {
      source: "none",
      posts: [],
      depthPosts: [],
      briefingDate: null,
      errorMessage: `public signal_posts read failed: ${snapshot.errorMessage}`,
    };
  }

  if (posts.length === 0 || !snapshot.briefingDate) {
    return {
      source: "none",
      posts: [],
      depthPosts: [],
      briefingDate: null,
    };
  }

  return {
    source: snapshot.briefingDate === todayKey ? "published_live" : "recent_published",
    posts,
    depthPosts: snapshot.posts,
    briefingDate: snapshot.briefingDate,
  };
}
