"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { env, isSupabaseConfigured } from "@/lib/env";
import { generateDailyBriefing } from "@/lib/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const topicSchema = z.object({
  name: z.string().min(2).max(40),
  description: z.string().min(10).max(200),
  color: z.string().min(4).max(20),
});

const sourceSchema = z.object({
  name: z.string().min(2).max(60),
  feedUrl: z.url(),
  homepageUrl: z.string().optional(),
  topicId: z.string().min(1),
});

export async function requestMagicLinkAction(formData: FormData) {
  const email = z.string().email().parse(formData.get("email"));

  if (!isSupabaseConfigured) {
    redirect("/?demo=1");
  }

  const supabase = await createSupabaseServerClient();

  await supabase?.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${env.appUrl}/auth/callback`,
    },
  });

  redirect("/?sent=1");
}

export async function createTopicAction(formData: FormData) {
  if (!isSupabaseConfigured) {
    redirect("/topics?demo=1");
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/topics?demo=1");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/?auth=1");
  }

  const payload = topicSchema.parse({
    name: formData.get("name"),
    description: formData.get("description"),
    color: formData.get("color"),
  });

  await supabase.from("topics").insert({
    user_id: user.id,
    ...payload,
  });

  revalidatePath("/topics");
  revalidatePath("/dashboard");
  redirect("/topics?saved=1");
}

export async function createSourceAction(formData: FormData) {
  if (!isSupabaseConfigured) {
    redirect("/sources?demo=1");
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/sources?demo=1");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/?auth=1");
  }

  const payload = sourceSchema.parse({
    name: formData.get("name"),
    feedUrl: formData.get("feedUrl"),
    homepageUrl: (formData.get("homepageUrl") || "").toString(),
    topicId: formData.get("topicId"),
  });

  await supabase.from("sources").insert({
    user_id: user.id,
    name: payload.name,
    feed_url: payload.feedUrl,
    homepage_url: payload.homepageUrl || null,
    topic_id: payload.topicId,
    status: "active",
  });

  revalidatePath("/sources");
  revalidatePath("/dashboard");
  redirect("/sources?saved=1");
}

export async function generateBriefingAction() {
  if (!isSupabaseConfigured) {
    redirect("/dashboard?demo=1");
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/dashboard?demo=1");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/?auth=1");
  }

  const [{ data: topics }, { data: sources }] = await Promise.all([
    supabase
      .from("topics")
      .select("id, user_id, name, description, color, created_at")
      .eq("user_id", user.id),
    supabase
      .from("sources")
      .select("id, user_id, name, feed_url, homepage_url, topic_id, status, created_at")
      .eq("user_id", user.id)
      .eq("status", "active"),
  ]);

  const briefing = await generateDailyBriefing(
    (topics ?? []).map((topic) => ({
      id: topic.id,
      userId: topic.user_id,
      name: topic.name,
      description: topic.description,
      color: topic.color,
      createdAt: topic.created_at,
    })),
    (sources ?? []).map((source) => ({
      id: source.id,
      userId: source.user_id,
      name: source.name,
      feedUrl: source.feed_url,
      homepageUrl: source.homepage_url ?? undefined,
      topicId: source.topic_id ?? undefined,
      status: source.status,
      createdAt: source.created_at,
    })),
  );

  const briefingDate = briefing.briefingDate.slice(0, 10);
  const { data: existing } = await supabase
    .from("daily_briefings")
    .select("id")
    .eq("user_id", user.id)
    .eq("briefing_date", briefingDate)
    .maybeSingle();

  let briefingId = existing?.id;

  if (!briefingId) {
    const { data: inserted } = await supabase
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

    briefingId = inserted?.id;
  } else {
    await supabase
      .from("daily_briefings")
      .update({
        title: briefing.title,
        intro: briefing.intro,
        reading_window: briefing.readingWindow,
      })
      .eq("id", briefingId);

    await supabase.from("briefing_items").delete().eq("briefing_id", briefingId);
  }

  if (briefingId) {
    await supabase.from("briefing_items").insert(
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
  }

  revalidatePath("/dashboard");
  revalidatePath("/history");
  redirect("/dashboard?generated=1");
}

export async function toggleReadAction(formData: FormData) {
  if (!isSupabaseConfigured) {
    redirect("/dashboard?demo=1");
  }

  const itemId = z.string().min(1).parse(formData.get("itemId"));
  const current = z.enum(["true", "false"]).parse(formData.get("current"));
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/dashboard?demo=1");

  await supabase
    .from("briefing_items")
    .update({ is_read: current !== "true" })
    .eq("id", itemId);

  revalidatePath("/dashboard");
  revalidatePath("/history");
}
