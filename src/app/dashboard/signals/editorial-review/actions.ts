"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  normalizeEditorialWhyItMattersContent,
  parseEditorialWhyItMattersContent,
} from "@/lib/editorial-content";
import {
  PUBLIC_SIGNALS_ROUTE,
  SIGNALS_EDITORIAL_ROUTE,
  approveSignalPost,
  approveSignalPosts,
  assignSignalPostToFinalSlateSlot,
  publishApprovedSignals,
  publishSignalPost,
  removeSignalPostFromFinalSlate,
  resetSignalPostToAiDraft,
  saveSignalDraft,
  type EditorialMutationResult,
} from "@/lib/signals-editorial";

function redirectWithResult(result: EditorialMutationResult) {
  const params = new URLSearchParams();
  params.set(result.ok ? "success" : "error", result.message);

  redirect(`${SIGNALS_EDITORIAL_ROUTE}?${params.toString()}`);
}

function revalidateEditorialRoutes() {
  revalidatePath("/");
  revalidatePath(SIGNALS_EDITORIAL_ROUTE);
  revalidatePath(PUBLIC_SIGNALS_ROUTE);
}

function revalidateEditorialReviewRoute() {
  revalidatePath(SIGNALS_EDITORIAL_ROUTE);
}

function readStructuredEditorialInput(formData: FormData) {
  const sectionTitles = formData.getAll("sectionTitle").map((value) => String(value));
  const sectionBodies = formData.getAll("sectionBody").map((value) => String(value));
  const structuredFromJson = parseEditorialWhyItMattersContent(
    parseStructuredJson(String(formData.get("structuredWhyItMatters") ?? "")),
  );

  return normalizeEditorialWhyItMattersContent({
    preview: String(formData.get("homepagePreview") ?? structuredFromJson?.preview ?? ""),
    thesis: String(formData.get("editorialThesis") ?? structuredFromJson?.thesis ?? ""),
    sections: sectionTitles.length || sectionBodies.length
      ? sectionTitles.map((title, index) => ({
          title,
          body: sectionBodies[index] ?? "",
        }))
      : structuredFromJson?.sections,
  });
}

function parseStructuredJson(value: string) {
  if (!value.trim()) {
    return null;
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

export async function saveSignalDraftAction(formData: FormData) {
  const result = await saveSignalDraft({
    postId: String(formData.get("postId") ?? ""),
    editedWhyItMatters: String(formData.get("editedWhyItMatters") ?? ""),
    editedWhyItMattersStructured: readStructuredEditorialInput(formData),
  });

  if (result.ok) {
    revalidateEditorialRoutes();
  }

  redirectWithResult(result);
}

export async function approveSignalPostAction(formData: FormData) {
  const result = await approveSignalPost({
    postId: String(formData.get("postId") ?? ""),
    editedWhyItMatters: String(formData.get("editedWhyItMatters") ?? ""),
    editedWhyItMattersStructured: readStructuredEditorialInput(formData),
  });

  if (result.ok) {
    revalidateEditorialRoutes();
  }

  redirectWithResult(result);
}

export async function approveAllSignalPostsAction(formData: FormData) {
  const postIds = formData.getAll("postId").map((value) => String(value));
  const editedWhyItMattersValues = formData
    .getAll("editedWhyItMatters")
    .map((value) => String(value));
  const structuredValues = formData
    .getAll("structuredWhyItMatters")
    .map((value) => parseEditorialWhyItMattersContent(parseStructuredJson(String(value))));
  const result = await approveSignalPosts({
    posts: postIds.map((postId, index) => ({
      postId,
      editedWhyItMatters: editedWhyItMattersValues[index] ?? "",
      editedWhyItMattersStructured: structuredValues[index] ?? null,
    })),
  });

  if (result.ok) {
    revalidateEditorialRoutes();
  }

  redirectWithResult(result);
}

export async function resetSignalPostToAiDraftAction(formData: FormData) {
  const result = await resetSignalPostToAiDraft({
    postId: String(formData.get("postId") ?? ""),
  });

  if (result.ok) {
    revalidateEditorialRoutes();
  }

  redirectWithResult(result);
}

export async function publishTopSignalsAction() {
  const result = await publishApprovedSignals();

  if (result.ok) {
    revalidateEditorialRoutes();
  }

  redirectWithResult(result);
}

export async function publishSignalPostAction(formData: FormData) {
  const result = await publishSignalPost({
    postId: String(formData.get("postId") ?? ""),
  });

  if (result.ok) {
    revalidateEditorialRoutes();
  }

  redirectWithResult(result);
}

export async function assignFinalSlateSlotAction(formData: FormData) {
  const result = await assignSignalPostToFinalSlateSlot({
    postId: String(formData.get("postId") ?? ""),
    finalSlateRank: Number(formData.get("finalSlateRank") ?? NaN),
  });

  if (result.ok) {
    revalidateEditorialReviewRoute();
  }

  redirectWithResult(result);
}

export async function removeFromFinalSlateAction(formData: FormData) {
  const result = await removeSignalPostFromFinalSlate({
    postId: String(formData.get("postId") ?? ""),
  });

  if (result.ok) {
    revalidateEditorialReviewRoute();
  }

  redirectWithResult(result);
}
