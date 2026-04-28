import { describe, expect, it } from "vitest";

import {
  __testing__,
  buildTrustLayerPresentation,
  generateWhyThisMatters,
  generateWhyThisMattersHeuristically,
  isUsableWhyItMattersText,
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

  it("grounds heuristic output in source coverage, ranking reason, and key entities", () => {
    const text = generateWhyThisMattersHeuristically(
      createIntelligence({
        title: "Google adds AI Mode to Chrome",
        summary: "The feature extends browser-integrated AI navigation inside Chrome.",
        primaryChange: "Google added AI Mode to Chrome",
        entities: ["Google", "Chrome"],
        keyEntities: ["Google", "Chrome"],
        eventType: "product",
        affectedMarkets: ["adoption", "competitive feature dynamics"],
        rankingReason: "Broad coverage centered on Chrome's AI-assisted browsing changes.",
        signals: {
          articleCount: 4,
          sourceDiversity: 3,
          recencyScore: 88,
          velocityScore: 74,
        },
      }),
    );

    expect(text.toLowerCase()).toContain("evidence:");
    expect(text).toContain("4 articles/3 sources");
    expect(text).toContain("Google/Chrome");
  });

  it("rejects malformed why-it-matters text that just repeats the summary", () => {
    expect(
      isUsableWhyItMattersText("Lead summary", {
        title: "Lead story",
        whatHappened: "Lead summary",
      }),
    ).toBe(false);

    expect(
      isUsableWhyItMattersText(
        "Google's browser update matters because 4 articles from 3 sources tie Google and Chrome to a change in browsing behavior.",
        {
          title: "Google adds AI Mode to Chrome",
          whatHappened: "The feature extends browser-integrated AI navigation inside Chrome.",
        },
      ),
    ).toBe(true);
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

  it("rejects pronoun anchors and falls back to a safe event phrase", async () => {
    const text = await generateWhyThisMatters(
      createIntelligence({
        title: "She says the White House should revisit chip export policy",
        summary: "The commentary raises a policy question but does not provide a valid named subject anchor.",
        entities: ["She"],
        keyEntities: ["She"],
        eventType: "policy_regulation",
        primaryImpact: "The policy discussion could alter export-control expectations.",
        affectedMarkets: ["policy-sensitive sectors"],
        topics: ["politics", "tech"],
        signalStrength: "weak",
        confidenceScore: 30,
      }),
    );

    expect(text.startsWith("This policy move") || text.startsWith("White House")).toBe(true);
    expect(text.startsWith("She")).toBe(false);
  });

  it("reduces malformed entity phrases to a clean subject anchor", async () => {
    const anchor = __testing__.extractPrimaryAnchor(
      createIntelligence({
        title: "Trump Urges Extending Foreign Surveillance Powers",
        summary: "The policy push could revive debate around surveillance oversight and executive priorities.",
        entities: ["Trump Urges Extending Foreign Surveillance"],
        keyEntities: ["Trump Urges Extending Foreign Surveillance"],
        eventType: "policy_regulation",
        affectedMarkets: ["policy risk"],
        topics: ["politics"],
        signalStrength: "moderate",
        confidenceScore: 48,
      }),
    );
    const text = await generateWhyThisMatters(
      createIntelligence({
        title: "Trump Urges Extending Foreign Surveillance Powers",
        summary: "The policy push could revive debate around surveillance oversight and executive priorities.",
        entities: ["Trump Urges Extending Foreign Surveillance"],
        keyEntities: ["Trump Urges Extending Foreign Surveillance"],
        eventType: "policy_regulation",
        affectedMarkets: ["policy risk"],
        topics: ["politics"],
        signalStrength: "moderate",
        confidenceScore: 48,
      }),
    );

    expect(anchor?.label).toBe("Trump");
    expect(text).toContain("Trump");
    expect(text).not.toContain("Trump Urges Extending");
  });

  it("keeps same-entity product cards differentiated by headline delta", async () => {
    const previousOutputs: string[] = [];
    const browsing = await generateWhyThisMatters(
      createIntelligence({
        id: "google-browse",
        title: "Google AI Mode changes browsing behavior in Chrome",
        summary: "The update pushes more AI-guided navigation inside Chrome.",
        primaryChange: "Google changed browsing behavior in Chrome with AI Mode",
        entities: ["Google"],
        keyEntities: ["Google"],
        eventType: "product",
        affectedMarkets: ["adoption", "user behavior", "competitive feature dynamics"],
        topics: ["tech"],
        signalStrength: "moderate",
        confidenceScore: 55,
        rankingReason: "Coverage focused on browsing behavior changes inside Chrome.",
      }),
      { previousOutputs },
    );
    previousOutputs.push(browsing);

    const links = await generateWhyThisMatters(
      createIntelligence({
        id: "google-links",
        title: "Google AI Mode changes how users open links in Chrome",
        summary: "The product change alters link interaction inside AI-assisted browsing flows.",
        primaryChange: "Google changed how users open links in Chrome with AI Mode",
        entities: ["Google"],
        keyEntities: ["Google"],
        eventType: "product",
        affectedMarkets: ["adoption", "user behavior", "competitive feature dynamics"],
        topics: ["tech"],
        signalStrength: "moderate",
        confidenceScore: 55,
        rankingReason: "Coverage focused on how Chrome users open links inside AI Mode.",
      }),
      { previousOutputs },
    );

    expect(browsing).not.toBe(links);
    expect(browsing.toLowerCase()).toContain("browsing");
    expect(links.toLowerCase()).toMatch(/link|links/);
    expect(__testing__.similarityScore(browsing, links)).toBeLessThan(0.8);
  });

  it("keeps non-signal advice stories out of policy or market framing", async () => {
    const text = await generateWhyThisMatters(
      createIntelligence({
        title: "MarketWatch advice column: Should I refinance before retirement?",
        summary: "A personal finance Q&A about mortgage decisions for retirees.",
        primaryChange: "A MarketWatch advice column discussed refinancing before retirement",
        entities: ["MarketWatch"],
        keyEntities: ["MarketWatch"],
        eventType: "non_signal",
        affectedMarkets: ["individual decision-making"],
        topics: ["finance"],
        signalStrength: "weak",
        confidenceScore: 18,
      }),
    );

    expect(text.toLowerCase()).toContain("editorial review needed");
    expect(text.toLowerCase()).toContain("does not yet show a structural change");
    expect(text.toLowerCase()).not.toContain("not a market-moving development");
    expect(text.toLowerCase()).not.toMatch(/policy risk|valuation|equities/);
  });

  it("generates legal-accountability WITM from the actual actor and event", async () => {
    const text = await generateWhyThisMatters(
      createIntelligence({
        title: "Politico: prediction-market operators face violations tied to election contracts",
        summary: "Regulators alleged prediction-market operators mishandled election-contract compliance.",
        primaryChange: "Prediction-market operators faced regulatory violations tied to election contracts",
        entities: ["Politico", "prediction-market operators"],
        keyEntities: ["prediction-market operators"],
        eventType: "public_interest_legal_accountability",
        affectedMarkets: ["prediction markets", "election contracts"],
        topics: ["finance", "politics"],
        signalStrength: "moderate",
        confidenceScore: 62,
      }),
    );

    expect(text).toContain("Prediction-market violations are stacking up");
    expect(text.toLowerCase()).toContain("accountability");
    expect(text.toLowerCase()).not.toMatch(/paris matters|defense and international relations|not market-moving/);
  });

  it("keeps government-capacity WITM out of generic regulation-list language", async () => {
    const text = await generateWhyThisMatters(
      createIntelligence({
        title: "TSA officers quit amid shutdown pressure",
        summary: "Staffing attrition raised questions about airport screening capacity.",
        primaryChange: "TSA officers quit amid shutdown pressure",
        entities: ["TSA"],
        keyEntities: ["TSA"],
        eventType: "government_capacity",
        affectedMarkets: ["airport screening", "federal services"],
        topics: ["politics"],
        signalStrength: "moderate",
        confidenceScore: 58,
      }),
    );

    expect(text).toContain("TSA attrition is rising during the shutdown");
    expect(text.toLowerCase()).toContain("public institutions");
    expect(text.toLowerCase()).not.toMatch(/regulation, compliance|market-access assumptions/);
  });

  it("keeps generated card WITM under the explanation packet clipping limit", () => {
    const body = buildTrustLayerPresentation(
      createIntelligence({
        title: "Over 1,000 TSA officers have quit amid shutdown",
        summary: "Staffing attrition raised questions about airport screening capacity.",
        primaryChange: "Over 1,000 TSA officers have quit amid shutdown",
        entities: ["TSA"],
        keyEntities: ["TSA"],
        eventType: "government_capacity",
        affectedMarkets: ["airport screening", "federal services"],
        topics: ["politics"],
        signalStrength: "moderate",
        confidenceScore: 58,
        signals: {
          articleCount: 1,
          sourceDiversity: 1,
          recencyScore: 86,
          velocityScore: 20,
        },
      }),
      {
        title: "Over 1,000 TSA officers have quit amid shutdown",
        topicName: "Politics",
        eventTypeOverride: "government_capacity",
        contentAccessibility: "full_text_available",
        accessibleTextLength: 1552,
      },
    ).body;

    expect(body.length).toBeLessThanOrEqual(220);
    expect(body).not.toContain("...");
  });

  it("preserves numeric thousands separators when composing WITM copy", async () => {
    const text = await generateWhyThisMatters(
      createIntelligence({
        title: "Over 1,000 TSA officers have quit amid shutdown",
        summary: "Staffing attrition raised questions about airport screening capacity.",
        primaryChange: "Over 1,000 TSA officers have quit amid shutdown",
        entities: ["TSA"],
        keyEntities: ["TSA"],
        eventType: "government_capacity",
        affectedMarkets: ["airport screening", "federal services"],
        topics: ["politics"],
        signalStrength: "moderate",
        confidenceScore: 58,
      }),
    );

    expect(text).not.toContain("1, 000");
  });

  it("frames EU Google Android AI intervention as platform regulation, not defense", async () => {
    const text = await generateWhyThisMatters(
      createIntelligence({
        title: "EU intervenes in Google Android AI distribution rules",
        summary: "European regulators scrutinized how Google distributes AI features through Android.",
        primaryChange: "EU intervened in Google Android AI distribution rules",
        entities: ["EU", "Google", "Android"],
        keyEntities: ["EU", "Google"],
        eventType: "platform_regulation",
        affectedMarkets: ["Android distribution", "AI market access"],
        topics: ["tech", "policy"],
        signalStrength: "strong",
        confidenceScore: 69,
      }),
    );

    expect(text).toMatch(/EU|Google/);
    expect(text.toLowerCase()).toContain("distribution");
    expect(text.toLowerCase()).toContain("market access");
    expect(text.toLowerCase()).not.toMatch(/defense|international relations/);
  });

  it("uses PRD-13 event-type override when eligibility classification is more precise than event intelligence", () => {
    const trustLayer = buildTrustLayerPresentation(
      createIntelligence({
        title: "EU tells Google to open up AI on Android",
        summary: "The story was initially inferred as geopolitical because it mentioned international regulators.",
        primaryChange: "EU told Google to open up AI on Android",
        entities: ["EU", "Google", "Android"],
        keyEntities: ["EU", "Google"],
        eventType: "defense",
        affectedMarkets: ["Android distribution", "AI market access"],
        topics: ["tech", "policy"],
      }),
      {
        title: "EU tells Google to open up AI on Android",
        topicName: "Tech",
        eventTypeOverride: "platform_regulation",
        contentAccessibility: "full_text_available",
        accessibleTextLength: 1400,
      },
    );

    expect(trustLayer.body.toLowerCase()).toContain("distribution");
    expect(trustLayer.body.toLowerCase()).toContain("market access");
    expect(trustLayer.body.toLowerCase()).not.toMatch(/defense|national-security|alliance/);
  });

  it("does not overclaim when source accessibility is metadata-only", async () => {
    const text = await generateWhyThisMatters(
      createIntelligence({
        title: "BLS releases routine labor productivity table",
        summary: "A metadata-only feed item named the release but did not expose body text.",
        primaryChange: "BLS released a routine labor productivity table",
        entities: ["BLS"],
        keyEntities: ["BLS"],
        eventType: "macro_data_release",
        affectedMarkets: ["labor productivity"],
        topics: ["finance"],
      }),
      {
        contentAccessibility: "metadata_only",
        accessibleTextLength: 0,
      },
    );

    expect(text.toLowerCase()).toContain("source review needed");
    expect(text.toLowerCase()).toContain("only metadata is available");
    expect(text.toLowerCase()).not.toContain("fresh read on labor");
  });

  it("keeps non-fallback outputs subject-first without hedge prefixes", async () => {
    const text = await generateWhyThisMatters(
      createIntelligence({
        title: "Madison Air files for IPO",
        summary: "The filing gives investors an early look at the HVAC supplier's growth plans.",
        primaryChange: "Madison Air filed for an IPO",
        entities: ["Madison Air"],
        keyEntities: ["Madison Air"],
        eventType: "mna_funding",
        affectedMarkets: ["competition", "market structure"],
        topics: ["business"],
        signalStrength: "moderate",
        confidenceScore: 51,
      }),
    );

    expect(text.startsWith("Madison Air")).toBe(true);
    expect(text.startsWith("It is")).toBe(false);
    expect(text.startsWith("This is")).toBe(false);
  });

  it("rejects role-word anchors like CEO", async () => {
    const text = await generateWhyThisMatters(
      createIntelligence({
        title: "CEO departs after board review at Adobe",
        summary: "Adobe said its chief executive will leave after a board review.",
        entities: ["CEO", "Adobe"],
        keyEntities: ["CEO", "Adobe"],
        eventType: "executive_move",
        affectedMarkets: ["strategy", "leadership credibility"],
        topics: ["business", "tech"],
        signalStrength: "weak",
        confidenceScore: 42,
      }),
    );

    expect(text.startsWith("Adobe")).toBe(true);
    expect(text.startsWith("CEO")).toBe(false);
  });

  it("rejects US as a weak subject when a better entity exists", async () => {
    const text = await generateWhyThisMatters(
      createIntelligence({
        title: "Adobe signs software deal with U.S. agencies",
        summary: "The agreement expands Adobe's government footprint.",
        entities: ["US", "Adobe"],
        keyEntities: ["US", "Adobe"],
        eventType: "corporate",
        affectedMarkets: ["financials"],
        topics: ["business", "tech"],
        signalStrength: "weak",
        confidenceScore: 44,
      }),
    );

    expect(text.startsWith("Adobe")).toBe(true);
    expect(text.startsWith("US")).toBe(false);
  });

  it("keeps AI startup funding out of housing or macro language", async () => {
    const text = await generateWhyThisMatters(
      createIntelligence({
        title: "InsightFinder raises $15M to help companies monitor AI agents",
        summary: "The startup raised funding to expand its AI reliability platform.",
        entities: ["InsightFinder"],
        keyEntities: ["InsightFinder"],
        eventType: "early_stage_funding",
        affectedMarkets: ["startup competition", "capital formation"],
        topics: ["tech", "business"],
        signalStrength: "weak",
        confidenceScore: 46,
      }),
    );

    expect(text.toLowerCase()).toMatch(/capital|ecosystem|startup|competition/);
    expect(text.toLowerCase()).not.toMatch(/housing|mortgage|rates|inflation/);
  });

  it("blocks housing-domain contamination from non-macro stories", async () => {
    const text = await generateWhyThisMatters(
      createIntelligence({
        title: "InsightFinder raises $15M to help companies monitor AI agents",
        summary:
          "The startup raised funding to expand its AI reliability platform. Mortgage markets were unchanged.",
        primaryChange: "InsightFinder raised $15M to expand its AI reliability platform",
        entities: ["InsightFinder"],
        keyEntities: ["InsightFinder"],
        eventType: "early_stage_funding",
        affectedMarkets: ["startup competition", "capital formation"],
        topics: ["tech", "business"],
        signalStrength: "weak",
        confidenceScore: 46,
      }),
    );

    expect(text.toLowerCase()).not.toContain("how borrowing conditions feed into housing demand");
    expect(text.toLowerCase()).not.toMatch(/housing demand|mortgage/);
  });

  it("differentiates funding and IPO explanations", async () => {
    const funding = await generateWhyThisMatters(
      createIntelligence({
        id: "funding-diff",
        eventType: "early_stage_funding",
        affectedMarkets: ["startup competition", "capital formation"],
        entities: ["InsightFinder"],
        keyEntities: ["InsightFinder"],
      }),
    );
    const ipo = await generateWhyThisMatters(
      createIntelligence({
        id: "ipo-diff",
        title: "Madison Air files for IPO",
        summary: "The filing gives investors an early look at the HVAC supplier's growth plans.",
        primaryChange: "Madison Air filed for an IPO",
        entities: ["Madison Air"],
        keyEntities: ["Madison Air"],
        eventType: "large_ipo",
        affectedMarkets: ["ipo demand", "valuation"],
        topics: ["business"],
        signalStrength: "weak",
        confidenceScore: 48,
      }),
    );

    expect(funding.toLowerCase()).toMatch(/capital|startup|ecosystem/);
    expect(ipo.toLowerCase()).toMatch(/ipo|valuation|public-market/);
    expect(funding).not.toBe(ipo);
  });

  it("deduplicates repeated clauses inside one sentence", () => {
    const cleaned = __testing__.dedupeRepeatedClauses(
      "Adobe changes demand assumptions, Adobe changes demand assumptions, so it could move expectations.",
    );

    expect(cleaned).toBe("Adobe changes demand assumptions, so it could move expectations.");
  });

  it("removes repeated market phrases inside one sentence", () => {
    const cleaned = __testing__.dedupeRepeatedClauses(
      "Adobe changes demand assumptions in equities and technology, so it could move expectations in equities and technology.",
    );

    expect(cleaned).toBe(
      "Adobe changes demand assumptions in equities and technology, so it could move expectations.",
    );
  });

  it("falls back from malformed headline fragments like House Effort", async () => {
    const text = await generateWhyThisMatters(
      createIntelligence({
        title: "House Effort to tighten chip export rules advances",
        summary: "Lawmakers are moving a new policy effort tied to export controls.",
        entities: ["House Effort"],
        keyEntities: ["House Effort"],
        eventType: "policy_regulation",
        affectedMarkets: ["policy-sensitive sectors"],
        topics: ["politics", "tech"],
        signalStrength: "weak",
        confidenceScore: 35,
      }),
    );

    expect(text.startsWith("The House vote") || text.startsWith("This policy move")).toBe(true);
    expect(text.startsWith("House Effort")).toBe(false);
  });

  it("keeps sentence ordering as subject to mechanism to impact", async () => {
    const text = await generateWhyThisMatters(
      createIntelligence({
        title: "Adobe says AI retail traffic rose 393% in Q1",
        summary: "The company says AI traffic growth is lifting retailer revenue expectations.",
        primaryChange: "Adobe said AI retail traffic rose 393% in Q1",
        entities: ["Adobe"],
        keyEntities: ["Adobe"],
        eventType: "data_report",
        affectedMarkets: ["demand", "expectations"],
        topics: ["tech", "business"],
        signalStrength: "weak",
        confidenceScore: 49,
      }),
    );

    const normalized = text.toLowerCase();
    expect(normalized).toContain("because");
    expect(normalized).not.toContain("so it could");
    expect(normalized.indexOf("adobe")).toBeLessThan(normalized.indexOf("because"));
  });
});
