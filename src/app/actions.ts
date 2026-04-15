"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { buildAuthCallbackUrl, buildAuthConfigErrorPath } from "@/lib/auth";
import { env, isSupabaseConfigured } from "@/lib/env";
import { bootstrapUserDefaults, seedDefaultTopics } from "@/lib/default-topics";
import { buildMatchedBriefing, persistRawArticles, syncEventClusters, syncTopicMatches } from "@/lib/data";
import { errorContext, logServerEvent } from "@/lib/observability";
import { parseKeywordList } from "@/lib/topic-matching";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const topicSchema = z.object({
  name: z.string().min(2).max(40),
  description: z.string().min(10).max(200),
  color: z.string().min(4).max(20),
  keywords: z.array(z.string().min(1)).default([]),
  excludeKeywords: z.array(z.string().min(1)).default([]),
});

const sourceSchema = z.object({
  name: z.string().min(2).max(60),
  feedUrl: z.url(),
  homepageUrl: z.string().optional(),
  topicId: z.string().optional(),
});

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
});

type SupabaseServerClient = NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>;
type UserEventStateUpsert = {
  event_key: string;
  last_seen_fingerprint: string;
  last_seen_importance_score: number;
  last_viewed_at: string | null;
};

async function syncUserProfile() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return { supabase: null, user: null };
  }

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await bootstrapUserDefaults(supabase, user);
    }

    return { supabase, user };
  } catch (error) {
    logServerEvent("error", "syncUserProfile failed", {
      route: "server-action",
      ...errorContext(error),
    });
    return { supabase, user: null };
  }
}

async function requireActionSession(unauthenticatedRedirect: string, route: string) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirect(buildAuthConfigErrorPath());
  }

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/?auth=1");
    }

    return { supabase, user };
  } catch (error) {
    logServerEvent("error", "Action auth lookup failed", {
      route,
      ...errorContext(error),
    });
    redirect("/?auth=callback-error");
  }
}

async function ensureDefaultTopic(
  supabase: SupabaseServerClient,
  userId: string,
) {
  await seedDefaultTopics(supabase, userId);

  const preferredTopic = await supabase
    .from("topics")
    .select("id")
    .eq("user_id", userId)
    .eq("name", "Tech")
    .maybeSingle();

  if (preferredTopic.error) {
    throw preferredTopic.error;
  }

  if (preferredTopic.data?.id) {
    return preferredTopic.data.id;
  }

  const existingTopic = await supabase
    .from("topics")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existingTopic.error) {
    throw existingTopic.error;
  }

  if (existingTopic.data?.id) {
    return existingTopic.data.id;
  }

  throw new Error("Default topic creation failed");
}

async function upsertUserEventState(
  supabase: SupabaseServerClient,
  userId: string,
  rows: UserEventStateUpsert[],
) {
  if (!rows.length) {
    return;
  }

  const now = new Date().toISOString();
  const result = await supabase.from("user_event_state").upsert(
    rows.map((row) => ({
      user_id: userId,
      event_key: row.event_key,
      last_seen_at: now,
      last_viewed_at: row.last_viewed_at,
      last_seen_fingerprint: row.last_seen_fingerprint,
      last_seen_importance_score: row.last_seen_importance_score,
    })),
    { onConflict: "user_id,event_key" },
  );

  if (result.error) {
    throw result.error;
  }
}

export async function requestMagicLinkAction(formData: FormData) {
  const email = z.string().email().parse(formData.get("email"));

  if (!isSupabaseConfigured) {
    redirect(buildAuthConfigErrorPath());
  }

  const supabase = await createSupabaseServerClient();

  try {
    await supabase?.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: buildAuthCallbackUrl({ origin: env.appUrl }),
      },
    });
  } catch (error) {
    logServerEvent("error", "Magic link request failed", {
      route: "/",
      email,
      ...errorContext(error),
    });
    redirect("/?auth=callback-error");
  }

  redirect("/?sent=1");
}

export async function signUpWithPasswordAction(formData: FormData) {
  const { email, password } = credentialsSchema.parse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!isSupabaseConfigured) {
    redirect(buildAuthConfigErrorPath());
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    redirect("/?auth=signup-error");
  }

  const result = await supabase.auth
    .signUp({
      email,
      password,
      options: {
        emailRedirectTo: buildAuthCallbackUrl({ origin: env.appUrl }),
      },
    })
    .catch((error) => {
      logServerEvent("error", "Password sign-up failed", {
        route: "/",
        email,
        ...errorContext(error),
      });
      redirect("/?auth=signup-error");
    });
  const { data, error } = result;

  if (error) {
    redirect("/?auth=signup-error");
  }

  if (data.user) {
    await bootstrapUserDefaults(supabase, data.user, email);
  }

  if (data.session) {
    revalidatePath("/");
    revalidatePath("/dashboard");
    redirect("/dashboard");
  }

  redirect("/?auth=confirm");
}

