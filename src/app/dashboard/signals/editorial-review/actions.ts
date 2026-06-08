"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  normalizeEditorialWhyItMattersContent,
  parseEditorialWhyItMattersContent,
  type EditorialWhyItMattersContent,
} from "@/lib/editorial-content";
import {
  PUBLIC_SIGNALS_ROUTE,
  SIGNALS_EDITORIAL_ROUTE,
  approveSignalPost,
  approveSignalPosts,
  assignSignalPostToFinalSlateSlot,
  holdSignalPost,
  includeSignalPostInSlate,
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

/**
 * Quiet autosave for the three editorial layers (Pick → Publish workflow).
 * Persists edited_* via saveSignalDraft but intentionally does NOT revalidate
 * — autosave runs while the editor is typing, so a full-page refresh would
 * steal focus and flicker. It returns the mutation result so the client can
 * show a "Saving / Saved / Couldn't save" indicator. The composer reads fresh
 * edited_* on its next natural navigation (Include / Publish), so skipping
 * revalidation here is safe. Replaces the manual "Save Edits" button.
 */
export async function autosaveSignalDraftAction(input: {
  postId: string;
  editedWhyItMatters: string;
  editedWhyItMattersStructured: EditorialWhyItMattersContent | null;
  editedWhatLedToIt: string;
  editedWhatItConnectsTo: string;
}): Promise<EditorialMutationResult> {
  return saveSignalDraft({
    postId: input.postId,
    editedWhyItMatters: input.editedWhyItMatters,
    editedWhyItMattersStructured: input.editedWhyItMattersStructured,
    editedWhatLedToIt: input.editedWhatLedToIt,
    editedWhatItConnectsTo: input.editedWhatItConnectsTo,
  });
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
 * `published_*` from the editor's currently-typed form content (falling
 * back to DB `edited_*` then DB `published_*` for layers the editor
 * didn't touch). The form-captured content is also persisted into
 * `edited_*` in the same atomic update so subsequent reads see
 * consistent state.
 *
 * Refuses for never-published cards (use the slate publish gate instead)
 * and refuses on WITM validator failure.
 *
 * #282 (regression fix): previously this action only passed `postId` to
 * the lib, so the lib read DB `edited_*` (often null for depth layers)
 * and wrote null into `published_what_led_to_it` /
 * `published_what_it_connects_to`. The editor's typed textarea content
 * was silently dropped. The lib's new optional `editedWhat*` parameters
 * close that gap.
 */
export async function republishLiveSignalPostAction(formData: FormData) {
  const result = await republishLiveSignalPost({
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

/**
 * Include a card in the slate (Pick → Publish): assign the given slot AND
 * approve in one step. Called by the CandidateRow "Include" toggle, which
 * picks the lowest open rank. Returns the result so the client can surface
 * an inline error (e.g. WITM rewrite required) without a full navigation.
 */
export async function includeCardInSlateAction(postId: string, finalSlateRank: number) {
  const result = await includeSignalPostInSlate({ postId, finalSlateRank });

  if (result.ok) {
    revalidateEditorialRoutes();
  }

  return result;
}

/**
 * Remove a card from the slate (Pick → Publish "Remove"). Clears the slot
 * assignment; the card stays `approved` but unassigned, so the publish gate
 * (which only acts on slot-assigned rows) excludes it. Re-including re-approves
 * idempotently.
 */
export async function removeCardFromSlateInlineAction(postId: string) {
  const result = await removeSignalPostFromFinalSlate({ postId });

  if (result.ok) {
    revalidateEditorialRoutes();
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
