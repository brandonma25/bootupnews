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

  it("does not reintroduce BBC or CNBC preference after the MVP cleanup", () => {
    expect(classifySourcePreference({ sourceName: "BBC News", url: "https://www.bbc.com/news" })).toBe("unknown");
    expect(classifySourcePreference({ sourceName: "CNBC", url: "https://www.cnbc.com/markets" })).toBe("unknown");
  });

  it("does not add source-policy boosts for probationary activation", () => {
    const serializedRules = JSON.stringify(SOURCE_PREFERENCE_RULES);

    expect(serializedRules).not.toContain("technologyreview.com");
    expect(serializedRules).not.toContain("MIT Technology Review");
    expect(classifySourcePreference({
      sourceName: "MIT Technology Review",
      url: "https://www.technologyreview.com/example",
    })).toBe("unknown");
  });
});
