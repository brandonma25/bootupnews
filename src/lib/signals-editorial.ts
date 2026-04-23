import type { User } from "@supabase/supabase-js";

import { isAdminUser } from "@/lib/admin-auth";
import { generateDailyBriefing } from "@/lib/data";
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
  "editorial_status",
  "edited_by",
  "edited_at",
  "approved_by",
  "approved_at",
  "published_at",
  "created_at",
  "updated_at",
].join(", ");

type EditorialClient = NonNullable<ReturnType<typeof createSupabaseServiceRoleClient>>;

type StoredSignalPost = {
  id: string;
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
  editorial_status: EditorialStatus;
  edited_by: string | null;
  edited_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  published_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type EditorialSignalPost = {
  id: string;
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
  editorialStatus: EditorialStatus;
  editedBy: string | null;
  editedAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  publishedAt: string | null;
  persisted: boolean;
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
      storageReady: boolean;
      warning: string | null;
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

function normalizeEditorialText(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function mapStoredSignalPost(row: StoredSignalPost): EditorialSignalPost {
  return {
    id: row.id,
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
    editorialStatus: row.editorial_status,
    editedBy: row.edited_by,
    editedAt: row.edited_at,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    publishedAt: row.published_at,
    persisted: true,
  };
}

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
    editorialStatus: "needs_review",
    editedBy: null,
    editedAt: null,
    approvedBy: null,
    approvedAt: null,
    publishedAt: null,
    persisted: false,
  };
}

async function loadStoredSignalPosts(client: EditorialClient) {
  const result = await client
    .from("signal_posts")
    .select(SIGNAL_POST_SELECT)
    .order("rank", { ascending: true });

  if (result.error) {
    return {
      posts: [],
      errorMessage: result.error.message,
    };
  }

  return {
    posts: ((result.data ?? []) as unknown as StoredSignalPost[]).map(mapStoredSignalPost),
    errorMessage: null,
  };
}

async function buildCurrentSignalCandidates() {
  const { briefing } = await generateDailyBriefing();

  return briefing.items
    .slice(0, 5)
    .map(mapBriefingItemToSignalPost);
}

async function seedSignalPosts(client: EditorialClient) {
  const candidates = await buildCurrentSignalCandidates();

  if (candidates.length !== 5) {
    return {
      posts: candidates,
      warning: `The current signal pipeline returned ${candidates.length} signal posts. Publishing requires exactly five.`,
    };
  }

  const now = new Date().toISOString();
  const insertResult = await client.from("signal_posts").insert(
    candidates.map((post) => ({
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
      created_at: now,
      updated_at: now,
    })),
  );

  if (insertResult.error) {
    return {
      posts: candidates,
      warning: `The current Top 5 could not be persisted for editing: ${insertResult.error.message}`,
    };
  }

  return {
    posts: (await loadStoredSignalPosts(client)).posts,
    warning: null,
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
): Promise<EditorialReviewState> {
  const context = await getAdminEditorialContext(route);

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
      storageReady: false,
      warning: context.message,
    };
  }

  const loaded = await loadStoredSignalPosts(context.client);

  if (loaded.errorMessage) {
    logServerEvent("warn", "Editorial signal posts could not be loaded", {
      route,
      errorMessage: loaded.errorMessage,
    });

    return {
      kind: "authorized",
      adminEmail: context.user.email ?? "",
      posts: [],
      storageReady: false,
      warning: `Editorial signal storage could not be read: ${loaded.errorMessage}`,
    };
  }

  if (loaded.posts.length === 0) {
    const seeded = await seedSignalPosts(context.client);

    return {
      kind: "authorized",
      adminEmail: context.user.email ?? "",
      posts: seeded.posts,
      storageReady: true,
      warning: seeded.warning,
    };
  }

  return {
    kind: "authorized",
    adminEmail: context.user.email ?? "",
    posts: loaded.posts,
    storageReady: true,
    warning:
      loaded.posts.length === 5
        ? null
        : `Editorial storage currently has ${loaded.posts.length} signal posts. Publishing requires exactly five.`,
  };
}

export async function saveSignalDraft(input: {
  postId: string;
  editedWhyItMatters: string;
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
  const updateResult = await context.client
    .from("signal_posts")
    .update({
      edited_why_it_matters: normalizeEditorialText(input.editedWhyItMatters),
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
      message: "The draft could not be saved.",
    };
  }

  return {
    ok: true,
    code: "draft_saved",
    message: "Draft saved.",
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
  },
): Promise<EditorialMutationResult> {
  const editorialText = normalizeEditorialText(input.editedWhyItMatters);

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

  const results = await Promise.all(
    uniquePosts.map((post) => approveSignalPostWithContext(context, post)),
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

  const { posts, errorMessage } = await loadStoredSignalPosts(context.client);

  if (errorMessage) {
    return {
      ok: false,
      code: "storage_error",
      message: "The Top 5 list could not be loaded for publishing.",
    };
  }

  if (posts.length !== 5) {
    return {
      ok: false,
      code: "publish_blocked",
      message: `Publishing requires exactly five signal posts. Current count: ${posts.length}.`,
    };
  }

  const unapproved = posts.filter((post) => post.editorialStatus !== "approved");

  if (unapproved.length > 0) {
    return {
      ok: false,
      code: "publish_blocked",
      message: "Approve all five signal posts before publishing.",
    };
  }

  const missingEditorialText = posts.filter(
    (post) => !normalizeEditorialText(post.editedWhyItMatters),
  );

  if (missingEditorialText.length > 0) {
    return {
      ok: false,
      code: "publish_blocked",
      message: "Every approved signal post needs editorial Why it matters text before publishing.",
    };
  }

  const now = new Date().toISOString();
  const updateResults = await Promise.all(
    posts.map((post) =>
      context.client
        .from("signal_posts")
        .update({
          published_why_it_matters: normalizeEditorialText(post.editedWhyItMatters),
          editorial_status: "published",
          published_at: now,
          updated_at: now,
        })
        .eq("id", post.id),
    ),
  );

  if (updateResults.some((result) => result.error)) {
    return {
      ok: false,
      code: "storage_error",
      message: "The Top 5 list could not be published completely.",
    };
  }

  return {
    ok: true,
    code: "published",
    message: "Top 5 Signals published.",
  };
}

export async function getPublishedSignalPosts(): Promise<EditorialSignalPost[]> {
  const supabase = createSupabaseServiceRoleClient();

  if (!supabase) {
    return [];
  }

  const result = await supabase
    .from("signal_posts")
    .select(SIGNAL_POST_SELECT)
    .order("rank", { ascending: true })
    .limit(5);

  if (result.error) {
    logServerEvent("warn", "Published signal posts could not be loaded", {
      route: PUBLIC_SIGNALS_ROUTE,
      errorMessage: result.error.message,
    });
    return [];
  }

  return ((result.data ?? []) as unknown as StoredSignalPost[])
    .map(mapStoredSignalPost)
    .filter((post) => normalizeEditorialText(post.publishedWhyItMatters))
    .slice(0, 5);
}
