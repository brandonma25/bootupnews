import { describe, expect, it } from "vitest";

import {
  classifyUrlForArticleEligibility,
  isLikelyArticleUrl,
  summarizeJunkRejections,
  type JunkRejection,
} from "@/lib/url-filtering";

describe("isLikelyArticleUrl", () => {
  describe("accepts plausible article URLs", () => {
    it.each([
      "https://www.bbc.com/news/world-asia-12345678",
      "https://www.reuters.com/world/2026/05/21/some-story",
      "https://www.france24.com/en/africa/20260521-india-africa-summit",
      "https://www.nytimes.com/2026/05/20/business/markets.html",
      "https://www.theverge.com/2026/5/20/12345/article-title",
      // Article URLs that happen to live under a path containing "fonts" must
      // still pass — the asset-extension check looks at the LAST segment.
      "https://www.cnn.com/2026/fonts-of-power/article",
    ])("%s", (url) => {
      expect(isLikelyArticleUrl(url)).toBe(true);
    });
  });

  describe("rejects asset extensions (the Axios webfont case)", () => {
    it.each([
      ["https://static.axios.com/fonts/atizatext-bold-webfont.woff2", "woff2"],
      ["https://static.axios.com/fonts/atizatext-bold-webfont.ttf", "ttf"],
      ["https://static.axios.com/fonts/atizatext-bold-webfont.eot", "eot"],
      ["https://static.axios.com/fonts/atizatext-regular-webfont.svg", "svg"],
      ["https://cdn.example.com/styles/site.css", "css"],
      ["https://cdn.example.com/app.bundle.js", "js"],
      ["https://example.com/some-report.pdf", "pdf"],
      ["https://example.com/diagram.png", "png"],
      ["https://example.com/photo.JPG", "jpg"],
    ])("%s → %s", (url, ext) => {
      const result = classifyUrlForArticleEligibility(url);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe("asset_extension");
        expect(result.detail).toBe(ext);
      }
    });
  });

  describe("rejects tracking / redirector hosts (the Politico tracking case)", () => {
    it.each([
      "https://url4027.email.politico.com/ss/c/u001.abc/4qo/W9PWa790RNuioZrdfZ4GBA/h12/h001.token",
      "https://url123.email.semafor.com/ss/c/some-opaque-token/wrapper",
      "https://list-manage.com/track?u=1&id=2",
      "https://example.list-manage.com/subscribe/confirm?u=abc&id=def",
    ])("%s", (url) => {
      const result = classifyUrlForArticleEligibility(url);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(["tracking_host", "marketing_hostname", "non_article_path"]).toContain(result.reason);
      }
    });
  });

  describe("rejects marketing-subdomain wrappers", () => {
    it.each([
      "https://email.morningbrew.com/dispatch/abc/article",
      "https://email.semafor.com/2026-05-21",
      "https://links.cnbc.com/redirect/x",
      "https://link.mail.beehiiv.com/wf/click?upn=abc",
    ])("%s", (url) => {
      const result = classifyUrlForArticleEligibility(url);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(["marketing_hostname", "tracking_host", "non_article_path"]).toContain(result.reason);
      }
    });

    it("does NOT flag links.youtube.com or other allow-listed legit links.* hosts", () => {
      expect(isLikelyArticleUrl("https://links.youtube.com/redirect?some=video")).toBe(false);
      // Above still rejects on the path "/redirect" — confirm it's the path, not the host.
      const result = classifyUrlForArticleEligibility("https://links.youtube.com/watch?v=abc");
      expect(result.ok).toBe(true);
    });
  });

  describe("rejects utility / unsubscribe paths", () => {
    it.each([
      "https://www.bbc.com/email/unsubscribe?token=abc",
      "https://example.com/preferences",
      "https://example.com/manage-subscription/123",
      "https://example.com/click/abc/def",
      "https://example.com/redirect?target=https://elsewhere.com",
    ])("%s", (url) => {
      expect(isLikelyArticleUrl(url)).toBe(false);
    });
  });

  describe("rejects malformed inputs", () => {
    it.each([
      [null, "invalid_url"],
      [undefined, "invalid_url"],
      ["", "invalid_url"],
      ["   ", "invalid_url"],
      ["not-a-url", "invalid_url"],
      ["javascript:alert(1)", "non_http_protocol"],
      ["mailto:user@example.com", "non_http_protocol"],
      ["ftp://files.example.com/x", "non_http_protocol"],
    ] as const)("%s → %s", (input, expectedReason) => {
      const result = classifyUrlForArticleEligibility(input);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe(expectedReason);
    });
  });
});

describe("summarizeJunkRejections", () => {
  it("counts by reason", () => {
    const rejections: JunkRejection[] = [
      { url: "a.woff2", reason: "asset_extension", detail: "woff2" },
      { url: "b.ttf", reason: "asset_extension", detail: "ttf" },
      { url: "c", reason: "tracking_host", detail: "email.politico.com" },
      { url: "d", reason: "marketing_hostname", detail: "email.foo" },
    ];
    const summary = summarizeJunkRejections(rejections);
    expect(summary.count).toBe(4);
    expect(summary.byReason.asset_extension).toBe(2);
    expect(summary.byReason.tracking_host).toBe(1);
    expect(summary.byReason.marketing_hostname).toBe(1);
    expect(summary.byReason.non_article_path).toBe(0);
  });
});
