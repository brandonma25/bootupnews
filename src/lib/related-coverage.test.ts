import { describe, expect, it } from "vitest";

import { selectRelatedCoverage } from "@/lib/related-coverage";

describe("selectRelatedCoverage", () => {
  it("filters out weakly related and duplicate-source links", () => {
    const related = selectRelatedCoverage(
      {
        title: "Fed signals rates may stay higher for longer",
        url: "https://example.com/lead",
        sourceName: "Reuters",
        summaryText: "Markets, treasury yields, and inflation expectations moved.",
        matchedKeywords: ["fed", "rates", "inflation"],
      },
      [
        {
          title: "Treasury yields rise after the latest Fed comments",
          url: "https://example.com/a",
          sourceName: "AP",
          summaryText: "Treasury markets and inflation expectations repriced after the comments.",
          matchedKeywords: ["treasury", "inflation"],
        },
        {
          title: "Treasury yields rise after the latest Fed comments",
          url: "https://example.com/b",
          sourceName: "AP",
          summaryText: "A near-duplicate article from the same source.",
          matchedKeywords: ["treasury"],
        },
        {
          title: "Local sports team opens a new stadium district",
          url: "https://example.com/c",
          sourceName: "Local News",
          summaryText: "A city sports story with no market overlap.",
          matchedKeywords: ["stadium"],
        },
      ],
      4,
    );

    expect(related).toHaveLength(1);
    expect(related[0]?.sourceName).toBe("AP");
  });
});
