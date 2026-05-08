export type EditorialWhyItMattersSection = {
  title: string;
  body: string;
};

export type EditorialWhyItMattersContent = {
  preview: string;
  thesis: string;
  sections: EditorialWhyItMattersSection[];
};

export const EDITORIAL_SECTION_SLOT_COUNT = 4;

function normalizeText(value: string | null | undefined) {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

export function normalizeEditorialWhyItMattersContent(input: {
  preview?: string | null;
  thesis?: string | null;
  sections?: Array<{
    title?: string | null;
    body?: string | null;
  }> | null;
}): EditorialWhyItMattersContent | null {
  const preview = normalizeText(input.preview);
  const thesis = normalizeText(input.thesis);
  const sections = (input.sections ?? [])
    .map((section) => ({
      title: normalizeText(section.title),
      body: normalizeText(section.body),
    }))
    .filter((section) => section.title || section.body);

  if (!preview && !thesis && sections.length === 0) {
    return null;
  }

  return {
    preview,
    thesis,
    sections,
  };
}

export function parseEditorialWhyItMattersContent(
  value: unknown,
): EditorialWhyItMattersContent | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as {
    preview?: unknown;
    thesis?: unknown;
    sections?: unknown;
  };

  return normalizeEditorialWhyItMattersContent({
    preview: typeof candidate.preview === "string" ? candidate.preview : "",
    thesis: typeof candidate.thesis === "string" ? candidate.thesis : "",
    sections: Array.isArray(candidate.sections)
      ? candidate.sections.map((section) => {
          if (!section || typeof section !== "object") {
            return {};
          }

          const sectionCandidate = section as { title?: unknown; body?: unknown };

          return {
            title: typeof sectionCandidate.title === "string" ? sectionCandidate.title : "",
            body: typeof sectionCandidate.body === "string" ? sectionCandidate.body : "",
          };
        })
      : [],
  });
}

export function createEditorialContentFromLegacyText(
  legacyText: string | null | undefined,
): EditorialWhyItMattersContent | null {
  const normalized = normalizeText(legacyText);

  if (!normalized) {
    return null;
  }

  return {
    preview: "",
    thesis: normalized,
    sections: [],
  };
}

export function buildEditorialWhyItMattersText(
  content: EditorialWhyItMattersContent | null | undefined,
  fallbackText = "",
) {
  if (!content) {
    return normalizeText(fallbackText);
  }

  return [
    content.thesis,
    ...content.sections.map((section) =>
      [section.title, section.body].filter(Boolean).join(": "),
    ),
  ]
    .map(normalizeText)
    .filter(Boolean)
    .join("\n\n") || normalizeText(fallbackText);
}

export function getEditorialHomepagePreviewText(
  content: EditorialWhyItMattersContent | null | undefined,
  fallbackText: string,
) {
  return normalizeText(content?.preview) || normalizeText(fallbackText);
}

export function buildIntentionalEditorialPreview(text: string, maxLength: number) {
  const normalizedText = normalizeText(text);

  if (hasTerminalEllipsis(normalizedText)) {
    return cleanPreTruncatedPreview(normalizedText, maxLength);
  }

  if (normalizedText.length <= maxLength) {
    return normalizedText;
  }

  const sentencePreview = buildSentenceBoundaryPreview(normalizedText, maxLength);

  if (sentencePreview) {
    return sentencePreview;
  }

  const wordBoundaryPreview = trimToWordBoundary(normalizedText, maxLength);

  return ensureSentenceEnding(wordBoundaryPreview);
}

function buildSentenceBoundaryPreview(text: string, maxLength: number) {
  const sentences = text.match(/[^.!?]+[.!?]+(?:["')\]]+)?/g)?.map((sentence) => sentence.trim()) ?? [];
  const selected: string[] = [];

  for (const sentence of sentences.slice(0, 2)) {
    const candidate = [...selected, sentence].join(" ");

    if (candidate.length > maxLength) {
      break;
    }

    selected.push(sentence);
  }

  return selected.join(" ") || sentences[0] || "";
}

function trimToWordBoundary(text: string, maxLength: number) {
  const clipped = text.slice(0, maxLength + 1);
  const lastWhitespaceIndex = clipped.search(/\s+\S*$/);
  const candidate = lastWhitespaceIndex > 0 ? clipped.slice(0, lastWhitespaceIndex) : text;

  return candidate.replace(/[,:;—-]+$/, "").trim();
}

function hasTerminalEllipsis(text: string) {
  return /(?:\.\.\.|…)\s*$/.test(text);
}

function cleanPreTruncatedPreview(text: string, maxLength: number) {
  const withoutEllipsis = text.replace(/(?:\.\.\.|…)\s*$/, "").trim();
  const sentencePreview = buildSentenceBoundaryPreview(withoutEllipsis, maxLength);

  if (sentencePreview) {
    return sentencePreview;
  }

  const wordBoundaryPreview = trimToWordBoundary(withoutEllipsis, maxLength);

  return ensureSentenceEnding(dropLikelyTrailingFragment(wordBoundaryPreview));
}

function dropLikelyTrailingFragment(text: string) {
  return text
    .replace(
      /,?\s+(?:so|which|that|and|but)\s+(?:it\s+)?(?:could|may|might|can|will|would|should)(?:\s+[a-z]+)?$/iu,
      "",
    )
    .replace(/\s+[a-z]{1,2}$/u, "")
    .trim();
}

function ensureSentenceEnding(text: string) {
  const cleanText = text.replace(/[,:;—-]+$/, "").trim();

  if (!cleanText || /[.!?]["')\]]?$/.test(cleanText)) {
    return cleanText;
  }

  return `${cleanText}.`;
}

export function getEditorialSectionSlots(
  content: EditorialWhyItMattersContent | null | undefined,
) {
  return Array.from({ length: EDITORIAL_SECTION_SLOT_COUNT }, (_, index) => ({
    title: content?.sections[index]?.title ?? "",
    body: content?.sections[index]?.body ?? "",
  }));
}
