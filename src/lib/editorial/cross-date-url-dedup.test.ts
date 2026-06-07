import { describe, expect, it } from "vitest";

import {
  CROSS_DATE_LOOKBACK_DAYS,
  MAX_CONSECUTIVE_DAYS,
  computeCrossDateWindow,
  normalizeUrlForDedup,
  partitionByCrossDateRecurrence,
} from "@/lib/editorial/cross-date-url-dedup";

/**
 * Track 2 P4 (cross-date) — REAL production data fixtures (signal_posts,
 * fwkqjeumreaznfhnlzev, 2026-04..06). The dates/URLs below are verbatim from
 * the live table, not synthetic.
 *
 * Acceptance matrix:
 *   - Developing stories that reuse the SAME URL across 2 consecutive days MUST
 *     stay (Google/Anthropic, China/Britain Nuclear, China-Canada Wind).
 *   - "Local Police" ran 3 consecutive days (05-30/31, 06-01) and MUST stay on
 *     ALL three — this is what pins MAX_CONSECUTIVE_DAYS=3.
 *   - The two Climate Tech stories use DIFFERENT URLs and MUST both survive
 *     (proves dedup is URL-based, not title/topic-based).
 *   - Evergreens (same URL recurring with gaps over weeks) MUST be skipped on
 *     re-staging.
 */

// Verbatim production staging history: which briefing_dates each source_url
// appeared on in signal_posts.
const HISTORY: Array<{ date: string; url: string }> = [
  // Developing — same URL on consecutive days.
  { date: "2026-04-25", url: "https://arstechnica.com/ai/2026/04/google-will-invest-as-much-as-40-billion-in-anthropic/" },
  { date: "2026-04-26", url: "https://arstechnica.com/ai/2026/04/google-will-invest-as-much-as-40-billion-in-anthropic/" },
  { date: "2026-06-02", url: "https://heatmap.news/am/china-uk-nuclear" },
  { date: "2026-06-03", url: "https://heatmap.news/am/china-uk-nuclear" },
  { date: "2026-06-01", url: "https://heatmap.news/am/china-canada-wind" },
  { date: "2026-06-02", url: "https://heatmap.news/am/china-canada-wind" },
  // Developing — 3 consecutive days (pins MAX_CONSECUTIVE_DAYS = 3).
  { date: "2026-05-30", url: "https://heatmap.news/plus/the-fight/hotspots/alabama-nebius-data-center-police" },
  { date: "2026-05-31", url: "https://heatmap.news/plus/the-fight/hotspots/alabama-nebius-data-center-police" },
  { date: "2026-06-01", url: "https://heatmap.news/plus/the-fight/hotspots/alabama-nebius-data-center-police" },
  // Climate Tech — two DIFFERENT URLs (must not collide).
  { date: "2026-05-11", url: "https://heatmap.news/climate-tech/state-of-climate-investing" },
  { date: "2026-05-12", url: "https://heatmap.news/climate-tech/state-of-climate-investing" },
  { date: "2026-05-13", url: "https://heatmap.news/climate-tech/early-stage-investing" },
  // Evergreens — same URL recurring with gaps (subset of the real 10–21 dates).
  { date: "2026-05-20", url: "https://www.frbsf.org/research-and-insights/blog/sf-fed-blog/2026/02/11/the-ai-investing-landscape-insights-from-venture-capital/" },
  { date: "2026-06-04", url: "https://www.frbsf.org/research-and-insights/blog/sf-fed-blog/2026/02/11/the-ai-investing-landscape-insights-from-venture-capital/" },
  { date: "2026-05-27", url: "https://fredblog.stlouisfed.org/2026/05/how-are-benchmark-borrowing-costs-measured/" },
  { date: "2026-06-04", url: "https://fredblog.stlouisfed.org/2026/05/how-are-benchmark-borrowing-costs-measured/" },
  { date: "2026-06-04", url: "https://www.frbsf.org/research-and-insights/blog/sf-fed-blog/2025/12/19/economic-letter-countdown-most-read-topics-2025/" },
];

/**
 * Simulate what persistSignalPostCandidates does at write time: compute the
 * recurrence window for `briefingDate`, filter the staging history to that
 * window (this is the SQL .gte/.lte the caller runs), then partition the
 * candidate against it. Returns true when the candidate would be SKIPPED.
 */
function wouldSkip(briefingDate: string, candidateUrl: string): boolean {
  const window = computeCrossDateWindow(briefingDate);
  if (!window) return false;
  const priorRows = HISTORY.filter(
    (h) => h.date >= window.startDate && h.date <= window.endDate,
  ).map((h) => ({ source_url: h.url, briefing_date: h.date }));
  const { skipped } = partitionByCrossDateRecurrence([{ sourceUrl: candidateUrl }], priorRows);
  return skipped.length === 1;
}

