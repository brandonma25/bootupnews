import { Resend } from "resend";

import { EDITORIAL_TARGET_ITEM_COUNT } from "@/lib/cron/fetch-news";

export async function sendEditorialCompletionEmail(input: {
  briefingDate: string;
  candidateCount: number;
  coreCount: number;
  contextCount: number;
  categoryBreakdown: Record<string, number>;
  notionDbId: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  const { briefingDate, candidateCount, coreCount, contextCount, categoryBreakdown, notionDbId } =
    input;
  const isEmpty = candidateCount === 0;
  // Task 2.C — surface degraded-mode runs in the subject so the editor knows
  // at a glance the queue is short of target without opening Notion.
  const isDegraded =
    !isEmpty && candidateCount < EDITORIAL_TARGET_ITEM_COUNT;
  const subject = isEmpty
    ? `Boot Up Editorial Queue Ready — [EMPTY] ${briefingDate}`
    : isDegraded
      ? `Boot Up Editorial Queue Ready — [DEGRADED ${candidateCount}/${EDITORIAL_TARGET_ITEM_COUNT}] ${briefingDate}`
      : `Boot Up Editorial Queue Ready — ${briefingDate}`;

  const notionUrl = `https://notion.so/${notionDbId.replace(/-/g, "")}`;

  const categoryLines = ["Tech", "Finance", "Politics", "Uncategorized"]
    .map((cat) => `  ${cat}: ${categoryBreakdown[cat] ?? 0}`)
    .join("\n");

  const candidateLine = isDegraded
    ? `Candidates staged: ${candidateCount} (below target of ${EDITORIAL_TARGET_ITEM_COUNT}) — degraded run, see Source Health Log for upstream feed failures.`
    : `Candidates staged: ${candidateCount}`;

  const body = [
    `Briefing date: ${briefingDate}`,
    candidateLine,
    `  Core: ${coreCount}`,
    `  Context: ${contextCount}`,
    `Category breakdown:`,
    categoryLines,
    `Open Editorial Queue:`,
    notionUrl,
    ``,
    `Next step: Open Claude and say "Draft today's editorials."`,
  ].join("\n");

  const resend = new Resend(apiKey);

  await resend.emails.send({
    from: "onboarding@resend.dev",
    to: "brandonma25@gmail.com",
    subject,
    text: body,
  });
}
