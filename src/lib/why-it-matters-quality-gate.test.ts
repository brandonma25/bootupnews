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