export async function signInWithPasswordAction(formData: FormData) {
  const { email, password } = credentialsSchema.parse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!isSupabaseConfigured) {
    redirect(buildAuthConfigErrorPath());
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    redirect("/?auth=invalid");
  }

  const result = await supabase.auth
    .signInWithPassword({
      email,
      password,
    })
    .catch((error) => {
      logServerEvent("error", "Password sign-in failed", {
        route: "/",
        email,
        ...errorContext(error),
      });
      redirect("/?auth=invalid");
    });
  const { error } = result;

  if (error) {
    redirect("/?auth=invalid");
  }

  await syncUserProfile();

  revalidatePath("/");
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function signOutAction() {
  if (!isSupabaseConfigured) {
    redirect(buildAuthConfigErrorPath());
  }

  const supabase = await createSupabaseServerClient();

  try {
    await supabase?.auth.signOut();
  } catch (error) {
    logServerEvent("warn", "Sign-out failed; continuing with local reset path", {
      route: "signOutAction",
      ...errorContext(error),
    });
  }

  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/topics");
  revalidatePath("/sources");
  revalidatePath("/history");
  revalidatePath("/settings");
  redirect("/");
}

export async function createTopicAction(formData: FormData) {
  if (!isSupabaseConfigured) {
    redirect("/topics?demo=1");
  }

  const { supabase, user } = await requireActionSession("/topics?demo=1", "createTopicAction");

  const payload = topicSchema.parse({
    name: formData.get("name"),
    description: formData.get("description"),
    color: formData.get("color"),
    keywords: parseKeywordList(formData.get("keywords")),
    excludeKeywords: parseKeywordList(formData.get("excludeKeywords")),
  });

  try {
    const topicInsert = await supabase.from("topics").insert({
      user_id: user.id,
      name: payload.name,
      description: payload.description,
      color: payload.color,
      keywords: payload.keywords.length ? payload.keywords : [payload.name],
      exclude_keywords: payload.excludeKeywords,
    });
    if (topicInsert.error) {
      throw topicInsert.error;
    }
  } catch (error) {
    logServerEvent("error", "Topic creation failed", {
      route: "/topics",
      userId: user.id,
      ...errorContext(error),
    });
    redirect("/topics?error=1");
  }

  revalidatePath("/topics");
  revalidatePath("/dashboard");
  redirect("/topics?saved=1");
}

export async function createSourceAction(formData: FormData) {
  if (!isSupabaseConfigured) {
    redirect("/sources?demo=1");
  }

  const { supabase, user } = await requireActionSession("/sources?demo=1", "createSourceAction");

  const payload = sourceSchema.parse({
    name: formData.get("name"),
    feedUrl: formData.get("feedUrl"),
    homepageUrl: (formData.get("homepageUrl") || "").toString(),
    topicId: (formData.get("topicId") || "").toString() || undefined,
  });

  let topicId = payload.topicId;
  if (!topicId || topicId === "__auto__") {
    try {
      topicId = await ensureDefaultTopic(supabase, user.id);
    } catch (error) {
      logServerEvent("error", "Default topic resolution failed", {
        route: "/sources",
        userId: user.id,
        ...errorContext(error),
      });
      redirect("/sources?error=1");
    }
  }

  let existing: { id: string } | null = null;
  try {
    const sourceLookup = await supabase
      .from("sources")
      .select("id")
      .eq("user_id", user.id)
      .eq("feed_url", payload.feedUrl)
      .eq("topic_id", topicId)
      .maybeSingle();
    if (sourceLookup.error) {
      throw sourceLookup.error;
    }
    existing = sourceLookup.data;
  } catch (error) {
    logServerEvent("error", "Source lookup failed", {
      route: "/sources",
      userId: user.id,
      ...errorContext(error),
    });
    redirect("/sources?error=1");
  }

  if (!existing) {
    try {
      const sourceInsert = await supabase.from("sources").insert({
        user_id: user.id,
        name: payload.name,
        feed_url: payload.feedUrl,
        homepage_url: payload.homepageUrl || null,
        topic_id: topicId,
        status: "active",
      });
      if (sourceInsert.error) {
        throw sourceInsert.error;
      }
    } catch (error) {
      logServerEvent("error", "Source creation failed", {
        route: "/sources",
        userId: user.id,
        ...errorContext(error),
      });
      redirect("/sources?error=1");
    }
  }

  revalidatePath("/sources");
  revalidatePath("/dashboard");
  redirect("/sources?saved=1");
}

