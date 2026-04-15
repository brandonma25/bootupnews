import type { BriefingItem } from "@/lib/types";

type ArticleRationale = {
  text: string;
  kind: "keyword" | "topic";
};

type ArticleRationaleInput = Pick<BriefingItem, "topicName" | "matchedKeywords">;

export function getArticleRationale(item: ArticleRationaleInput): ArticleRationale {
  const matchedKeywords = dedupeKeywords(item.matchedKeywords ?? []).slice(0, 3);

  if (matchedKeywords.length) {
    return {
      text: `Matched on: ${matchedKeywords.join(", ")}`,
      kind: "keyword",
    };
  }

  return {
    text: `Why this is in ${item.topicName}: topic tag "${item.topicName}"`,
    kind: "topic",
  };
}

function dedupeKeywords(keywords: string[]) {
  const seen = new Set<string>();

  return keywords.filter((keyword) => {
    const normalized = keyword.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) {
      return false;
    }

    seen.add(normalized);
    return true;
  });
}
