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
import type { BriefingItem, EditorialStatus } from "@/lib/types";

export const SIGNALS_EDITORIAL_ROUTE = "/dashboard/signals/editorial-review";
export const PUBLIC_SIGNALS_ROUTE = "/signals";

const SIGNAL_POST_SELECT = [
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
  "editorial_status",
  "edited_by",
  "edited_at",
  "approved_by",
  "approved_at",
  "published_at",
  "is_live",
  "created_at",
  "updated_at",
].join(", ");

const EDITORIAL_PAGE_SIZE = 20;
const PUBLIC_SIGNAL_DEPTH_LIMIT = 20;
const TOP_SIGNAL_SET_SIZE = 5;

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
  editorial_status: EditorialStatus;
  edited_by: string | null;
  edited_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  published_at: string | null;
  is_live: boolean | null;
  created_at: string | null;
  updated_at: string | null;
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
  editorialStatus: EditorialStatus;
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
      storageReady: boolean;
      warning: string | null;
      page: number;
      pageSize: number;
      totalMatchingPosts: number;
      latestBriefingDate: string | null;
      appliedScope: EditorialScopeFilter;
      appliedStatus: EditorialPostStatusFilter;
      appliedQuery: string;
      appliedDate: string | null;
    };

export type EditorialMutationResult = {
  ok: boolean;
  message: string;
  code:
    | "approved"
    | "bulk_approved"
    | "draft_saved"
    | "empty_editorial_text"
    | "not_admin"
    | "not_authenticated"
    | "not_found"
    | "published"
    | "publish_blocked"
    | "reset"
    | "storage_unavailable"
    | "storage_error";
};

export type SignalSnapshotPersistenceResult = {
  ok: boolean;
  briefingDate: string;
  insertedCount: number;
  message: string;
};

export type HomepageSignalSnapshot = {
  source: "published_live" | "latest_snapshot" | "none";
  posts: EditorialSignalPost[];
  depthPosts: EditorialSignalPost[];
  briefingDate: string | null;
};

