"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  PUBLIC_SIGNALS_ROUTE,
  SIGNALS_EDITORIAL_ROUTE,
  approveSignalPost,
  publishApprovedSignals,
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
  revalidatePath(SIGNALS_EDITORIAL_ROUTE);
  revalidatePath(PUBLIC_SIGNALS_ROUTE);
}

export async function saveSignalDraftAction(formData: FormData) {
  const result = await saveSignalDraft({
    postId: String(formData.get("postId") ?? ""),
    editedWhyItMatters: String(formData.get("editedWhyItMatters") ?? ""),
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
