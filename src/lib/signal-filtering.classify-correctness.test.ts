import { describe, expect, it } from "vitest";

import { classifyEventType, type EventType } from "@/lib/signal-filtering";

/**
 * Remediation: classifyEventType was failing in BOTH directions against the
 * core-eligibility gate — typing weak items (opinion / gossip / maneuvering) as
 * core types (so importance lifted them in), and typing genuine legislation /
 * security events as generic_commentary (so they were blocked regardless of
 * importance). These tests pin the corrected discriminators.
 */
const CORE = new Set<EventType>([
  "policy_regulation", "government_capacity", "public_interest_legal_accountability",
  "platform_regulation", "macro_data_release", "central_bank_policy",
  "ai_infrastructure_policy", "cybersecurity_enforcement", "institutional_governance",
  "earnings_financials", "mna_funding", "geopolitics", "executive_change_strategic",
  "legal_investigation", "supply_chain_disruption", "macro_market_move",
]);

const type = (title: string, summaryText = "") =>
  classifyEventType({ title, summaryText, topicName: null });

describe("classifyEventType — FALSE POSITIVES no longer get core types", () => {
  it("opinion/think-piece framing → opinion_only (not policy_regulation)", () => {
    const t = type(
      "Are AI chatbots making us lose control of our brains?",
      "This week I've been at SXSW. I sat down with a psychologist on how AI policy and regulation shape attention.",
    );
    expect(t).toBe("opinion_only");
    expect(CORE.has(t)).toBe(false);
  });

  it("blame-shifting gossip → generic_commentary (not public_interest_legal_accountability)", () => {
    const t = type(
      "Bondi punts blame for the Epstein files to Todd Blanche",
      "Bondi told Congress the Epstein files; victims and enforcement were discussed.",
    );
    expect(CORE.has(t)).toBe(false);
  });

  it("political maneuvering → generic_commentary (not policy_regulation)", () => {
    const t = type(
      "Maine Dems plot response if Nebraska GOP tweaks Electoral College votes",
      "Tit-for-tat: changes to the rules and election policy could follow.",
    );
    expect(CORE.has(t)).toBe(false);
  });

  it("profile/ambition speculation ('What does X want now?') → opinion_only", () => {
    const t = type("What does Josh Gottheimer want now?", "A profile of the congressman amid shutdown talks and resignations.");
    expect(t).toBe("opinion_only");
    expect(CORE.has(t)).toBe(false);
  });
});

describe("classifyEventType — FALSE NEGATIVES now get the correct core type", () => {
  it("a bill passing → policy_regulation", () => {
    expect(type("House Passes a Bipartisan Package of Bills to Boost Geothermal", "Lawmakers backed the bills."))
      .toBe("policy_regulation");
    // "enforcement" routes this to public_interest_legal_accountability first — also core, which is what the gate needs.
    expect(CORE.has(type("Senate passes immigration enforcement bill"))).toBe(true);
  });

  it("a breach/hack → cybersecurity_enforcement", () => {
    expect(type("The Meta hack shows there's more to AI security", "Attackers used the agent to steal accounts."))
      .toBe("cybersecurity_enforcement");
    expect(type("Major data breach exposes millions of records")).toBe("cybersecurity_enforcement");
  });
});

describe("classifyEventType — NO REGRESSION + tight discriminators", () => {
  it("keeps the #312/#313 lifts core-typed", () => {
    expect(type("Israel and Iran trade air strikes as ceasefire falters")).toBe("geopolitics");
    expect(CORE.has(type("Ukraine aid package passes House", "military assistance package passed the House"))).toBe(true);
    expect(CORE.has(type("Broadcom suffers $300bn rout as revenue outlook disappoints"))).toBe(true);
    expect(type("SpaceX pitches investors $1.78tn valuation in historic IPO")).toBe("mna_funding");
  });

  it("does NOT block genuine news framed as a question", () => {
    expect(type("Why are interest rates rising again?", "The Federal Reserve signaled higher rates."))
      .toBe("central_bank_policy");
  });

  it("does NOT type a non-security 'hack' as cybersecurity", () => {
    expect(type("This productivity hack will change your mornings", "A simple life hack."))
      .not.toBe("cybersecurity_enforcement");
  });
});
