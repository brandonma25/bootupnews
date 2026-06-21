import { describe, expect, it } from "vitest";

import { decodePartBody } from "@/lib/newsletter-ingestion/email-content";
import { classifyNewsletterChrome, type ChromeRejectionReason } from "@/lib/newsletter-ingestion/chrome-filter";
import { parseNewsletterStoriesDetailed, stripLeadingEnumeratorNoise } from "@/lib/newsletter-ingestion/parser";
import { classifyUrlForArticleEligibility } from "@/lib/url-filtering";

/**
 * PR-B — newsletter extraction quality (Task 3). Fixtures pulled from prod junk
 * rows (06-16..19) + real RSS headlines that must survive.
 */

describe("B1 — charset-aware QP/MIME decode (no more mojibake)", () => {
  it("decodes a UTF-8 quoted-printable smart quote to U+2019, not 'â€™'", () => {
    // E2 80 99 = U+2019. The old String.fromCharCode decoder produced "Semaforâ€™s".
    const out = decodePartBody("Semafor=E2=80=99s Energy briefing", "quoted-printable", "utf-8");
    expect(out).toBe("Semafor’s Energy briefing");
    expect(out).not.toContain("â");
  });

  it("decodes a windows-1252 quoted-printable byte (0x92 -> U+2019)", () => {
    const out = decodePartBody("Semafor=92s Energy briefing", "quoted-printable", "windows-1252");
    expect(out).toBe("Semafor’s Energy briefing");
  });

  it("decodes an iso-8859-1 quoted-printable byte (0xE9 -> é)", () => {
    const out = decodePartBody("caf=E9 closes early", "quoted-printable", "iso-8859-1");
    expect(out).toBe("café closes early");
  });

  it("decodes base64 parts with the declared charset", () => {
    const body = Buffer.from("Fed holds rates", "utf8").toString("base64");
    expect(decodePartBody(body, "base64", "utf-8")).toBe("Fed holds rates");
  });

  it("defaults to utf-8 when no charset is declared", () => {
    expect(decodePartBody("Fed=E2=80=99s call", "quoted-printable", undefined)).toBe("Fed’s call");
  });
});

describe("B2 — segmentation: strip leading enumerator/badge noise, recover the headline", () => {
  it("recovers the real headline behind Semafor's badge + doubled item number", () => {
    expect(stripLeadingEnumeratorNoise("â â 2 2 Fed holds rates in Warsh's first meeting"))
      .toBe("Fed holds rates in Warsh's first meeting");
  });

  it("strips a decoded badge glyph + doubled number", () => {
    expect(stripLeadingEnumeratorNoise("▪ 3 3 Senate passes the bill")).toBe("Senate passes the bill");
  });

  const MUST_NOT_STRIP = [
    "‘We Proved That America Can Still Build Big Things’", // leading smart quote
    "FERC Has a New Plan for Data Centers",
    "Exclusive: Trump tells \"The Axios Show\" that Anthropic was a national security threat",
    "5 things to know before the market opens", // lone leading number, not doubled
    "Émigré founders raise $5M", // accented first letter, no following space
  ];
  it.each(MUST_NOT_STRIP)("leaves a legitimate headline unchanged: %s", (headline) => {
    expect(stripLeadingEnumeratorNoise(headline)).toBe(headline);
  });
});

describe("B3 — chrome filter rejects junk; precision guard keeps real headlines", () => {
  const MUST_REJECT: Array<[string, ChromeRejectionReason]> = [
    ["Subscribe to Semafor DC , a twice-daily briefing from inside Washington's halls of power.", "subscribe_cta"],
    ["For more from the continent, subscribe to Semafor's Africa briefing .", "subscribe_cta"],
    ["Billboard in Islamabad. Akhtar Soomro/Reuters", "photo_credit"],
    ["Ronen Zvulun/Reuters", "photo_credit"],
    ["Eric Lee/Reuters", "photo_credit"],
    ["Daily Brew // Morning Brew // Update", "masthead"],
    ["Big Tech & Startups", "section_header"],
    ["Science & Futuristic Technology", "section_header"],
    ["Programming, Design & Data Science", "section_header"],
  ];
  it.each(MUST_REJECT)("rejects junk %s", (headline, reason) => {
    const verdict = classifyNewsletterChrome({ headline, snippet: "snippet", sourceUrl: null, sourceDomain: null });
    expect(verdict.rejected).toBe(true);
    if (verdict.rejected) {
      expect(verdict.reason).toBe(reason);
    }
  });

  const MUST_KEEP = [
    "Trump says US and Iran will sign deal on Sunday to reopen Strait",
    "‘We Proved That America Can Still Build Big Things’",
    "Exclusive: Trump tells \"The Axios Show\" that Anthropic was a national security threat",
    "Rocket Report: Rebuild begins at Blue Origin launch pad; Relativity targets Mars",
    "FERC Has a New Plan for Data Centers",
    "More Than 770,000 Children Are No Longer Receiving SNAP Benefits After New Rules",
    "Meta faces calls for Congress to probe scam ads targeting seniors",
  ];
  it.each(MUST_KEEP)("keeps real headline %s", (headline) => {
    const verdict = classifyNewsletterChrome({
      headline,
      snippet: "A substantial snippet about the story.",
      sourceUrl: "https://reuters.com/world/article",
      sourceDomain: "reuters.com",
    });
    expect(verdict.rejected).toBe(false);
  });
});

describe("B4 — tracking deny-list + PII param strip", () => {
  it("rejects TLDR tracking-redirector hosts as non-article URLs", () => {
    expect(classifyUrlForArticleEligibility("https://tracking.tldrnewsletter.com/CL0/https://x.com/a").ok).toBe(false);
    expect(classifyUrlForArticleEligibility("https://refer.tldr.tech/abc123").ok).toBe(false);
  });

  it("strips the ?email= PII param (and utm_*) from a stored source URL", () => {
    const result = parseNewsletterStoriesDetailed({
      sender: "news@example.com",
      subject: "Daily wrap",
      rawContent: [
        "The Economy Shifts as Rates Hold Steady This Quarter",
        "A substantial snippet describing the economic story in enough detail to pass.",
        "https://example.com/markets/article?email=subscriber@example.com&utm_source=newsletter&id=42",
      ].join("\n"),
    });

    expect(result.stories).toHaveLength(1);
    const url = result.stories[0]!.sourceUrl ?? "";
    expect(url).not.toContain("email=");
    expect(url).not.toContain("utm_source");
    expect(url).toContain("id=42"); // non-tracking params preserved
  });
});