describe("cross-date URL dedup — real production data", () => {
  describe("normalizeUrlForDedup", () => {
    it("strips tracking params, fragment, trailing slash, www, and lowercases", () => {
      expect(normalizeUrlForDedup("https://WWW.Example.com/path/?utm_source=x&id=9#frag")).toBe(
        "https://example.com/path?id=9",
      );
      expect(normalizeUrlForDedup("https://heatmap.news/am/china-uk-nuclear/")).toBe(
        "https://heatmap.news/am/china-uk-nuclear",
      );
      expect(normalizeUrlForDedup("https://x.com/a?fbclid=abc&ref=twitter")).toBe("https://x.com/a");
    });

    it("treats clean canonical URLs as equal across days (the real evergreen case)", () => {
      const a = "https://fredblog.stlouisfed.org/2026/05/how-are-benchmark-borrowing-costs-measured/";
      const b = "https://fredblog.stlouisfed.org/2026/05/how-are-benchmark-borrowing-costs-measured/";
      expect(normalizeUrlForDedup(a)).toBe(normalizeUrlForDedup(b));
    });

    it("keeps DIFFERENT article paths distinct (the two Climate Tech URLs)", () => {
      expect(normalizeUrlForDedup("https://heatmap.news/climate-tech/state-of-climate-investing")).not.toBe(
        normalizeUrlForDedup("https://heatmap.news/climate-tech/early-stage-investing"),
      );
    });

    it("returns empty string for blank input", () => {
      expect(normalizeUrlForDedup("")).toBe("");
      expect(normalizeUrlForDedup(null)).toBe("");
    });
  });

  describe("computeCrossDateWindow", () => {
    it("window ends at briefingDate - MAX_CONSECUTIVE_DAYS (allows up to 3 consecutive days)", () => {
      expect(MAX_CONSECUTIVE_DAYS).toBe(3);
      expect(CROSS_DATE_LOOKBACK_DAYS).toBe(30);
      const w = computeCrossDateWindow("2026-06-07");
      expect(w).toEqual({ startDate: "2026-05-08", endDate: "2026-06-04" });
    });
  });

  describe("MUST STAY — developing stories that reuse the same URL", () => {
    it("Google/Anthropic stays on its 2nd consecutive day (04-26)", () => {
      expect(wouldSkip("2026-04-26", "https://arstechnica.com/ai/2026/04/google-will-invest-as-much-as-40-billion-in-anthropic/")).toBe(false);
    });

    it("China/Britain Nuclear stays on its 2nd consecutive day (06-03)", () => {
      expect(wouldSkip("2026-06-03", "https://heatmap.news/am/china-uk-nuclear")).toBe(false);
    });

    it("China-Canada Wind stays on its 2nd consecutive day (06-02)", () => {
      expect(wouldSkip("2026-06-02", "https://heatmap.news/am/china-canada-wind")).toBe(false);
    });
  });

  describe("MUST STAY all 3 days — Local Police (pins MAX_CONSECUTIVE_DAYS=3)", () => {
    const url = "https://heatmap.news/plus/the-fight/hotspots/alabama-nebius-data-center-police";
    it("day 2 (05-31) stays", () => expect(wouldSkip("2026-05-31", url)).toBe(false));
    it("day 3 (06-01) stays — the binding case", () => expect(wouldSkip("2026-06-01", url)).toBe(false));
    it("a hypothetical day 4 (06-02) WOULD be skipped (cap = MAX_CONSECUTIVE_DAYS = 3 days)", () => {
      expect(wouldSkip("2026-06-02", url)).toBe(true);
    });
  });

  describe("MUST BOTH SURVIVE — Climate Tech (proves URL-based, not title/topic)", () => {
    it("state-of-climate-investing stays on its 2nd day (05-12)", () => {
      expect(wouldSkip("2026-05-12", "https://heatmap.news/climate-tech/state-of-climate-investing")).toBe(false);
    });
    it("early-stage-investing (different URL) stays on 05-13 despite the sibling climate URL", () => {
      expect(wouldSkip("2026-05-13", "https://heatmap.news/climate-tech/early-stage-investing")).toBe(false);
    });
  });

  describe("MUST BE SKIPPED — evergreens recurring with gaps", () => {
    it("AI Investing Landscape re-staged 06-07 (prior 06-04 is 3 days old) is skipped", () => {
      expect(wouldSkip("2026-06-07", "https://www.frbsf.org/research-and-insights/blog/sf-fed-blog/2026/02/11/the-ai-investing-landscape-insights-from-venture-capital/")).toBe(true);
    });
    it("benchmark borrowing costs re-staged 06-07 is skipped", () => {
      expect(wouldSkip("2026-06-07", "https://fredblog.stlouisfed.org/2026/05/how-are-benchmark-borrowing-costs-measured/")).toBe(true);
    });
    it("Economic Letter Countdown re-staged 06-07 is skipped", () => {
      expect(wouldSkip("2026-06-07", "https://www.frbsf.org/research-and-insights/blog/sf-fed-blog/2025/12/19/economic-letter-countdown-most-read-topics-2025/")).toBe(true);
    });
  });

  describe("partitionByCrossDateRecurrence — direct unit", () => {
    it("reports the matched prior briefing_date for logging", () => {
      const { kept, skipped } = partitionByCrossDateRecurrence(
        [{ sourceUrl: "https://heatmap.news/am/china-uk-nuclear" }],
        [
          { source_url: "https://heatmap.news/am/china-uk-nuclear", briefing_date: "2026-05-10" },
          { source_url: "https://heatmap.news/am/china-uk-nuclear", briefing_date: "2026-05-15" },
        ],
      );
      expect(kept).toHaveLength(0);
      expect(skipped).toHaveLength(1);
      // Most-recent matching prior date is surfaced.
      expect(skipped[0].matchedPriorBriefingDate).toBe("2026-05-15");
    });

    it("keeps candidates with no prior match", () => {
      const { kept, skipped } = partitionByCrossDateRecurrence(
        [{ sourceUrl: "https://heatmap.news/am/brand-new-story" }],
        [{ source_url: "https://heatmap.news/am/something-else", briefing_date: "2026-05-15" }],
      );
      expect(kept).toHaveLength(1);
      expect(skipped).toHaveLength(0);
    });
  });
});
