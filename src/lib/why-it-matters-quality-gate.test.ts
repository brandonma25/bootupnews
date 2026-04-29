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

  it("flags Context WITM with generic macro placeholder copy", () => {
    const result = validateWhyItMatters(
      "Monetary Policy in a Slow (to No) Growth Labor Market, which matters because it gives policymakers and investors a fresh read on individual decision-making. (Signal: Weak)",
      {
        title: "Monetary Policy in a Slow (to No) Growth Labor Market",
        eligibilityTier: "context_signal_eligible",
        contentAccessibility: "full_text_available",
        accessibleTextLength: 8429,
        eventType: "macro_data_release",
      },
    );

    expect(result.passed).toBe(false);
    expect(result.failures).toContain("template_placeholder_language");
  });

  it("passes Context WITM with a specific structural mechanism", () => {
    const result = validateWhyItMatters(
      "The labor-market slowdown matters because it narrows the Federal Reserve's room to hold policy tight without increasing employment risk.",
      {
        title: "Monetary Policy in a Slow (to No) Growth Labor Market",
        eligibilityTier: "context_signal_eligible",
        contentAccessibility: "full_text_available",
        accessibleTextLength: 8429,
        eventType: "macro_data_release",
      },
    );

    expect(result).toEqual({
      passed: true,
      failures: [],
      failureDetails: [],
      recommendedAction: "approve",
    });
  });

  it("flags Context WITM that only repeats the headline", () => {
    const result = validateWhyItMatters(
      "Fed holds rates steady, which matters because Fed holds rates steady.",
      {
        title: "Fed holds rates steady",
        eligibilityTier: "context_signal_eligible",
        contentAccessibility: "full_text_available",
        accessibleTextLength: 1200,
        eventType: "central_bank_policy",
      },
    );

    expect(result.passed).toBe(false);
    expect(result.failures).toContain("summary_only_wording");
  });

  it("flags Core WITM with unsupported structural claims when evidence is thin", () => {
    const result = validateWhyItMatters(
      "The Federal Reserve decision matters because it can reset rate expectations and the cost of capital before the next policy move.",
      {
        title: "Fed Chair Powell holds briefing on interest rate decision",
        eligibilityTier: "core_signal_eligible",
        contentAccessibility: "partial_text_available",
        accessibleTextLength: 178,
        eventType: "central_bank_policy",
      },
    );

    expect(result.passed).toBe(false);
    expect(result.failures).toContain("evidence_accessibility_mismatch");
  });

  it("allows full-text evidence to support stronger Core/Context structural claims", () => {
    const result = validateWhyItMatters(
      "The Federal Reserve labor-market analysis matters because it narrows the rate path by tying employment slack to inflation pressure.",
      {
        title: "Monetary Policy in a Slow Growth Labor Market",
        eligibilityTier: "context_signal_eligible",
        contentAccessibility: "full_text_available",
        accessibleTextLength: 8429,
        eventType: "macro_data_release",
      },
    );

    expect(result.passed).toBe(true);
  });

  it("keeps retrospective Core rows rewrite-required instead of hiding selection weakness with better copy", () => {
    const result = validateWhyItMatters(
      "The SF Fed topic roundup matters because it shows which inflation, labor, and growth questions dominated institutional attention.",
      {
        title: "Economic Letter Countdown: Most Read Topics from 2025",
        eligibilityTier: "core_signal_eligible",
        contentAccessibility: "full_text_available",
        accessibleTextLength: 8129,
        eventType: "macro_data_release",
      },
    );

    expect(result.passed).toBe(false);
    expect(result.failures).toContain("unsupported_structural_claim");
    expect(result.failureDetails).toContain(
      "unsupported_structural_claim: Core WITM is attached to a retrospective or meta-story that needs selection review before publication.",
    );
  });

  it("preserves failure metadata for rewrite-required Context rows", () => {
    const result = validateWhyItMatters(
      "Clean-energy policy matters because markets are watching.",
      {
        title: "Trumps Shady Wind Deals Arent Over Yet",
        eligibilityTier: "context_signal_eligible",
        contentAccessibility: "full_text_available",
        accessibleTextLength: 7932,
        eventType: "mna_funding",
      },
    );

    expect(result.passed).toBe(false);
    expect(result.recommendedAction).toBe("requires_human_rewrite");
    expect(result.failureDetails.length).toBeGreaterThan(0);
  });

  it("does not relax Core/Context standards when weak copy is Depth-only", () => {
    const depthResult = validateWhyItMatters(
      "Source review needed for Fed Chair Powell: partial source text is too short, so the pipeline cannot support a public structural explanation yet.",
      {
        title: "Fed Chair Powell holds briefing on interest rate decision",
        eligibilityTier: "depth_only",
        contentAccessibility: "partial_text_available",
        accessibleTextLength: 178,
        eventType: "central_bank_policy",
      },
    );
    const contextResult = validateWhyItMatters(
      "Source review needed for Fed Chair Powell: partial source text is too short, so the pipeline cannot support a public structural explanation yet.",
      {
        title: "Fed Chair Powell holds briefing on interest rate decision",
        eligibilityTier: "context_signal_eligible",
        contentAccessibility: "partial_text_available",
        accessibleTextLength: 178,
        eventType: "central_bank_policy",
      },
    );

    expect(depthResult.failures).toContain("template_placeholder_language");
    expect(contextResult.failures).toContain("template_placeholder_language");
    expect(contextResult.passed).toBe(false);
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
