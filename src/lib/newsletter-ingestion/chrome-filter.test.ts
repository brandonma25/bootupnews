import { describe, expect, it } from "vitest";

import {
  classifyNewsletterChrome,
  isBareUrlTitle,
  proseWordCount,
  summarizeChromeRejections,
  type ChromeRejection,
} from "@/lib/newsletter-ingestion/chrome-filter";

function classify(headline: string, sourceUrl: string | null = "https://example.com/articles/real-story") {
  return classifyNewsletterChrome({
    headline,
    snippet: "A sufficiently long snippet of real prose for the candidate body.",
    sourceUrl,
    sourceDomain: sourceUrl ? new URL(sourceUrl).hostname : null,
  });
}

describe("isBareUrlTitle", () => {
  it("flags angle-bracket and bare URLs", () => {
    expect(isBareUrlTitle("<https://bloom.bg/3PWd74F>")).toBe(true);
    expect(isBareUrlTitle("https://substack.com/redirect/5f115a4c-87d7")).toBe(true);
    expect(isBareUrlTitle("<https://www.bloomberg.com/account/newsletters/money-stuff?x=1>")).toBe(true);
  });

  it("does not flag a real headline (even with a trailing link)", () => {
    expect(isBareUrlTitle("AI chip export controls expand")).toBe(false);
    expect(isBareUrlTitle("Charts of the Week: Retail to the Moon")).toBe(false);
  });
});

describe("proseWordCount", () => {
  it("counts alphabetic words, ignoring URLs", () => {
    expect(proseWordCount("AI chip export controls expand")).toBe(5);
    expect(proseWordCount("https://example.com/x https://example.com/y")).toBe(0);
  });
});

describe("classifyNewsletterChrome — one case per failure class (2026-06-06 repro)", () => {
  it("(a) bare URL / angle-bracket title", () => {
    const v = classify("<https://bloom.bg/4nhTnYV>", "https://bloom.bg/4nhTnYV");
    expect(v).toMatchObject({ rejected: true, reason: "bare_url_title" });
  });

  it("(b) tracking / shortener / subscription source domain", () => {
    expect(classify("Some plausible title here", "https://bloom.bg/4nqVBoU")).toMatchObject({
      rejected: true,
      reason: "tracking_or_shortener_domain",
    });
    expect(
      classify("Charts of the week roundup", "https://substack.com/redirect/2572d60d?j=x"),
    ).toMatchObject({ rejected: true, reason: "tracking_or_shortener_domain" });
    expect(
      classify("Remote work topics today", "https://substack.com/app-link/post?publication_id=1"),
    ).toMatchObject({ rejected: true, reason: "tracking_or_shortener_domain" });
    expect(
      classify("Money Stuff subscription", "https://www.bloomberg.com/account/newsletters/money-stuff"),
    ).toMatchObject({ rejected: true, reason: "tracking_or_shortener_domain" });
  });

  it("(c) boilerplate footer/nav/app-promo phrase", () => {
    expect(classify("Follow Us on social")).toMatchObject({ rejected: true, reason: "boilerplate_phrase" });
    expect(classify("READ IN APP for the full post")).toMatchObject({ rejected: true, reason: "boilerplate_phrase" });
    expect(classify("View this post on the web at our site")).toMatchObject({
      rejected: true,
      reason: "boilerplate_phrase",
    });
  });

  it("(d) CAN-SPAM postal address", () => {
    expect(classify("1440 Media 222 W Merchandise Mart Plaza, Suite 1212 Chicago, IL 60654")).toMatchObject({
      rejected: true,
      reason: "postal_address",
    });
    expect(classify("Bloomberg L.P. 731 Lexington, New York, NY, 10022")).toMatchObject({
      rejected: true,
      reason: "postal_address",
    });
  });

  it("(e) below minimum real prose", () => {
    expect(classify("Podcast")).toMatchObject({ rejected: true, reason: "below_min_prose" });
  });

  it("accepts a genuine story headline + real article URL", () => {
    expect(classify("AI chip export controls expand", "https://example.com/articles/chips-expansion")).toEqual({
      rejected: false,
    });
    expect(classify("Charts of the Week: Retail to the Moon", "https://www.a16z.news/p/charts")).toEqual({
      rejected: false,
    });
  });
});

describe("summarizeChromeRejections", () => {
  it("rolls up counts per reason", () => {
    const rejections: ChromeRejection[] = [
      { headline: "a", reason: "bare_url_title", detail: "x" },
      { headline: "b", reason: "bare_url_title", detail: "y" },
      { headline: "c", reason: "boilerplate_phrase", detail: "follow us" },
    ];
    const summary = summarizeChromeRejections(rejections);
    expect(summary.count).toBe(3);
    expect(summary.byReason.bare_url_title).toBe(2);
    expect(summary.byReason.boilerplate_phrase).toBe(1);
    expect(summary.byReason.postal_address).toBe(0);
  });
});
