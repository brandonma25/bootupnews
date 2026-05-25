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
  holdSignalPost,
  publishApprovedSignals,
  publishSignalPost,
  rejectSignalPost,
  removeSignalPostFromFinalSlate,
  replaceSignalPostInFinalSlate,
  republishLiveSignalPost,
  requestSignalPostRewrite,
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

/**
 * Read a non-WITM layer's text field from the composer form (#274). The form
 * posts the edited text as `<fieldName>`. We do not yet expose a structured
 * editor for these layers — the lib's `buildLayerEditorialWrite` derives a
 * legacy-text payload server-side from this string when none is provided.
 * Returns `undefined` (not "") when the field is absent so the lib's
 * "do not touch unless provided" semantics hold. Empty strings ARE passed
 * through (meaning the editor intentionally cleared the layer).
 */
function readLayerEditorialText(formData: FormData, fieldName: string): string | undefined {
  const raw = formData.get(fieldName);
  return raw === null ? undefined : String(raw);
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
    editedWhatLedToIt: readLayerEditorialText(formData, "editedWhatLedToIt"),
    editedWhatItConnectsTo: readLayerEditorialText(formData, "editedWhatItConnectsTo"),
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
    editedWhatLedToIt: readLayerEditorialText(formData, "editedWhatLedToIt"),
    editedWhatItConnectsTo: readLayerEditorialText(formData, "editedWhatItConnectsTo"),
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
  // Per-row Before This / The Ripple text. Form posts these as parallel
  // arrays keyed on row index (one entry per postId). Empty string
  // intentionally clears that layer; absent entry leaves it untouched.
  const wltiValues = formData.getAll("editedWhatLedToIt").map((value) => String(value));
  const witcValues = formData
    .getAll("editedWhatItConnectsTo")
    .map((value) => String(value));
  const result = await approveSignalPosts({
    posts: postIds.map((postId, index) => ({
      postId,
      editedWhyItMatters: editedWhyItMattersValues[index] ?? "",
      editedWhyItMattersStructured: structuredValues[index] ?? null,
      editedWhatLedToIt: wltiValues[index],
      editedWhatItConnectsTo: witcValues[index],
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

export async function requestRewriteAction(formData: FormData) {
  const result = await requestSignalPostRewrite({
    postId: String(formData.get("postId") ?? ""),
    decisionNote: String(formData.get("decisionNote") ?? ""),
  });

  if (result.ok) {
    revalidateEditorialReviewRoute();
  }

  redirectWithResult(result);
}

export async function rejectSignalPostAction(formData: FormData) {
  const result = await rejectSignalPost({
    postId: String(formData.get("postId") ?? ""),
    decisionNote: String(formData.get("decisionNote") ?? ""),
  });

  if (result.ok) {
    revalidateEditorialReviewRoute();
  }

  redirectWithResult(result);
}

export async function holdSignalPostAction(formData: FormData) {
  const result = await holdSignalPost({
    postId: String(formData.get("postId") ?? ""),
    decisionNote: String(formData.get("decisionNote") ?? ""),
  });

  if (result.ok) {
    revalidateEditorialReviewRoute();
  }

  redirectWithResult(result);
}

async function runPublishFinalSlateAction() {
  const result = await publishApprovedSignals();

  if (result.ok) {
    revalidateEditorialRoutes();
  }

  redirectWithResult(result);
}

export async function publishFinalSlateAction() {
  await runPublishFinalSlateAction();
}

export async function publishTopSignalsAction() {
  await runPublishFinalSlateAction();
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

/**
 * Re-publish an already-live signal post in place (#280). Snapshots the
 * prior `published_*` into `previous_published_snapshot` and overwrites
 * from `edited_*`. Refuses for never-published cards (use the slate
 * publish gate instead) and refuses on WITM validator failure.
 */
export async function republishLiveSignalPostAction(formData: FormData) {
  const result = await republishLiveSignalPost({
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

export async function assignFinalSlateSlotInlineAction(postId: string, finalSlateRank: number) {
  const result = await assignSignalPostToFinalSlateSlot({
    postId,
    finalSlateRank,
  });

  if (result.ok) {
    revalidateEditorialReviewRoute();
  }

  return result;
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

export async function replaceFinalSlateSlotAction(formData: FormData) {
  const result = await replaceSignalPostInFinalSlate({
    originalPostId: String(formData.get("originalPostId") ?? ""),
    replacementPostId: String(formData.get("replacementPostId") ?? ""),
    decisionNote: String(formData.get("decisionNote") ?? ""),
  });

  if (result.ok) {
    revalidateEditorialReviewRoute();
  }

  redirectWithResult(result);
}
