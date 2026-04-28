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
    expect(classifySourcePreference({ sourceName: "Politico Congress", url: "https://www.politico.com/congress" }))
      .toBe("tier2");
  });

  it("does not reintroduce CNBC preference after the MVP cleanup", () => {
    expect(classifySourcePreference({ sourceName: "CNBC", url: "https://www.cnbc.com/markets" })).toBe("unknown");
  });

  it("keeps Ars Technica at tier2 in source-policy despite donor metadata differences", () => {
    const serializedRules = JSON.stringify(SOURCE_PREFERENCE_RULES);

    expect(serializedRules).toContain("arstechnica.com");
    expect(classifySourcePreference({ sourceName: "Ars Technica", url: "https://arstechnica.com/example" }))
      .toBe("tier2");
  });
});
