import { describe, expect, it } from "vitest";

import type { MergedCandidate } from "@/lib/editorial-staging/dedup";
import {
  DEFAULT_EVERGREEN_FILTER_CONFIG,
  applyEvergreenFilter,
  extractDateFromUrl,
  resolveEvergreenFilterConfig,
  type EvergreenFilterConfig,
} from "@/lib/editorial/evergreen-filter";

/**
 * Track 2 P7 — labeled fixture from the 2026-06-01..06-03 review window.
 *
 * Five PASS items (real news the editor would want) and three HOLD items
 * (evergreens/explainers the editor manually killed in the Notion review).
 * Each item carries an inline justification linking the label to the
 * filter signal it should trigger — title regex, source denylist, or URL
 * date-path drift.
 *
 * The fixture is the regression contract: if a future config change ever
 * passes a HOLD or rejects a PASS, this test pins the failure to the
 * specific item that drifted.
 */

const FIXTURE_BRIEFING_DATE = "2026-06-03";

type LabeledCandidate = {
  label: "PASS" | "HOLD";
  reason: string;
  candidate: MergedCandidate;
};

function mk(headline: string, source: string, url: string, baseScore = 50): MergedCandidate {
  return {
    headline,
    source,
    body: headline + " — body text.",
    url,
    category: null,
    newsletterCoOccurrence: 0,
    sourceOverlap: false,
    baseScore,
  };
}

const FIXTURE: LabeledCandidate[] = [
  // ----- PASS (5) — real news from the 2026-06-01..06-03 window -----
  {
    label: "PASS",
    reason: "Hard news, fresh URL date (2026-06-02), no explainer language.",
    candidate: mk(
      "Treasury auctions long bonds at highest yield since 2007",
      "Reuters",
      "https://www.reuters.com/markets/us/2026/06/02/treasury-long-bond-auction/",
    ),
  },
  {
    label: "PASS",
    reason: "Tech earnings hit, fresh URL date (2026-06-03).",
    candidate: mk(
      "Nvidia beats Q2 revenue estimates; raises full-year guidance",
      "Bloomberg",
      "https://www.bloomberg.com/news/articles/2026-06-03/nvidia-q2-results",
    ),
  },
  {
    label: "PASS",
    reason: "Policy-development hard news, fresh dating, no denylist hit.",
    candidate: mk(
      "FTC opens probe into AI training-data licensing deal",
      "The Verge",
      "https://www.theverge.com/2026/6/1/24162837/ftc-ai-training-data-probe",
    ),
  },
  {
    label: "PASS",
    reason: "International hard news, today's date.",
    candidate: mk(
      "Japan central bank holds rates at 0.5% as inflation cools",
      "Financial Times",
      "https://www.ft.com/content/2026-06-03-boj-rate-decision",
    ),
  },
  {
    label: "PASS",
    reason: "Breaking corporate news, no explainer/evergreen tells.",
    candidate: mk(
      "OpenAI files trademark for 'GPT-Workspace' productivity suite",
      "TechCrunch",
      "https://techcrunch.com/2026/06/01/openai-gpt-workspace-trademark/",
    ),
  },

  // ----- HOLD (3) — evergreens / explainers the editor killed -----
  {
    label: "HOLD",
    reason:
      "Title hits the 'what is X' regex (explainer prefix). This headline " +
      "ran on 2026-06-02 in the queue and the editor manually rejected it.",
    candidate: mk(
      "What is quantitative tightening, and why does it matter now?",
      "MarketWatch",
      "https://www.marketwatch.com/story/qt-explainer-2026-06-02",
    ),
  },
  {
    label: "HOLD",
    reason:
      "Title hits 'explained' suffix + 'how X works' classic explainer " +
      "shape — surfaced 2026-06-01 from a wire republish.",
    candidate: mk(
      "How tariffs work, explained: a beginner's guide to trade policy",
      "Axios",
      "https://www.axios.com/2026/06/01/tariffs-explained-guide",
    ),
  },
  {
    label: "HOLD",
    reason:
      "URL date-path drift. The article was originally published 2024-08-15 " +
      "and the wire republished it 2026-06-03. The freshness signal lies; " +
      "the URL date doesn't. Editor killed it as evergreen.",
    candidate: mk(
      "Five lessons from the regional banking turmoil of 2023",
      "Reuters",
      "https://www.reuters.com/markets/2024/08/15/regional-banking-lessons/",
      // High baseScore to prove the soft penalty actually drops it below
      // ranker-relevance vs. PASS items above (which are 50).
      80,
    ),
  },
];

