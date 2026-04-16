import { describe, expect, it } from "vitest";

import {
  __testing__,
  generateWhyThisMatters,
  generateWhyThisMattersHeuristically,
} from "@/lib/why-it-matters";
import type { EventIntelligence } from "@/lib/types";

function createIntelligence(overrides: Partial<EventIntelligence> = {}): EventIntelligence {
  return {
    id: "evt-1",
    title: "InsightFinder raises $15M to help companies monitor AI agents",
    summary: "The startup raised funding to expand its AI reliability platform.",
    primaryChange: "InsightFinder raised $15M to expand its AI reliability platform",
    entities: ["InsightFinder"],
    eventType: "mna_funding",
    primaryImpact: "The funding could change competition in AI tooling and model governance.",
    affectedMarkets: ["ai tooling", "enterprise software"],
    timeHorizon: "medium",
    signalStrength: "moderate",
    keyEntities: ["InsightFinder"],
    topics: ["tech", "business"],
    signals: {
      articleCount: 1,
      sourceDiversity: 1,
      recencyScore: 86,
      velocityScore: 20,
    },
    rankingScore: 58,
    rankingReason: "Fresh funding coverage put the startup on the radar.",
    confidenceScore: 54,
    isHighSignal: true,
    createdAt: "2026-04-17T00:00:00.000Z",
    ...overrides,
  };
}

function firstClause(text: string) {
  return text.split(".")[0] ?? text;
}

