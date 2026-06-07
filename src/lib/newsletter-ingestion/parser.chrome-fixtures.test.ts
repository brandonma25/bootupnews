import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { parseNewsletterStoriesDetailed } from "@/lib/newsletter-ingestion/parser";

/**
 * Regression fixtures: the ACTUAL 2026-06-06 newsletter bodies whose extractions
 * were staged as 100% email chrome (captured via scripts/capture-newsletter-fixtures.ts).
 * These assert the extractor now yields real story units and ZERO chrome — none
 * of the nine reproduction strings survive.
 */
const FIXTURE_DIR = path.join(process.cwd(), "src/lib/newsletter-ingestion/__fixtures__");

function loadFixture(name: string) {
  const raw = JSON.parse(readFileSync(path.join(FIXTURE_DIR, `${name}.json`), "utf8")) as {
    sender: string;
    subject: string | null;
    rawContent: string;
  };
  return parseNewsletterStoriesDetailed({
    sender: raw.sender,
    subject: raw.subject ?? "",
    rawContent: raw.rawContent,
  });
}

const FIXTURES = ["money-stuff-2026-06-06", "1440-2026-06-06", "a16z-charts-2026-06-06"];

// The nine chrome fragments staged on 2026-06-06 (verbatim), each a distinct
// failure class. None may survive as a headline.
const REPRODUCTION_CHROME = [
  "1440 Media 222 W Merchandise Mart Plaza", // CAN-SPAM postal address
  "Follow Us", // social footer CTA
  "READ IN APP", // app-promo button
  "View this post on the web at", // boilerplate link line
  "<https://bloom.bg/", // bare angle-bracket link
  "https://substack.com/redirect/", // tracking redirect URL
  "/account/newsletters", // subscription-management link
  "} Remote work", // broken segmentation (leading "}")
  "I discuss the Knicks", // teaser fragment
];

function allHeadlines(): string[] {
  return FIXTURES.flatMap((name) => loadFixture(name).stories.map((story) => story.headline));
}

describe("newsletter extractor rejects 2026-06-06 chrome (real prod bodies)", () => {
  it("none of the nine reproduction chrome strings survive as a headline", () => {
    const headlines = allHeadlines();
    for (const chrome of REPRODUCTION_CHROME) {
      for (const headline of headlines) {
        expect(headline).not.toContain(chrome);
      }
    }
  });

  it("no surviving headline is a bare URL, angle-bracket link, or starts with a stray brace", () => {
    for (const headline of allHeadlines()) {
      expect(headline).not.toMatch(/^<?https?:\/\//);
      expect(headline).not.toMatch(/^[{}]/);
      // and no tracking URL glued into a real title
      expect(headline).not.toContain("substack.com/redirect");
      expect(headline).not.toContain("bloom.bg");
    }
  });

  it("Money Stuff (single-essay, all chrome) yields ZERO stories and logs the rejections", () => {
    const result = loadFixture("money-stuff-2026-06-06");
    // Every previously-staged row from this email was chrome — empty is correct.
    expect(result.stories).toHaveLength(0);
    expect(result.chromeRejections.length + result.junkRejections.length).toBeGreaterThan(0);
  });

  it("1440 digest no longer stages the CAN-SPAM postal address", () => {
    const result = loadFixture("1440-2026-06-06");
    expect(result.stories.every((story) => !/\bIL\s+60654\b/.test(story.headline))).toBe(true);
    expect(result.stories.every((story) => !/merchandise mart/i.test(story.headline))).toBe(true);
  });

  it("a16z surviving candidates are real stories (decoded entities, no chrome, no embedded link)", () => {
    const result = loadFixture("a16z-charts-2026-06-06");
    for (const story of result.stories) {
      expect(story.headline).not.toContain("http");
      expect(story.headline).not.toMatch(/&#\d+;/); // entities decoded, e.g. Lil&#8217; → Lil’
      expect(story.headline.trim().length).toBeGreaterThanOrEqual(12);
    }
  });

  it("a synthetic pure-chrome email yields an empty extraction (empty is correct, junk is not)", () => {
    const pureChrome = [
      "Follow Us <https://bloom.bg/x> <https://bloom.bg/y>",
      "READ IN APP (https://open.substack.com/app)",
      "1440 Media 222 W Merchandise Mart Plaza, Suite 1212 Chicago, IL 60654",
      "Unsubscribe <https://example.com/unsubscribe>",
      "View this post on the web at https://example.com/p/post",
      "Manage preferences <https://example.com/preferences>",
    ].join("\n");

    const result = parseNewsletterStoriesDetailed({
      sender: "Pure Chrome Newsletter <noreply@example.com>",
      subject: "All footer, no story",
      rawContent: pureChrome,
    });

    expect(result.stories).toHaveLength(0);
  });
});
