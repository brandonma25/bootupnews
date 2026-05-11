import { describe, expect, it } from "vitest";

import { parseRawNewsletterEmail } from "@/lib/newsletter-ingestion/email-content";
import { parseNewsletterStories } from "@/lib/newsletter-ingestion/parser";

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
});