describe("why-it-matters", () => {
  it("keeps subject anchoring in the opening clause for non-fallback funding stories", async () => {
    const text = await generateWhyThisMatters(createIntelligence());

    expect(firstClause(text)).toContain("InsightFinder");
    expect(text.toLowerCase()).not.toContain("early signal");
    expect(text.toLowerCase()).not.toContain("watch for");
  });

  it("uses visibly different reasoning across funding, product, political, defense, and macro stories", async () => {
    const funding = await generateWhyThisMatters(
      createIntelligence({
        id: "funding",
      }),
    );
    const product = await generateWhyThisMatters(
      createIntelligence({
        id: "product",
        title: "Google adds AI Mode to Chrome",
        summary: "The feature extends browser-integrated AI navigation inside Chrome.",
        primaryChange: "Google added AI Mode to Chrome",
        entities: ["Mode"],
        keyEntities: ["Mode"],
        eventType: "product",
        primaryImpact: "The change could alter search behavior and Chrome engagement.",
        affectedMarkets: ["adoption", "competitive feature dynamics"],
        topics: ["tech", "business"],
        signalStrength: "moderate",
        confidenceScore: 63,
      }),
    );
    const political = await generateWhyThisMatters(
      createIntelligence({
        id: "political",
        title: "Peter Mandelson failed UK Foreign Office vetting",
        summary: "The setback raises questions about UK diplomatic judgment and political accountability.",
        primaryChange: "Peter Mandelson failed UK Foreign Office vetting",
        entities: ["UK Foreign Office", "Peter Mandelson"],
        eventType: "political",
        primaryImpact: "The development could affect diplomatic credibility and political accountability.",
        affectedMarkets: ["governance credibility", "policy risk"],
        topics: ["politics", "geopolitics"],
        timeHorizon: "medium",
        signalStrength: "moderate",
        confidenceScore: 52,
      }),
    );
    const defense = await generateWhyThisMatters(
      createIntelligence({
        id: "defense",
        title: "Google Gemini wins Department of Defense classified prototype contract",
        summary: "The agreement ties Google more closely to sensitive U.S. government AI work.",
        primaryChange: "Google Gemini won a Department of Defense classified prototype contract",
        entities: ["Google", "Department of Defense"],
        eventType: "defense",
        primaryImpact: "The contract could affect defense AI procurement and government platform alignment.",
        affectedMarkets: ["defense posture", "international relations"],
        topics: ["tech", "politics"],
        signalStrength: "strong",
        confidenceScore: 66,
      }),
    );
    const macro = await generateWhyThisMatters(
      createIntelligence({
        id: "macro",
        title: "Lower mortgage rates lift refinancing activity",
        summary: "Falling mortgage rates are starting to change housing demand and refinancing behavior.",
        primaryChange: "Lower mortgage rates lifted refinancing activity",
        entities: ["Mortgage rates"],
        eventType: "macro_market_move",
        primaryImpact: "Lower mortgage rates could affect housing demand and household cash flow.",
        affectedMarkets: ["housing", "consumer demand"],
        topics: ["finance"],
        signalStrength: "strong",
        confidenceScore: 68,
      }),
    );

    expect(funding.toLowerCase()).toContain("capital");
    expect(product.startsWith("Google")).toBe(true);
    expect(product.toLowerCase()).toMatch(/adoption|feature|chrome|user behavior/);
    expect(political.toLowerCase()).toMatch(/governance|policy risk|political accountability|diplomatic/);
    expect(political.toLowerCase()).not.toMatch(/equities|technology/);
    expect(defense.toLowerCase()).toMatch(/defense|international relations|policy/);
    expect(defense.toLowerCase()).not.toMatch(/valuation|equities/);
    expect(macro.toLowerCase()).toMatch(/mortgage|rates|housing/);
  });

  it("fails the swap test across unrelated event types", async () => {
    const funding = await generateWhyThisMatters(createIntelligence());
    const political = await generateWhyThisMatters(
      createIntelligence({
        id: "political-swap",
        title: "Peter Mandelson failed UK Foreign Office vetting",
        summary: "The setback raises questions about UK diplomatic judgment and political accountability.",
        primaryChange: "Peter Mandelson failed UK Foreign Office vetting",
        entities: ["UK Foreign Office", "Peter Mandelson"],
        eventType: "political",
        primaryImpact: "The development could affect diplomatic credibility and political accountability.",
        affectedMarkets: ["governance credibility", "policy risk"],
        topics: ["politics", "geopolitics"],
        signalStrength: "moderate",
        confidenceScore: 52,
      }),
    );
    const defense = await generateWhyThisMatters(
      createIntelligence({
        id: "defense-swap",
        title: "Google Gemini wins Department of Defense classified prototype contract",
        summary: "The agreement ties Google more closely to sensitive U.S. government AI work.",
        primaryChange: "Google Gemini won a Department of Defense classified prototype contract",
        entities: ["Google", "Department of Defense"],
        eventType: "defense",
        primaryImpact: "The contract could affect defense AI procurement and government platform alignment.",
        affectedMarkets: ["defense posture", "international relations"],
        topics: ["tech", "politics"],
        signalStrength: "strong",
        confidenceScore: 66,
      }),
    );

    expect(funding).not.toBe(political);
    expect(political).not.toBe(defense);
    expect(funding.toLowerCase()).not.toContain("diplomatic credibility");
    expect(political.toLowerCase()).not.toContain("capital availability");
    expect(defense.toLowerCase()).not.toContain("valuation");
  });

  it("uses concise limited-data copy without fallback-style vagueness or finance drift for political stories", async () => {
    const text = await generateWhyThisMatters(
      createIntelligence({
        id: "political-fallback",
        title: "Peter Mandelson failed UK Foreign Office vetting",
        summary: "The setback raises questions about UK diplomatic judgment and political accountability.",
        entities: ["Wait"],
        keyEntities: ["Wait"],
        eventType: "political",
        primaryImpact: "The development could affect diplomatic credibility and political accountability.",
        affectedMarkets: ["governance credibility", "policy risk"],
        topics: ["politics"],
        signalStrength: "weak",
        confidenceScore: 24,
      }),
    );

    expect(text).toMatch(/UK|Peter Mandelson|This political development/);
    expect(text.toLowerCase()).toMatch(/governance|policy risk|political accountability|diplomatic/);
    expect(text.toLowerCase()).not.toMatch(/equities|technology|watch for|early signal|wait matters because wait/);
  });

  it("prevents one fallback opener from dominating an entire low-data batch", async () => {
    const outputs: string[] = [];

    for (const [index, title] of [
      "Startup X raises $8M for warehouse robots",
      "UK minister faces vetting scrutiny",
      "Mortgage demand softens after rate volatility",
      "Product teaser hints at enterprise launch timing",
    ].entries()) {
      outputs.push(
        await generateWhyThisMatters(
          createIntelligence({
            id: `fallback-${index}`,
            title,
            entities: ["Wait"],
            keyEntities: ["Wait"],
            eventType:
              index === 0
                ? "mna_funding"
                : index === 1
                  ? "political"
                  : index === 2
                    ? "macro_market_move"
                    : "product",
            affectedMarkets:
              index === 1 ? ["governance credibility"] : ["adoption"],
            topics: index === 1 ? ["politics"] : ["tech"],
            signalStrength: "weak",
            confidenceScore: 22,
            signals: {
              articleCount: 1,
              sourceDiversity: 1,
              recencyScore: 84,
              velocityScore: 20,
            },
          }),
          { previousOutputs: outputs },
        ),
      );
    }

    const patternKeys = outputs.map((output) => __testing__.getPatternKey(output));
    const highestReuse = Math.max(
      ...patternKeys.map((key) => patternKeys.filter((candidate) => candidate === key).length),
    );

    expect(highestReuse).toBeLessThanOrEqual(2);
    expect(new Set(patternKeys).size).toBeGreaterThan(1);
  });

  it("keeps heuristic outputs anchored to the company when the extracted token is generic", () => {
    const text = generateWhyThisMattersHeuristically(
      createIntelligence({
        title: "Google adds AI Mode to Chrome",
        summary: "The feature extends browser-integrated AI navigation inside Chrome.",
        primaryChange: "Google added AI Mode to Chrome",
        entities: ["Mode"],
        keyEntities: ["Mode"],
        eventType: "product",
        primaryImpact: "The change could alter search behavior and Chrome engagement.",
        affectedMarkets: ["adoption", "competitive feature dynamics"],
        topics: ["tech", "business"],
        signalStrength: "moderate",
        confidenceScore: 63,
      }),
    );

    expect(text.startsWith("Google")).toBe(true);
    expect(text.toLowerCase()).not.toContain("mode could");
    expect(text.toLowerCase()).not.toContain("watch for");
  });

  it("enforces grammar fixes and rejects stray-token subjects", () => {
    const anchor = __testing__.extractPrimaryAnchor(
      createIntelligence({
        title: "Google adds Nano Banana-powered image generation to Gemini",
        entities: ["Google", "Gemini"],
      }),
    );
    const fixed = __testing__.postProcessGrammar("Google matters because changes adoption in Chrome");

    expect(anchor?.label).toBe("Google");
    expect(__testing__.isMeaningfulAnchor("Wait")).toBe(false);
    expect(__testing__.isMeaningfulAnchor("Mode")).toBe(false);
    expect(__testing__.isLowDataScenario(createIntelligence())).toBe(false);
    expect(fixed).toContain("because this changes");
  });
});
