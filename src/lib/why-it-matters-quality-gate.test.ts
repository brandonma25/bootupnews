import { describe, expect, it } from "vitest";

import {
  flagCardForRewrite,
  validateWhyItMatters,
} from "@/lib/why-it-matters-quality-gate";

const AUDIT_CARD_2 =
  "This changes capital availability, competitive positioning, or market structure in AI infrastructure, so it could raise";
const AUDIT_CARD_3 =
  "This changes assumptions about defense posture, state capacity, or international alignment in policy risk and defense posture";
const AUDIT_CARD_4 =
  "This changes how investors price rates, demand, or risk in rates and equities over";
const AUDIT_CARD_5 =
  "Tesla resets the corporate baseline because this changes revenue expectations, so it could move";

describe("why-it-matters quality gate", () => {
  it("flags incomplete sentence output from homepage audit card #5", () => {
    const result = validateWhyItMatters(AUDIT_CARD_5);

    expect(result.passed).toBe(false);
    expect(result.failures).toContain("incomplete_sentence");
    expect(result.failureDetails).toContain(
      'incomplete_sentence: Output does not end with sentence punctuation.',
    );
    expect(result.failureDetails).toContain(
      'incomplete_sentence: Ends with truncation pattern: "so it could move"',
    );
  });

  it("flags template placeholder language from homepage audit card #3", () => {
    const result = validateWhyItMatters(AUDIT_CARD_3);

    expect(result.passed).toBe(false);
    expect(result.failures).toContain("template_placeholder_language");
    expect(result.failureDetails).toContain(
      'template_placeholder_language: Contains template placeholder phrase: "changes assumptions about"',
    );
  });

  it("flags unresolved template variables as placeholder language", () => {
    const result = validateWhyItMatters(
      "Google changes the [category] baseline because {actor} can move {{market_structure}} expectations.",
    );

    expect(result.passed).toBe(false);
    expect(result.failures).toContain("template_placeholder_language");
    expect(result.failureDetails).toEqual(
      expect.arrayContaining([
        'template_placeholder_language: Contains unresolved template variable: "[category]"',
        'template_placeholder_language: Contains unresolved template variable: "{actor}"',
        'template_placeholder_language: Contains unresolved template variable: "{{market_structure}}"',
      ]),
    );
  });

  it("flags dangling comparison endings as incomplete generated copy", () => {
    const result = validateWhyItMatters(
      "How is not a market-moving development because it shifts expectations rather than.",
    );

    expect(result.passed).toBe(false);
    expect(result.failures).toContain("incomplete_sentence");
    expect(result.failureDetails).toContain(
      'incomplete_sentence: Ends with dangling comparison phrase: "rather than"',
    );
  });

  it("flags malformed title/subject starts from generated copy", () => {
    const results = [
      validateWhyItMatters(
        "Chinas matters for chip supply because Taiwan risk now shapes trade planning.",
      ),
      validateWhyItMatters(
        "Can gives OpenAI a procurement signal because Microsoft and Google now shape the buying cycle.",
      ),
      validateWhyItMatters(
        "How is not a market-moving development because Amazon and Google already set the infrastructure baseline.",
      ),
    ];

    for (const result of results) {
      expect(result.passed).toBe(false);
      expect(result.failures).toContain("template_placeholder_language");
    }
  });

  it("flags abstract variable lists from homepage audit card #2", () => {
    const result = validateWhyItMatters(AUDIT_CARD_2);

    expect(result.passed).toBe(false);
    expect(result.failures).toContain("abstract_variable_list");
    expect(result.failureDetails).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          "capital availability, competitive positioning, or market structure",
        ),
      ]),
    );
  });

  it("flags minimum specificity failures with no concrete noun", () => {
    const result = validateWhyItMatters(
      "This development matters because it reshapes expectations across the market.",
    );

    expect(result.passed).toBe(false);
    expect(result.failures).toEqual(["minimum_specificity"]);
    expect(result.recommendedAction).toBe("requires_human_rewrite");
  });

  it("does not treat generic acronyms as named specificity", () => {
    const result = validateWhyItMatters(
      "AI infrastructure changes market expectations because demand, pricing, and risk are shifting.",
    );

    expect(result.passed).toBe(false);
    expect(result.failures).toContain("minimum_specificity");
  });

  it("passes the final Anthropic why-it-matters rewrite", () => {
    const result = validateWhyItMatters(
      "Anthropic's growth is now structurally tied to Google and Amazon's infrastructure — not independent of it. At scale, that's a dependency, not just a partnership.",
    );

    expect(result).toEqual({
      passed: true,
      failures: [],
      failureDetails: [],
      recommendedAction: "approve",
    });
  });

  it("flags generic not-market-moving fallback copy as non-publishable", () => {
    const examples = [
      "ProPublica's Purdue settlement story is not a market-moving development, but it may still matter for individual readers.",
      "AI data centers are not market-moving for individual decision-making, while market-wide pricing is unchanged.",
      "Bessent's dollar swap comments are mainly useful for individual readers rather than a structural market signal.",
    ];

    for (const example of examples) {
      const result = validateWhyItMatters(example);
      expect(result.passed).toBe(false);
      expect(result.failures).toContain("template_placeholder_language");
      expect(result.recommendedAction).toBe("requires_human_rewrite");
    }
  });

  it("flags source-review and editorial-review fallback copy as rewrite-required", () => {
    const examples = [
      "Source review needed for BLS: only metadata is available, so the pipeline cannot support a public structural explanation yet.",
      "Editorial review needed for MarketWatch advice: the item does not yet show a structural change beyond the immediate update.",
    ];

    for (const example of examples) {
      const result = validateWhyItMatters(example);
      expect(result.passed).toBe(false);
      expect(result.failures).toContain("template_placeholder_language");
    }
  });

  it("flags multiple homepage audit failure modes simultaneously from card #4", () => {
    const result = validateWhyItMatters(AUDIT_CARD_4);

    expect(result.passed).toBe(false);
    expect(result.failures).toEqual(
      expect.arrayContaining([
        "incomplete_sentence",
        "template_placeholder_language",
        "abstract_variable_list",
        "minimum_specificity",
      ]),
    );
    expect(result.recommendedAction).toBe("requires_human_rewrite");
  });

  it("attaches rewrite status and failure reasons without throwing", () => {
    const card = flagCardForRewrite({
      id: "signal-4",
      aiWhyItMatters: AUDIT_CARD_4,
    });

    expect(card.reviewStatus).toBe("requires_human_rewrite");
    expect(card.whyItMattersValidation.passed).toBe(false);
    expect(card.reviewFailureReasons.length).toBeGreaterThan(1);
  });
});