function normalizeEditorialText(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function normalizeDateValue(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : null;
}

function normalizeSearchQuery(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function normalizePageNumber(page?: number) {
  return Number.isFinite(page) && page && page > 0 ? Math.floor(page) : 1;
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
    editorialStatus: row.editorial_status,
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

// Converts MVP BriefingItem view-models into signal_posts placement candidates.
// The persisted rows are editorial/public placement rows, not durable Signal
// history or Phase 2 progression identity.
function mapBriefingItemToSignalPost(item: BriefingItem, index: number): EditorialSignalPost {
  const leadSource = item.sources[0] ?? item.relatedArticles?.[0];
  const tags = [
    item.topicName,
    item.signalRole,
    item.importanceLabel,
  ].filter((value): value is string => Boolean(value));
  const aiWhyItMatters = normalizeEditorialText(item.aiWhyItMatters ?? item.whyItMatters);

  return {
    id: `candidate-${index + 1}`,
    briefingDate: null,
    rank: index + 1,
    title: item.title,
    sourceName: leadSource?.title ?? "Unknown source",
    sourceUrl: leadSource?.url ?? "",
    summary: item.whatHappened,
    tags,
    signalScore: item.importanceScore ?? item.matchScore ?? null,
    selectionReason: item.rankingSignals?.[0] ?? "",
    aiWhyItMatters,
    editedWhyItMatters: null,
    publishedWhyItMatters: null,
    editedWhyItMattersStructured: null,
    publishedWhyItMattersStructured: null,
    editorialStatus: "needs_review",
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

function buildSignalPostCandidates(items: BriefingItem[]) {
  return items.slice(0, PUBLIC_SIGNAL_DEPTH_LIMIT).map(mapBriefingItemToSignalPost);
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
  },
): Promise<SignalSnapshotPersistenceResult> {
  const briefingDate = normalizeDateValue(input.briefingDate) ?? new Date().toISOString().slice(0, 10);

  if (input.candidates.length < TOP_SIGNAL_SET_SIZE) {
    return {
      ok: false,
      briefingDate,
      insertedCount: 0,
      message: `The current signal pipeline returned ${input.candidates.length} signal posts. Persisting the daily snapshot requires at least five.`,
    };
  }

  const existingResult = await client
    .from("signal_posts")
    .select("id, rank, is_live")
    .eq("briefing_date", briefingDate);

  if (existingResult.error) {
    return {
      ok: false,
      briefingDate,
      insertedCount: 0,
      message: `The current signal snapshot could not be checked: ${existingResult.error.message}`,
    };
  }

  const existingRows = ((existingResult.data ?? []) as Array<{ id: string; rank: number | null; is_live: boolean | null }>);
  const existingRanks = new Set(
    existingRows
      .map((row) => row.rank)
      .filter((rank): rank is number => typeof rank === "number"),
  );
  const missingCandidates = input.candidates.filter((post) => !existingRanks.has(post.rank));

  if (missingCandidates.length === 0) {
    return {
      ok: true,
      briefingDate,
      insertedCount: 0,
      message: "The daily signal snapshot already exists for this briefing date.",
    };
  }

  const shouldActivateInsertedRows =
    existingRows.length > 0 ? existingRows.some((row) => Boolean(row.is_live)) : true;
  const now = new Date().toISOString();

  if (existingRows.length === 0 && shouldActivateInsertedRows) {
    const deactivateOldLiveSet = await client
      .from("signal_posts")
      .update({
        is_live: false,
        updated_at: now,
      })
      .eq("is_live", true);

    if (deactivateOldLiveSet.error) {
      return {
        ok: false,
        briefingDate,
        insertedCount: 0,
        message: `The previous live signal set could not be archived before the new daily snapshot was inserted: ${deactivateOldLiveSet.error.message}`,
      };
    }
  }

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
      editorial_status: "needs_review",
      is_live: shouldActivateInsertedRows,
      created_at: now,
      updated_at: now,
    })),
  );

  if (insertResult.error) {
    return {
      ok: false,
      briefingDate,
      insertedCount: 0,
      message: `The current Top 5 could not be persisted for editing: ${insertResult.error.message}`,
    };
  }

  return {
    ok: true,
    briefingDate,
    insertedCount: missingCandidates.length,
    message:
      missingCandidates.length === TOP_SIGNAL_SET_SIZE
        ? "Persisted a new daily Top 5 snapshot."
        : `Persisted ${missingCandidates.length} missing signal snapshot rows.`,
  };
}