export async function generateBriefingAction() {
  if (!isSupabaseConfigured) {
    redirect("/dashboard?demo=1");
  }

  const { supabase, user } = await requireActionSession("/dashboard?demo=1", "generateBriefingAction");

  const [topicResult, sourceResult] = await Promise.all([
    supabase
      .from("topics")
      .select("id, user_id, name, description, color, keywords, exclude_keywords, created_at")
      .eq("user_id", user.id),
    supabase
      .from("sources")
      .select("id, user_id, name, feed_url, homepage_url, topic_id, status, created_at")
      .eq("user_id", user.id)
      .eq("status", "active"),
  ]).catch((error) => {
    logServerEvent("error", "Briefing prerequisites failed", {
      route: "/dashboard",
      userId: user.id,
      ...errorContext(error),
    });
    redirect("/dashboard?error=1");
  });
  const topics = topicResult.data ?? [];
  const sources = sourceResult.data ?? [];
  const normalizedSources = sources.map((source) => ({
    id: source.id,
    userId: source.user_id,
    name: source.name,
    feedUrl: source.feed_url,
    homepageUrl: source.homepage_url ?? undefined,
    topicId: source.topic_id ?? undefined,
    status: source.status,
    createdAt: source.created_at,
  }));

  await persistRawArticles(supabase, user.id, normalizedSources, "/dashboard?action=generate");

  const normalizedTopics = topics.map((topic) => ({
    id: topic.id,
    userId: topic.user_id,
    name: topic.name,
    description: topic.description,
    color: topic.color,
    keywords: (topic.keywords as string[] | null | undefined) ?? [],
    excludeKeywords: (topic.exclude_keywords as string[] | null | undefined) ?? [],
    createdAt: topic.created_at,
  }));

  await syncTopicMatches(supabase, user.id, normalizedTopics);
  await syncEventClusters(supabase, user.id, normalizedTopics, normalizedSources);

  const briefing = await buildMatchedBriefing(supabase, user.id, normalizedTopics, normalizedSources);

  const briefingDate = briefing.briefingDate.slice(0, 10);
  let existing: { id: string } | null = null;
  try {
    const briefingLookup = await supabase
      .from("daily_briefings")
      .select("id")
      .eq("user_id", user.id)
      .eq("briefing_date", briefingDate)
      .maybeSingle();
    existing = briefingLookup.data;
  } catch (error) {
    logServerEvent("error", "Briefing lookup failed", {
      route: "/dashboard",
      userId: user.id,
      ...errorContext(error),
    });
    redirect("/dashboard?error=1");
  }

  let briefingId = existing?.id;

  if (!briefingId) {
    const { data: inserted, error: briefingInsertError } = await supabase
      .from("daily_briefings")
      .insert({
        user_id: user.id,
        briefing_date: briefingDate,
        title: briefing.title,
        intro: briefing.intro,
        reading_window: briefing.readingWindow,
      })
      .select("id")
      .single();

    if (briefingInsertError) {
      logServerEvent("error", "Briefing insert failed", {
        route: "/dashboard",
        userId: user.id,
        errorMessage: briefingInsertError.message,
      });
      redirect("/dashboard?error=1");
    }

    briefingId = inserted?.id;
  } else {
    const briefingUpdate = await supabase
      .from("daily_briefings")
      .update({
        title: briefing.title,
        intro: briefing.intro,
        reading_window: briefing.readingWindow,
      })
      .eq("id", briefingId);
    if (briefingUpdate.error) {
      logServerEvent("error", "Briefing update failed", {
        route: "/dashboard",
        userId: user.id,
        errorMessage: briefingUpdate.error.message,
      });
      redirect("/dashboard?error=1");
    }

    const briefingItemDelete = await supabase.from("briefing_items").delete().eq("briefing_id", briefingId);
    if (briefingItemDelete.error) {
      logServerEvent("error", "Briefing item reset failed", {
        route: "/dashboard",
        userId: user.id,
        errorMessage: briefingItemDelete.error.message,
      });
      redirect("/dashboard?error=1");
    }
  }

  if (briefingId) {
    const briefingItemInsert = await supabase.from("briefing_items").insert(
      briefing.items.map((item) => ({
        briefing_id: briefingId,
        topic_id: item.topicId,
        topic_name: item.topicName,
        title: item.title,
        what_happened: item.whatHappened,
        key_points: item.keyPoints,
        why_it_matters: item.whyItMatters,
        sources: item.sources,
        estimated_minutes: item.estimatedMinutes,
        priority: item.priority,
        is_read: item.read,
      })),
    );
    if (briefingItemInsert.error) {
      logServerEvent("error", "Briefing item insert failed", {
        route: "/dashboard",
        userId: user.id,
        errorMessage: briefingItemInsert.error.message,
        attemptedItems: briefing.items.length,
      });
      redirect("/dashboard?error=1");
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/history");
  redirect("/dashboard?generated=1");
}

export async function toggleReadAction(formData: FormData) {
  if (!isSupabaseConfigured) {
    redirect("/dashboard?demo=1");
  }

  const itemId = z.string().optional().parse(formData.get("itemId"));
  const eventKey = z.string().min(1).parse(formData.get("eventKey"));
  const continuityFingerprint = z.string().min(1).parse(formData.get("continuityFingerprint"));
  const importanceScore = z.coerce.number().default(0).parse(formData.get("importanceScore"));
  const current = z.enum(["true", "false"]).parse(formData.get("current"));
  const { supabase, user } = await requireActionSession("/dashboard?demo=1", "toggleReadAction");

  try {
    await upsertUserEventState(supabase, user.id, [
      {
        event_key: eventKey,
        last_seen_fingerprint: continuityFingerprint,
        last_seen_importance_score: importanceScore,
        last_viewed_at: current === "true" ? null : new Date().toISOString(),
      },
    ]);

    if (itemId && !itemId.startsWith("generated-")) {
      await supabase
        .from("briefing_items")
        .update({ is_read: current !== "true" })
        .eq("id", itemId);
    }
  } catch (error) {
    logServerEvent("error", "Toggle read failed", {
      route: "/dashboard",
      itemId,
      eventKey,
      ...errorContext(error),
    });
    redirect("/dashboard?error=1");
  }

  revalidatePath("/dashboard");
  revalidatePath("/history");
}

export async function markAllReadAction(formData: FormData) {
  if (!isSupabaseConfigured) {
    redirect("/dashboard");
  }

  const { supabase, user } = await requireActionSession("/dashboard", "markAllReadAction");
  const rawStates = z.string().min(2).parse(formData.get("eventStates"));
  const eventStates = z.array(
    z.object({
      eventKey: z.string().min(1),
      continuityFingerprint: z.string().min(1),
      importanceScore: z.number(),
    }),
  ).parse(JSON.parse(rawStates));
  const briefingId = z.string().optional().parse(formData.get("briefingId"));

  try {
    await upsertUserEventState(
      supabase,
      user.id,
      eventStates.map((state) => ({
        event_key: state.eventKey,
        last_seen_fingerprint: state.continuityFingerprint,
        last_seen_importance_score: state.importanceScore,
        last_viewed_at: new Date().toISOString(),
      })),
    );

    if (briefingId && !briefingId.startsWith("generated-")) {
      await supabase
        .from("briefing_items")
        .update({ is_read: true })
        .eq("briefing_id", briefingId);
    }
  } catch (error) {
    logServerEvent("error", "Mark all read failed", {
      route: "/dashboard",
      userId: user.id,
      briefingId,
      attemptedItems: eventStates.length,
      ...errorContext(error),
    });
    redirect("/dashboard?error=1");
  }

  revalidatePath("/dashboard");
  revalidatePath("/history");
  redirect("/dashboard?allread=1");
}

export async function deleteTopicAction(formData: FormData) {
  if (!isSupabaseConfigured) {
    redirect("/topics?demo=1");
  }

  const topicId = z.string().min(1).parse(formData.get("topicId"));
  const { supabase, user } = await requireActionSession("/topics?demo=1", "deleteTopicAction");

  await supabase
    .from("topics")
    .delete()
    .eq("id", topicId)
    .eq("user_id", user.id);

  revalidatePath("/topics");
  revalidatePath("/dashboard");
  redirect("/topics");
}
