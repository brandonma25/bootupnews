import { describe, expect, it } from "vitest";

import {
  DEFAULT_EVERGREEN_FILTER_CONFIG,
  classifyEvergreen,
} from "@/lib/editorial/evergreen-filter";

/**
 * Track 2 P7 — REAL production data (signal_posts, fwkqjeumreaznfhnlzev). The
 * eight quantified recurring evergreens all came from three feeds; the three
 * "developing" stories + two Climate Tech stories are real news that MUST NOT
 * be flagged. URLs/titles are verbatim from the live table.
 */

const config = DEFAULT_EVERGREEN_FILTER_CONFIG;

function verdict(input: { title?: string; source?: string; url?: string }) {
  return classifyEvergreen(input, config);
}

describe("evergreen classifier — real production data", () => {
  describe("MUST BE FLAGGED — the evergreen-prone feeds (PRIMARY: source signal)", () => {
    it("SF Fed research blog → feed (catches title-clean 'AI Investing Landscape')", () => {
      const v = verdict({
        title: "The AI Investing Landscape: Insights from Venture Capital",
        source: "SF Fed Research and Insights",
        url: "https://www.frbsf.org/research-and-insights/blog/sf-fed-blog/2026/02/11/the-ai-investing-landscape-insights-from-venture-capital/",
      });
      expect(v.isEvergreen).toBe(true);
      expect(v.signal).toBe("feed");
    });

    it("FRED Blog → feed", () => {
      const v = verdict({
        title: "How are benchmark borrowing costs measured?",
        source: "FRED Blog",
        url: "https://fredblog.stlouisfed.org/2026/05/how-are-benchmark-borrowing-costs-measured/",
      });
      expect(v.isEvergreen).toBe(true);
      expect(v.signal).toBe("feed");
    });

    it("NY Fed Liberty Street Economics → feed", () => {
      const v = verdict({
        title: "AI's Macroeconomic Challenges and Promises",
        source: "Liberty Street Economics",
        url: "https://libertystreeteconomics.newyorkfed.org/2026/03/ais-macroeconomic-challenges/",
      });
      expect(v.isEvergreen).toBe(true);
      expect(v.signal).toBe("feed");
    });

    it("Economic Letter Countdown → flagged (feed wins; title would also hit countdown/most-read)", () => {
      const v = verdict({
        title: "Economic Letter Countdown: Most Read Topics from 2025",
        source: "SF Fed Research and Insights",
        url: "https://www.frbsf.org/research-and-insights/blog/sf-fed-blog/2025/12/19/economic-letter-countdown-most-read-topics-2025/",
      });
      expect(v.isEvergreen).toBe(true);
    });
  });

  describe("MUST BE FLAGGED via TITLE — the closed gaps (non-feed URL isolates the title signal)", () => {
    it("'How are X measured?' (closed gap: how + are/is)", () => {
      const v = verdict({
        title: "How are benchmark borrowing costs measured?",
        url: "https://example.com/some-syndicated-copy",
      });
      expect(v.isEvergreen).toBe(true);
      expect(v.signal).toBe("title");
    });

    it("'Why exclude X?' (closed gap: why + exclude)", () => {
      const v = verdict({
        title: "Why exclude food and energy from inflation measures?",
        url: "https://example.com/some-syndicated-copy",
      });
      expect(v.isEvergreen).toBe(true);
      expect(v.signal).toBe("title");
    });
  });

  describe("MUST NOT BE FLAGGED — real developing news (heatmap.news, arstechnica)", () => {
    it.each([
      ["China and Britain Hit Nuclear Milestones", "https://heatmap.news/am/china-uk-nuclear"],
      ["A Chinese Offshore Wind Giant Eyes Canada", "https://heatmap.news/am/china-canada-wind"],
      ["Google will invest as much as $40 billion in Anthropic", "https://arstechnica.com/ai/2026/04/google-will-invest-as-much-as-40-billion-in-anthropic/"],
      ["Alabama Data Center Draws Local Police Scrutiny", "https://heatmap.news/plus/the-fight/hotspots/alabama-nebius-data-center-police"],
      ["The State of Climate Investing", "https://heatmap.news/climate-tech/state-of-climate-investing"],
      ["Early-Stage Climate Investing Heats Up", "https://heatmap.news/climate-tech/early-stage-investing"],
    ])("passes %s", (title, url) => {
      const v = verdict({ title, source: "Heatmap", url });
      expect(v.isEvergreen).toBe(false);
      expect(v.signal).toBeNull();
    });
  });

  describe("title-pattern audit — real-news questions must NOT be suppressed (non-feed URL)", () => {
    // These are real news framed as how/why questions. The original #307 broad
    // ^how (are|is|…) / ^why (is|are|…) patterns would have wrongly suppressed
    // them; the tightened patterns (explainer-tail / narrowed why) must let them pass.
    it.each([
      "How the Fed raised rates faster than expected",
      "How are markets reacting to the jobs report",
      "Why are mortgage rates rising again",
      "Why is inflation cooling this quarter",
    ])("passes real-news question %p", (title) => {
      const v = verdict({ title, url: "https://www.reuters.com/markets/2026/06/08/story" });
      expect(v.isEvergreen).toBe(false);
    });

    // Genuine explainers are still caught (by title), independent of feed.
    it.each([
      "How does the Fed work?",
      "How to read an earnings report",
      "How are benchmark borrowing costs measured?",
      "Why exclude food and energy from inflation measures?",
    ])("still flags genuine explainer %p", (title) => {
      const v = verdict({ title, url: "https://example.com/syndicated-copy" });
      expect(v.isEvergreen).toBe(true);
      expect(v.signal).toBe("title");
    });
  });
});