export async function persistSignalPostsForBriefing(input: {
  briefingDate: string;
  items: BriefingItem[];
}): Promise<SignalSnapshotPersistenceResult> {
  const client = createSupabaseServiceRoleClient();

  if (!client) {
    return {
      ok: false,
      briefingDate: normalizeDateValue(input.briefingDate) ?? new Date().toISOString().slice(0, 10),
      insertedCount: 0,
      message: "Editorial storage is unavailable. Configure Supabase and SUPABASE_SERVICE_ROLE_KEY.",
    };
  }

  return persistSignalPostCandidates(client, {
    briefingDate: input.briefingDate,
    candidates: buildSignalPostCandidates(input.items),
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

async function loadCurrentTopFive(client: EditorialClient, briefingDate: string | null) {
  if (!briefingDate) {
    return [];
  }

  const result = await client
    .from("signal_posts")
    .select(SIGNAL_POST_SELECT)
    .eq("briefing_date", briefingDate)
    .order("rank", { ascending: true })
    .limit(5);

  if (result.error) {
    return [];
  }

  return ((result.data ?? []) as unknown as StoredSignalPost[]).map(mapStoredSignalPost);
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
    .limit(PUBLIC_SIGNAL_DEPTH_LIMIT);

  if (result.error) {
    return [];
  }

  return ((result.data ?? []) as unknown as StoredSignalPost[]).map(mapStoredSignalPost);
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
      storageReady: false,
      warning: context.message,
      page: normalizedPage,
      pageSize: EDITORIAL_PAGE_SIZE,
      totalMatchingPosts: 0,
      latestBriefingDate: null,
      appliedScope: normalizedScope,
      appliedStatus: normalizedStatus,
      appliedQuery: normalizedQuery,
      appliedDate: normalizedDate,
    };
  }

  const latest = await getLatestBriefingDate(context.client);
  const latestBriefingDate = latest.latestBriefingDate;
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
      storageReady: false,
      warning: `Editorial signal storage could not be read: ${loaded.errorMessage}`,
      page: normalizedPage,
      pageSize: EDITORIAL_PAGE_SIZE,
      totalMatchingPosts: 0,
      latestBriefingDate,
      appliedScope: normalizedScope,
      appliedStatus: normalizedStatus,
      appliedQuery: normalizedQuery,
      appliedDate: normalizedDate,
    };
  }

  const currentTopFive = await loadCurrentTopFive(context.client, latestBriefingDate);
  const warningParts = [
    !latestBriefingDate
      ? "No stored Top 5 signal snapshot exists yet. This page stays read-only until signal posts have been persisted."
      : null,
    getEditorialStorageWarning(loaded.totalCount, normalizedScope),
  ].filter(Boolean);

  return {
    kind: "authorized",
    adminEmail: context.user.email ?? "",
    posts: loaded.posts,
    currentTopFive,
    storageReady: true,
    warning: warningParts[0] ?? warningParts[1] ?? null,
    page: normalizedPage,
    pageSize: EDITORIAL_PAGE_SIZE,
    totalMatchingPosts: loaded.totalCount,
    latestBriefingDate,
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
      : `Editorial storage currently has ${postCount} matching signal posts. Publishing requires exactly five ranked signal posts in the current set.`;
  }

  if (postCount > 5 && scope === "all") {
    return `Editorial storage has ${postCount} matching signal posts. This page is paginated; publishing still uses only the latest five ranked posts.`;
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
    .select("id, editorial_status")
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
      editorial_status: shouldPreserveStatus ? currentStatus : "draft",
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
    message: shouldPreserveStatus ? "Editorial changes saved." : "Draft saved.",
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

  const now = new Date().toISOString();
  const updateResult = await context.client
    .from("signal_posts")
    .update({
      edited_why_it_matters: editorialText,
      edited_why_it_matters_payload: structuredContent,
      editorial_status: "approved",
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
    .select("id, editorial_status")
    .in("id", uniquePosts.map((post) => post.postId));

  if (eligibilityLookup.error) {
    return {
      ok: false,
      code: "storage_error",
      message: "The signal posts could not be loaded for bulk approval.",
    };
  }

  const eligibleIds = new Set(
    (((eligibilityLookup.data ?? []) as Array<Pick<StoredSignalPost, "id" | "editorial_status">>))
      .filter((post) => post.editorial_status === "draft" || post.editorial_status === "needs_review")
      .map((post) => post.id),
  );
  const eligiblePosts = uniquePosts.filter((post) => eligibleIds.has(post.postId));

  if (eligiblePosts.length === 0) {
    return {
      ok: false,
      code: "publish_blocked",
      message: "There are no Draft or Needs Review signal posts to approve.",
    };
  }

  const results = await Promise.all(
    eligiblePosts.map((post) => approveSignalPostWithContext(context, post)),
  );
  const approvedCount = results.filter((result) => result.ok).length;
  const failedResults = results.filter((result) => !result.ok);

  if (failedResults.length > 0) {
    return {
      ok: false,
      code: "storage_error",
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
  const updateResult = await context.client
    .from("signal_posts")
    .update({
      edited_why_it_matters: aiDraft,
      edited_why_it_matters_payload: null,
      editorial_status: "draft",
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

  const latest = await getLatestBriefingDate(context.client);
  const topFivePosts = await loadCurrentTopFive(context.client, latest.latestBriefingDate);
  const depthPosts = (await loadCurrentSignalDepth(context.client, latest.latestBriefingDate)).filter(
    (post) => post.rank > TOP_SIGNAL_SET_SIZE,
  );

  if (latest.errorMessage) {
    return {
      ok: false,
      code: "storage_error",
      message: "The Top 5 list could not be loaded for publishing.",
    };
  }

  if (topFivePosts.length !== 5) {
    return {
      ok: false,
      code: "publish_blocked",
      message: `Publishing requires exactly five ranked signal posts. Current count: ${topFivePosts.length}.`,
    };
  }

  const notReadyToPublish = topFivePosts.filter(
    (post) => post.editorialStatus !== "approved" && post.editorialStatus !== "published",
  );

  if (notReadyToPublish.length > 0) {
    return {
      ok: false,
      code: "publish_blocked",
      message: "Approve all five signal posts before publishing. Already published posts remain publish-ready.",
    };
  }

  const missingEditorialText = topFivePosts.filter(
    (post) => !normalizeEditorialText(post.editedWhyItMatters || post.publishedWhyItMatters),
  );

  if (missingEditorialText.length > 0) {
    return {
      ok: false,
      code: "publish_blocked",
      message: "Every approved signal post needs editorial Why it matters text before publishing.",
    };
  }

  const now = new Date().toISOString();
  const deactivateOldLiveSet = await context.client
    .from("signal_posts")
    .update({
      is_live: false,
      updated_at: now,
    })
    .eq("is_live", true);

  if (deactivateOldLiveSet.error) {
    return {
      ok: false,
      code: "storage_error",
      message: "The previous live signal set could not be archived before publishing.",
    };
  }

  const updateResults = await Promise.all(
    topFivePosts.map((post) => {
      const structuredContent =
        post.editedWhyItMattersStructured ?? post.publishedWhyItMattersStructured;

      return context.client
        .from("signal_posts")
        .update({
          published_why_it_matters: normalizeEditorialText(
            buildEditorialWhyItMattersText(
              structuredContent,
              post.editedWhyItMatters || post.publishedWhyItMatters || "",
            ),
          ),
          published_why_it_matters_payload: structuredContent,
          editorial_status: "published",
          is_live: true,
          published_at: now,
          updated_at: now,
        })
        .eq("id", post.id);
    }),
  );

  const depthUpdateResults = await Promise.all(
    depthPosts
      .map((post) => {
        const structuredContent =
          post.editedWhyItMattersStructured ?? post.publishedWhyItMattersStructured;
        const depthText = normalizeEditorialText(
          buildEditorialWhyItMattersText(
            structuredContent,
            post.editedWhyItMatters || post.publishedWhyItMatters || post.aiWhyItMatters,
          ),
        );

        return { post, structuredContent, depthText };
      })
      .filter((entry) => entry.depthText)
      .map(({ post, structuredContent, depthText }) =>
        context.client
          .from("signal_posts")
          .update({
            published_why_it_matters: depthText,
            published_why_it_matters_payload: structuredContent,
            editorial_status: "published",
            is_live: true,
            published_at: now,
            updated_at: now,
          })
          .eq("id", post.id),
      ),
  );

  if (updateResults.some((result) => result.error) || depthUpdateResults.some((result) => result.error)) {
    return {
      ok: false,
      code: "storage_error",
      message: "The signal set could not be published completely.",
    };
  }

  return {
    ok: true,
    code: "published",
    message: "Top 5 Signals published.",
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

  const lookup = await context.client
    .from("signal_posts")
    .select(SIGNAL_POST_SELECT)
    .eq("id", input.postId)
    .maybeSingle();

  if (lookup.error || !lookup.data) {
    return {
      ok: false,
      code: "not_found",
      message: "The signal post could not be found.",
    };
  }

  const post = mapStoredSignalPost(lookup.data as unknown as StoredSignalPost);

  if (post.editorialStatus !== "approved") {
    return {
      ok: false,
      code: "publish_blocked",
      message: "Approve this signal post before publishing it.",
    };
  }

  const structuredContent = post.editedWhyItMattersStructured;
  const editorialText = normalizeEditorialText(
    buildEditorialWhyItMattersText(structuredContent, post.editedWhyItMatters || ""),
  );

  if (!editorialText) {
    return {
      ok: false,
      code: "publish_blocked",
      message: "Add editorial Why it matters text before publishing this signal post.",
    };
  }

  const now = new Date().toISOString();
  const updateResult = await context.client
    .from("signal_posts")
    .update({
      published_why_it_matters: editorialText,
      published_why_it_matters_payload: structuredContent,
      editorial_status: "published",
      published_at: now,
      updated_at: now,
    })
    .eq("id", post.id);

  if (updateResult.error) {
    return {
      ok: false,
      code: "storage_error",
      message: "The signal post could not be published.",
    };
  }

  return {
    ok: true,
    code: "published",
    message: "Signal post published.",
  };
}

async function loadPublishedSignalPosts(limit: number): Promise<EditorialSignalPost[]> {
  const supabase = createSupabaseServiceRoleClient();

  if (!supabase) {
    return [];
  }

  const result = await supabase
    .from("signal_posts")
    .select(SIGNAL_POST_SELECT)
    .eq("is_live", true)
    .eq("editorial_status", "published")
    .order("rank", { ascending: true })
    .limit(limit);

  if (result.error) {
    logServerEvent("warn", "Published signal posts could not be loaded", {
      route: PUBLIC_SIGNALS_ROUTE,
      errorMessage: result.error.message,
    });
    return [];
  }

  return ((result.data ?? []) as unknown as StoredSignalPost[])
    .map(mapStoredSignalPost)
    .filter((post) => normalizeEditorialText(post.publishedWhyItMatters));
}

export async function getPublishedSignalPosts(): Promise<EditorialSignalPost[]> {
  return (await loadPublishedSignalPosts(5)).slice(0, 5);
}

export async function getHomepageSignalSnapshot(): Promise<HomepageSignalSnapshot> {
  const publishedDepthPosts = await loadPublishedSignalPosts(PUBLIC_SIGNAL_DEPTH_LIMIT);
  const publishedPosts = publishedDepthPosts.slice(0, 5);

  if (publishedPosts.length > 0) {
    return {
      source: "published_live",
      posts: publishedPosts,
      depthPosts: publishedDepthPosts,
      briefingDate: publishedPosts[0]?.briefingDate ?? null,
    };
  }

  const supabase = createSupabaseServiceRoleClient();

  if (!supabase) {
    return {
      source: "none",
      posts: [],
      depthPosts: [],
      briefingDate: null,
    };
  }

  const latest = await getLatestBriefingDate(supabase);

  if (latest.errorMessage) {
    logServerEvent("warn", "Homepage signal snapshot latest date could not be loaded", {
      route: "/",
      errorMessage: latest.errorMessage,
    });

    return {
      source: "none",
      posts: [],
      depthPosts: [],
      briefingDate: null,
    };
  }

  if (!latest.latestBriefingDate) {
    return {
      source: "none",
      posts: [],
      depthPosts: [],
      briefingDate: null,
    };
  }

  const posts = await loadCurrentTopFive(supabase, latest.latestBriefingDate);

  if (posts.length === 0) {
    return {
      source: "none",
      posts: [],
      depthPosts: [],
      briefingDate: latest.latestBriefingDate,
    };
  }

  return {
    source: "latest_snapshot",
    posts,
    depthPosts: posts,
    briefingDate: latest.latestBriefingDate,
  };
}
