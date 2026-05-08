import { describe, expect, it } from "vitest";

import { getSourceRegistrySnapshot } from "@/adapters/donors";
import {
  classifyHomepageCategory,
  countSourcesByHomepageCategory,
} from "@/lib/homepage-taxonomy";
import { getSourcesForPublicSurface } from "@/lib/source-manifest";
import {
  getSourceTaxonomyProfile,
  isMixedDomainSource,
  SOURCE_TAXONOMY_PROFILES,
} from "@/lib/source-taxonomy";

describe("source taxonomy expansion", () => {
  it("registers all requested expansion sources with strict or mixed-domain scope", () => {
    expect(SOURCE_TAXONOMY_PROFILES.map((source) => source.profileId)).toEqual([
      "the-verge",
      "ars-technica",
      "mit-technology-review",
      "foreign-affairs",
      "the-diplomat",
      "npr-world",
      "brookings-research",
      "foreign-policy",
      "guardian-world",
      "hacker-news-best",
      "csis-analysis",
    ]);

    expect(getSourceTaxonomyProfile({ sourceName: "Brookings Research" })).toMatchObject({
      domainScope: "mixed_domain",
      runtimeEnabled: false,
      validationStatus: "failed",
    });
    expect(getSourceTaxonomyProfile({ sourceName: "CSIS Analysis" })).toMatchObject({
      domainScope: "mixed_domain",
      runtimeEnabled: false,
      validationStatus: "failed",
    });
  });

  it("maps strict source names into website categories without relying on headline keywords", () => {
    expect(classifyHomepageCategory({ sourceNames: ["MIT Technology Review"] }).primaryCategory).toBe("tech");
    expect(classifyHomepageCategory({ sourceNames: ["Hacker News Best"] }).primaryCategory).toBe("tech");
    expect(classifyHomepageCategory({ sourceNames: ["Foreign Affairs"] }).primaryCategory).toBe("politics");
    expect(classifyHomepageCategory({ sourceNames: ["The Diplomat"] }).primaryCategory).toBe("politics");
    expect(classifyHomepageCategory({ sourceNames: ["NPR World"] }).primaryCategory).toBe("politics");
  });

  it("does not flatten mixed-domain source names into a homepage category", () => {
    expect(classifyHomepageCategory({ sourceNames: ["Brookings Research"] }).primaryCategory).toBeNull();
    expect(classifyHomepageCategory({ sourceNames: ["Foreign Policy"] }).primaryCategory).toBeNull();
    expect(classifyHomepageCategory({ sourceNames: ["The Guardian World"] }).primaryCategory).toBeNull();
    expect(classifyHomepageCategory({ sourceNames: ["CSIS Analysis"] }).primaryCategory).toBeNull();
    expect(
      classifyHomepageCategory({
        sourceNames: ["Brookings Research"],
        title: "AI model benchmark shows new compute demand",
        summary: "Researchers compare foundation models, chips, and data center infrastructure.",
      }).primaryCategory,
    ).toBe("tech");
  });

  it("keeps disabled mixed-domain endpoints out of public source counts", () => {
    const publicSources = getSourcesForPublicSurface("public.home");
    const expansionSources = publicSources.filter((source) =>
      [
        "source-mit-tech-review",
        "source-hacker-news-best",
        "source-foreign-affairs",
        "source-the-diplomat",
        "source-npr-world",
        "source-foreign-policy",
        "source-guardian-world",
      ].includes(source.id),
    );
    const counts = countSourcesByHomepageCategory(expansionSources);
    const publicSourceIds = new Set(publicSources.map((source) => source.id));

    expect(counts.tech).toBe(2);
    expect(counts.politics).toBe(3);
    expect(publicSourceIds.has("source-brookings-research")).toBe(false);
    expect(publicSourceIds.has("source-csis-analysis")).toBe(false);
    expect(isMixedDomainSource({ sourceName: "Foreign Policy" })).toBe(true);
  });

  it("carries source scope through donor registry metadata", () => {
    const registry = getSourceRegistrySnapshot();

    expect(registry.find((source) => source.sourceId === "foreign-policy")).toMatchObject({
      domainScope: "mixed_domain",
      defaultCategory: undefined,
    });
    expect(registry.find((source) => source.sourceId === "foreign-affairs")).toMatchObject({
      domainScope: "strict",
      defaultCategory: "politics",
    });
    expect(registry.find((source) => source.sourceId === "brookings-research")).toMatchObject({
      status: "inactive",
      domainScope: "mixed_domain",
    });
  });
});