describe("Track 2 P7 — evergreen/explainer filter", () => {
  describe("labeled fixture: 2026-06-01..06-03 review window", () => {
    it("rejects all 3 HOLD items (explainers + URL date drift)", () => {
      const result = applyEvergreenFilter(
        FIXTURE.map((f) => f.candidate),
        { config: DEFAULT_EVERGREEN_FILTER_CONFIG, briefingDate: FIXTURE_BRIEFING_DATE },
      );

      const passedHeadlines = result.passed.map((c) => c.headline);
      const rejectedHeadlines = result.rejected.map((r) => r.candidate.headline);

      // Both title-regex HOLD items are hard-rejected.
      const titleHoldHeadlines = [
        "What is quantitative tightening, and why does it matter now?",
        "How tariffs work, explained: a beginner's guide to trade policy",
      ];
      for (const headline of titleHoldHeadlines) {
        expect(rejectedHeadlines).toContain(headline);
        expect(passedHeadlines).not.toContain(headline);
      }

      // The URL-date-drift HOLD is NOT hard-rejected (soft penalty),
      // but its baseScore must have been dropped by the penalty so the
      // ranker would deprioritize it. We check the score below.
      const oldRegional = result.passed.find((c) =>
        c.headline.startsWith("Five lessons from the regional banking"),
      );
      expect(oldRegional).toBeDefined();
      expect(oldRegional!.baseScore).toBe(80 - DEFAULT_EVERGREEN_FILTER_CONFIG.urlDatePathPenalty);

      // Counter mirrors PR P4's candidatesFilteredCrossDateDedup pattern.
      expect(result.candidatesFilteredEvergreen).toBe(2);
      expect(result.candidatesPenalizedEvergreen).toBe(1);
    });

    it("passes all 5 PASS items unmodified", () => {
      const result = applyEvergreenFilter(
        FIXTURE.map((f) => f.candidate),
        { config: DEFAULT_EVERGREEN_FILTER_CONFIG, briefingDate: FIXTURE_BRIEFING_DATE },
      );

      const expectedPassHeadlines = FIXTURE
        .filter((f) => f.label === "PASS")
        .map((f) => f.candidate.headline);

      for (const headline of expectedPassHeadlines) {
        const found = result.passed.find((c) => c.headline === headline);
        expect(found).toBeDefined();
        // None of the PASS items should be penalized (their URL dates are
        // within the 14-day window of 2026-06-03).
        const original = FIXTURE.find((f) => f.candidate.headline === headline)!.candidate;
        expect(found!.baseScore).toBe(original.baseScore);
      }
    });
  });

  describe("title pattern denylist (default config)", () => {
    const config = DEFAULT_EVERGREEN_FILTER_CONFIG;

    it.each([
      "What is the bond yield curve?",
      "What are stablecoins?",
      "How does the Fed work?",
      "How to read an earnings report",
      "Tariffs, explained",
      "The crypto explainer everyone needs",
      "Year in review: 2025 market wraps",
      "Most read this week",
      "Countdown: top 10 tech IPOs of all time",
      "The ultimate guide to retirement planning",
      "Complete guide to AI ethics",
      "Everything you need to know about quantum computing",
    ])("rejects headline %p", (headline) => {
      const result = applyEvergreenFilter(
        [mk(headline, "Reuters", "https://reuters.com/article")],
        { config, briefingDate: "2026-06-03" },
      );
      expect(result.candidatesFilteredEvergreen).toBe(1);
      expect(result.passed).toHaveLength(0);
      expect(result.rejected[0].reason).toBe("title");
    });

    it.each([
      "Treasury auctions long bonds at highest yield since 2007",
      "Nvidia beats Q2 revenue estimates",
      "FTC opens probe into AI licensing deal",
      "Bank of Japan holds rates",
      "OpenAI files trademark for new product",
    ])("passes hard-news headline %p", (headline) => {
      const result = applyEvergreenFilter(
        [mk(headline, "Reuters", "https://reuters.com/2026/06/03/article")],
        { config, briefingDate: "2026-06-03" },
      );
      expect(result.candidatesFilteredEvergreen).toBe(0);
      expect(result.passed).toHaveLength(1);
    });
  });

  describe("source denylist (case-insensitive exact match)", () => {
    it("rejects candidates from denylisted sources", () => {
      const config: EvergreenFilterConfig = {
        ...DEFAULT_EVERGREEN_FILTER_CONFIG,
        sourceDenylist: ["EvergreenWeekly", "explainers.example.com"],
      };
      const result = applyEvergreenFilter(
        [
          mk("Real breaking news today", "EvergreenWeekly", "https://evergreenweekly.com/2026/06/03/x"),
          mk("Hard news with mixed casing", "explainers.example.com", "https://explainers.example.com/post"),
          mk("Hard news from a clean source", "Reuters", "https://reuters.com/article"),
        ],
        { config, briefingDate: "2026-06-03" },
      );
      expect(result.candidatesFilteredEvergreen).toBe(2);
      expect(result.passed).toHaveLength(1);
      expect(result.passed[0].source).toBe("Reuters");
      expect(result.rejected.every((r) => r.reason === "source")).toBe(true);
    });

    it("does not reject when source denylist is empty (default)", () => {
      const result = applyEvergreenFilter(
        [mk("Hard news", "Whatever Source", "https://example.com/2026/06/03/x")],
        { config: DEFAULT_EVERGREEN_FILTER_CONFIG, briefingDate: "2026-06-03" },
      );
      expect(result.candidatesFilteredEvergreen).toBe(0);
      expect(result.passed).toHaveLength(1);
    });
  });

  describe("URL date-path drift soft penalty", () => {
    it("penalizes URLs with embedded date older than maxAge", () => {
      const result = applyEvergreenFilter(
        [
          mk("News A", "Reuters", "https://reuters.com/2024/03/15/old-article", 60),
          mk("News B", "Reuters", "https://reuters.com/2026/06/01/fresh-article", 60),
          mk("News C", "Reuters", "https://reuters.com/article-no-date", 60),
        ],
        { config: DEFAULT_EVERGREEN_FILTER_CONFIG, briefingDate: "2026-06-03" },
      );
      expect(result.passed).toHaveLength(3);
      expect(result.passed[0].baseScore).toBe(60 - DEFAULT_EVERGREEN_FILTER_CONFIG.urlDatePathPenalty);
      expect(result.passed[1].baseScore).toBe(60); // within window
      expect(result.passed[2].baseScore).toBe(60); // no date in URL → no penalty
      expect(result.candidatesPenalizedEvergreen).toBe(1);
    });

    it("does not penalize URL dates within maxAge window", () => {
      // 2026-05-25 is 9 days before 2026-06-03 — under the 14-day default.
      const result = applyEvergreenFilter(
        [mk("Recent news", "Reuters", "https://reuters.com/2026/05/25/article", 50)],
        { config: DEFAULT_EVERGREEN_FILTER_CONFIG, briefingDate: "2026-06-03" },
      );
      expect(result.candidatesPenalizedEvergreen).toBe(0);
      expect(result.passed[0].baseScore).toBe(50);
    });

    it("does not penalize URL dates in the future", () => {
      const result = applyEvergreenFilter(
        [mk("Future news", "Reuters", "https://reuters.com/2027/01/01/article", 50)],
        { config: DEFAULT_EVERGREEN_FILTER_CONFIG, briefingDate: "2026-06-03" },
      );
      expect(result.candidatesPenalizedEvergreen).toBe(0);
      expect(result.passed[0].baseScore).toBe(50);
    });
  });

  describe("extractDateFromUrl", () => {
    it.each([
      ["https://reuters.com/2024/03/15/article", { year: 2024, month: 3, day: 15 }],
      ["https://bloomberg.com/news/articles/2026-06-03/title", { year: 2026, month: 6, day: 3 }],
      ["https://axios.com/2025/12/31/end-of-year", { year: 2025, month: 12, day: 31 }],
      ["https://techcrunch.com/2026/6/1/24162837/post", { year: 2026, month: 6, day: 1 }],
    ])("extracts date from %p", (url, expected) => {
      expect(extractDateFromUrl(url)).toEqual(expected);
    });

    it.each([
      "https://reuters.com/article",
      "https://example.com/123456/789/post", // 6-digit "year" - rejected
      "https://example.com/no-dates-here",
      "not-a-url",
    ])("returns null for %p (no date or invalid)", (url) => {
      expect(extractDateFromUrl(url)).toBeNull();
    });
  });

  describe("config resolution from env", () => {
    it("uses defaults when env var is unset", () => {
      const config = resolveEvergreenFilterConfig({} as NodeJS.ProcessEnv);
      expect(config).toEqual(DEFAULT_EVERGREEN_FILTER_CONFIG);
    });

    it("uses defaults when env var is invalid JSON", () => {
      const config = resolveEvergreenFilterConfig({
        EVERGREEN_FILTER_CONFIG_JSON: "{not valid json",
      } as unknown as NodeJS.ProcessEnv);
      expect(config).toEqual(DEFAULT_EVERGREEN_FILTER_CONFIG);
    });

    it("merges partial env-var override with defaults", () => {
      const config = resolveEvergreenFilterConfig({
        EVERGREEN_FILTER_CONFIG_JSON: JSON.stringify({
          sourceDenylist: ["EvergreenWeekly"],
          urlDatePathPenalty: 50,
        }),
      } as unknown as NodeJS.ProcessEnv);
      expect(config.sourceDenylist).toEqual(["EvergreenWeekly"]);
      expect(config.urlDatePathPenalty).toBe(50);
      // The unset fields fall back to defaults.
      expect(config.titlePatterns).toEqual(DEFAULT_EVERGREEN_FILTER_CONFIG.titlePatterns);
      expect(config.urlDatePathMaxAgeDays).toBe(DEFAULT_EVERGREEN_FILTER_CONFIG.urlDatePathMaxAgeDays);
    });

    it("ignores invalid title pattern regex without throwing", () => {
      const config: EvergreenFilterConfig = {
        ...DEFAULT_EVERGREEN_FILTER_CONFIG,
        titlePatterns: ["[invalid regex", "\\bexplain"],
      };
      // Should not throw; the valid pattern still matches.
      const result = applyEvergreenFilter(
        [
          mk("Headline mentioning explain", "Reuters", "https://reuters.com/article"),
          mk("Headline mentioning bracket", "Reuters", "https://reuters.com/article"),
        ],
        { config, briefingDate: "2026-06-03" },
      );
      expect(result.candidatesFilteredEvergreen).toBe(1);
      expect(result.rejected[0].candidate.headline).toBe("Headline mentioning explain");
    });
  });
});
