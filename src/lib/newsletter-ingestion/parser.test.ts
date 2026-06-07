import { describe, expect, it } from "vitest";

import { parseRawNewsletterEmail } from "@/lib/newsletter-ingestion/email-content";
import {
  parseNewsletterStories,
  parseNewsletterStoriesDetailed,
} from "@/lib/newsletter-ingestion/parser";

function encodeRawEmail(raw: string) {
  return Buffer.from(raw, "utf8").toString("base64url");
}

describe("newsletter MIME parsing", () => {
  it("decodes raw Gmail messages and preserves HTML links as text URLs", () => {
    const parsed = parseRawNewsletterEmail(
      encodeRawEmail([
        "From: Morning Brew <crew@morningbrew.com>",
        "Subject: Markets reset around AI chips",
        "Date: Sun, 10 May 2026 07:00:00 +0000",
        "Content-Type: text/html; charset=utf-8",
        "Content-Transfer-Encoding: quoted-printable",
        "",
        "<h2>AI chip export controls expand</h2><p>Officials widened controls on advanced accelerators.</p><a href=3D\"https://example.com/chips\">Read more</a>",
      ].join("\r\n")),
    );

    expect(parsed.sender).toContain("Morning Brew");
    expect(parsed.subject).toBe("Markets reset around AI chips");
    expect(parsed.receivedAt).toBe("2026-05-10T07:00:00.000Z");
    expect(parsed.contentText).toContain("AI chip export controls expand");
    expect(parsed.contentText).toContain("https://example.com/chips");
  });
});

