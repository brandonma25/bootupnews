import { describe, expect, it } from "vitest";

import { SOURCE_PREFERENCE_RULES, classifySourcePreference } from "@/lib/source-policy";

describe("source preference policy", () => {
  it("classifies approved high-trust and specialist sources through one shared policy", () => {
    expect(classifySourcePreference({ sourceName: "Reuters", url: "https://www.reuters.com/world/example" })).toBe(
      "tier1",
    );
    expect(classifySourcePreference({ sourceName: "Ars Technica", url: "https://arstechnica.com/example" })).toBe(
      "tier2",
    );
    expect(classifySourcePreference({ sourceName: "GDELT AI Monitor", url: "https://www.gdeltproject.org/story" }))
      .toBe("tier3");
  });

  it("classifies PRD-54 public manifest additions as tier2 secondary sources", () => {
    expect(classifySourcePreference({
      sourceName: "MIT Technology Review",
      url: "https://www.technologyreview.com/example",
    })).toBe("tier2");
    expect(classifySourcePreference({ sourceName: "BBC World News", url: "https://www.bbc.com/news/world" }))
      .toBe("tier2");
    expect(classifySourcePreference({ sourceName: "BBC World News", url: "https://www.bbc.co.uk/news/world" }))
      .toBe("tier2");
    expect(classifySourcePreference({ sourceName: "Foreign Affairs", url: "https://www.foreignaffairs.com/example" }))
      .toBe("tier2");
    expect(classifySourcePreference({ sourceName: "The Diplomat", url: "https://thediplomat.com/example" }))
      .toBe("tier2");
    expect(classifySourcePreference({ sourceName: "Foreign Policy", url: "https://foreignpolicy.com/example" }))
      .toBe("tier2");
    expect(classifySourcePreference({ sourceName: "Politico Congress", url: "https://www.politico.com/congress" }))
      .toBe("tier2");
    expect(classifySourcePreference({ sourceName: "Hacker News Best", url: "https://news.ycombinator.com/item" }))
      .toBe("tier3");
  });

  it("classifies Batch 1 accessible source additions without making support sources tier1 by brand", () => {
    expect(classifySourcePreference({ sourceName: "NPR Economy", url: "https://www.npr.org/sections/economy/" }))
      .toBe("tier2");
    expect(classifySourcePreference({ sourceName: "CNBC Finance", url: "https://www.cnbc.com/finance/" }))
      .toBe("tier2");
    expect(classifySourcePreference({ sourceName: "MarketWatch", url: "https://feeds.content.dowjones.io/public/rss/mw_topstories" }))
      .toBe("tier2");
    expect(classifySourcePreference({ sourceName: "ProPublica", url: "https://www.propublica.org/story" }))
      .toBe("tier1");
    expect(classifySourcePreference({ sourceName: "BLS Consumer Price Index", url: "https://www.bls.gov/cpi/" }))
      .toBe("tier1");
    expect(classifySourcePreference({ sourceName: "Federal Reserve Monetary Policy", url: "https://www.federalreserve.gov/monetarypolicy.htm" }))
      .toBe("tier1");
  });

  it("classifies Batch 2A additions through explicit host and institutional rules", () => {
    expect(classifySourcePreference({ sourceName: "Semafor", url: "https://www.semafor.com/story" })).toBe("tier2");
    expect(classifySourcePreference({ sourceName: "Axios", url: "https://www.axios.com/story" })).toBe("tier2");
    expect(classifySourcePreference({ sourceName: "404 Media", url: "https://www.404media.co/story" })).toBe("tier2");
    expect(classifySourcePreference({ sourceName: "Heatmap", url: "https://heatmap.news/story" })).toBe("tier2");
    expect(classifySourcePreference({ sourceName: "The Guardian World", url: "https://www.theguardian.com/world/story" }))
      .toBe("tier2");
    expect(classifySourcePreference({ sourceName: "PBS NewsHour", url: "https://www.pbs.org/newshour/story" }))
      .toBe("tier2");
    expect(classifySourcePreference({ sourceName: "SEC Press Releases", url: "https://www.sec.gov/news/press-release/story" }))
      .toBe("tier1");
    expect(classifySourcePreference({ sourceName: "France24", url: "https://www.france24.com/en/story" }))
      .toBe("tier2");
  });

  it("classifies Batch 2B official finance sources as tier1 institutional sources", () => {
    expect(classifySourcePreference({
      sourceName: "Liberty Street Economics",
      url: "https://libertystreeteconomics.newyorkfed.org/story",
    })).toBe("tier1");
    expect(classifySourcePreference({
      sourceName: "FRED Blog",
      url: "https://fredblog.stlouisfed.org/story",
    })).toBe("tier1");
    expect(classifySourcePreference({
      sourceName: "Federal Reserve FEDS Notes",
      url: "https://www.federalreserve.gov/econres/notes/feds-notes/story.htm",
    })).toBe("tier1");
    expect(classifySourcePreference({
      sourceName: "SF Fed Research and Insights",
      url: "https://www.frbsf.org/research-and-insights/story/",
    })).toBe("tier1");
    expect(classifySourcePreference({
      sourceName: "St. Louis Fed On the Economy",
      url: "https://www.stlouisfed.org/on-the-economy/story",
    })).toBe("tier1");
  });

  it("keeps Ars Technica at tier2 in source-policy despite donor metadata differences", () => {
    const serializedRules = JSON.stringify(SOURCE_PREFERENCE_RULES);

    expect(serializedRules).toContain("arstechnica.com");
    expect(classifySourcePreference({ sourceName: "Ars Technica", url: "https://arstechnica.com/example" }))
      .toBe("tier2");
  });
});