describe("newsletter story extraction parser", () => {
  it("extracts conservative Morning Brew section stories", () => {
    const stories = parseNewsletterStories({
      sender: "Morning Brew <crew@morningbrew.com>",
      subject: "Morning Brew",
      rawContent: [
        "AI chip export controls expand",
        "U.S. officials widened restrictions on advanced accelerators, forcing cloud vendors and chip suppliers to reassess shipments. https://example.com/chips",
        "",
        "Fed officials keep rates restrictive",
        "Several Federal Reserve officials said inflation is easing unevenly, pushing traders to reduce expectations for near-term cuts. https://example.com/fed",
      ].join("\n"),
    });

    expect(stories).toHaveLength(2);
    expect(stories[0]).toMatchObject({
      headline: "AI chip export controls expand",
      sourceUrl: "https://example.com/chips",
      sourceDomain: "example.com",
      category: "Tech",
    });
    expect(stories[0]!.extractionConfidence).toBeGreaterThanOrEqual(0.8);
  });

  it("supports Semafor story blocks", () => {
    const stories = parseNewsletterStories({
      sender: "Semafor Flagship <flagship@semafor.com>",
      subject: "Semafor Flagship",
      rawContent: [
        "The White House leans into tariff talks",
        "Lawmakers are weighing a package that would change import costs for electric vehicle supply chains and defense procurement. https://example.com/tariffs",
      ].join("\n"),
    });

    expect(stories).toHaveLength(1);
    expect(stories[0]).toMatchObject({
      category: "Finance",
      sourceUrl: "https://example.com/tariffs",
    });
  });

  it("supports TLDR numbered/list items", () => {
    const stories = parseNewsletterStories({
      sender: "TLDR <newsletter@tldr.tech>",
      subject: "TLDR Daily",
      rawContent: [
        "1. Microsoft expands data center capacity",
        "Microsoft is adding AI infrastructure capacity as cloud demand shifts procurement timelines for enterprise customers. https://example.com/cloud",
        "2. Startup funding rounds rebound",
        "Venture investors increased later-stage funding, changing capital availability for AI infrastructure suppliers. https://example.com/funding",
      ].join("\n"),
    });

    expect(stories).toHaveLength(2);
    expect(stories.map((story) => story.category)).toEqual(["Tech", "Finance"]);
  });

  it("supports AP Wire article items", () => {
    const stories = parseNewsletterStories({
      sender: "AP Wire <alerts@apnews.com>",
      subject: "AP Wire",
      rawContent: [
        "Supreme Court takes up platform regulation case",
        "The court agreed to review a state law that could change how technology platforms moderate political speech. https://example.com/court",
      ].join("\n"),
    });

    expect(stories).toHaveLength(1);
    expect(stories[0]).toMatchObject({
      category: "Tech",
      sourceUrl: "https://example.com/court",
    });
  });

  it("keeps 1440 items lower confidence", () => {
    const stories = parseNewsletterStories({
      sender: "1440 Daily Digest <daily@join1440.com>",
      subject: "1440",
      rawContent: [
        "Markets watch oil supply talks",
        "Energy ministers are discussing production targets as oil traders reassess supply risk and inflation pressure. https://example.com/oil",
      ].join("\n"),
    });

    expect(stories).toHaveLength(1);
    expect(stories[0]!.extractionConfidence).toBeLessThan(0.75);
  });

  it("returns no stories for malformed or empty newsletters", () => {
    expect(parseNewsletterStories({ sender: "Unknown", subject: "", rawContent: "" })).toEqual([]);
    expect(parseNewsletterStories({
      sender: "Unknown",
      subject: "Malformed",
      rawContent: "unsubscribe\nview in browser\nsponsored",
    })).toEqual([]);
  });

  // Task 2 (PRD-13) regression fixtures. Both shapes were observed live on
  // 2026-05-17 and produced 7 rows of junk in signal_posts before they were
  // deduped by the migration in PR #260.
  describe("junk-URL filtering at ingest", () => {
    it("drops Axios @font-face CSS blocks instead of storing webfont URLs as stories", () => {
      const cssBody = [
        "<style>",
        "@font-face {",
        "  font-family: 'AtizaText';",
        "  src: url('https://static.axios.com/fonts/atizatext-bold-webfont.eot');",
        "  src: url('https://static.axios.com/fonts/atizatext-bold-webfont.eot?#iefix') format('embedded-opentype'),",
        "       url('https://static.axios.com/fonts/atizatext-bold-webfont.woff2') format('woff2'),",
        "       url('https://static.axios.com/fonts/atizatext-bold-webfont.ttf') format('truetype'),",
        "       url('https://static.axios.com/fonts/atizatext-bold-webfont.svg#atizatext') format('svg');",
        "}",
        "</style>",
      ].join("\n");

      const result = parseNewsletterStoriesDetailed({
        sender: "Axios AM <morning@axios.com>",
        subject: "Axios AM — 2026-05-17",
        rawContent: cssBody,
      });

      // No webfont URL survives as a story.
      expect(result.stories.every((story) =>
        !/static\.axios\.com\/fonts\//.test(story.sourceUrl ?? ""),
      )).toBe(true);
      // And the stripped CSS leaves no parseable content at all in this fixture.
      expect(result.stories).toEqual([]);
    });

    it("rejects Politico /ss/c/ tracking redirector URLs (BOOT-UP-WEB junk fixture)", () => {
      const politicoBody = [
        "POLITICO Playbook PM",
        "So five years on, does he stand by his impeachment vote?",
        "Cassidy said this and that and the other thing, with a long quote running for several lines so it qualifies as a real snippet for the parser. Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
        "Read the rest at https://url4027.email.politico.com/ss/c/u001.6g0Zd3AyneOViJYBXgbV65ZWHEH5gWGSDKLrcKzwr3-LpIGJKOF/4qo/W9PWa790RNuioZrdfZ4GBA/h9/h001.BII4nWKUIO44a9tBS2FXH1qF8kI3UUNKahTeEuR2vyo",
      ].join("\n");

      const result = parseNewsletterStoriesDetailed({
        sender: "POLITICO Playbook <playbook@politico.com>",
        subject: "POLITICO Playbook PM",
        rawContent: politicoBody,
      });

      // The only URL in the block is a tracker → no story should be emitted
      // (we don't store a tracker URL as the source-of-record).
      expect(result.stories.every((story) =>
        !/url\d+\.email\.politico\.com\/ss\/c\//.test(story.sourceUrl ?? ""),
      )).toBe(true);
      expect(result.junkRejections.length).toBeGreaterThan(0);
      expect(result.junkRejections[0].reason).toMatch(/tracking_host|marketing_hostname/);
    });

    it("still extracts a story when a real article URL appears alongside trackers", () => {
      const mixedBody = [
        "AI chip export controls expand",
        "U.S. officials widened restrictions on advanced accelerators, forcing cloud vendors and chip suppliers to reassess shipments. Read more: https://example.com/articles/chips-expansion (via https://url4027.email.politico.com/ss/c/abc/redirect)",
      ].join("\n");

      const result = parseNewsletterStoriesDetailed({
        sender: "Morning Brew <crew@morningbrew.com>",
        subject: "Morning Brew",
        rawContent: mixedBody,
      });

      expect(result.stories).toHaveLength(1);
      expect(result.stories[0].sourceUrl).toBe("https://example.com/articles/chips-expansion");
      // The real article title survives — NOT a "More: <link>" read-more line as
      // the headline, and with the tracking URL stripped out of the title.
      expect(result.stories[0].headline).toBe("AI chip export controls expand");
      // The tracker appears AFTER the chosen article URL, so extractFirstArticleUrl
      // returns on the first match and never iterates to it.
    });
  });
});
