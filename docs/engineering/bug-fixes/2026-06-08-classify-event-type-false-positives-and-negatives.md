# classifyEventType both blocks genuine news and promotes weak items — Bug-Fix Record

- **Date:** 2026-06-08
- **PR:** (pending)
- **Branch:** remediation/classify-event-type-correctness
- **Head SHA:** (pending)
- **Merge SHA:** (pending)
- **Related PRD:** PRD-38
- **Object level:** Story Cluster

---

## Symptom

On the live 06-08 dry-run (post #312/#313/#314), publishable was 8 but only ~5 were strong. `classifyEventType` — the event type the core-eligibility gate reads — failed in **both** directions:

- **False positives** (weak items typed as core types, so the importance lift promoted them — the type-based filler check can't catch them because the *wrong type* is what was meant to gate them): an opinion column ("Are AI chatbots making us lose control of our brains?") → `policy_regulation`; DOJ blame-shifting ("Bondi punts blame for the Epstein files") → `public_interest_legal_accountability`; electoral maneuvering ("Maine Dems plot response… Electoral College") → `policy_regulation`; a profile ("What does Josh Gottheimer want now?") → `government_capacity`.
- **False negatives** (genuine news typed non-core → blocked regardless of importance): a bill passing ("House Passes a Bipartisan Package of Bills to Boost Geothermal") → `generic_commentary`; a breach ("The Meta hack shows…") → `generic_commentary`.

## Root cause

`classifyEventType` (`src/lib/signal-filtering.ts`) is an ordered first-match regex map over `title + summary`. It matched **core-type topic keywords appearing anywhere in the body** ("policy", "regulation", "victims", "enforcement", "rules") while having **no detector for the FRAMING** (opinion / think-piece / first-person column, political maneuvering / blame-shifting, profile speculation). So a piece *about* AI policy was typed `policy_regulation`, and a gossip piece mentioning Epstein victims was typed `public_interest_legal_accountability`. Conversely, the core-type rules lacked the vocabulary for two real event classes: legislative passage ("House/Senate passes … bill/package") and security breaches ("hack"/"breach"/"attackers … steal accounts"), so those fell through to `generic_commentary`.

## Blast radius

**Affected:**
- The event type the core-eligibility gate reads (`evaluateSignalSelectionEligibility`). Weak items entered the publishable slate; genuine legislation/security were excluded.

**Not affected:**
- `event_importance` / the ≥52 gate / the `ranked.score` floor / blend weights / the evergreen filter / `inferEventType` — all untouched (per scope). The persisted observability `event_type` column comes from `inferEventType` and is unchanged.

## Fix

Five tightened discriminators in `classifyEventType`, ordered so non-core framing pre-empts the core-type rules:

- `signal-filtering.ts` — **opinion/think-piece/column** framing ("making us lose control", "the case for/against", first-person "I sat down with", "What does X want now?") → `opinion_only`. Tight markers only, so genuine news framed as a question ("Why are interest rates rising?" → `central_bank_policy`) is not swept up.
- `signal-filtering.ts` — **process / maneuvering / gossip** ("plot response", "punts blame", "tit-for-tat", "loyalty test") → `generic_commentary`, before the policy/accountability rules.
- `signal-filtering.ts` — **legislative passage** ("House/Senate passes … bill/package", "signed into law", "enacted", "aid package") → `policy_regulation`.
- `signal-filtering.ts` — **breach/hack** events → `cybersecurity_enforcement` (with a required security-context tail so "growth hack"/"life hack" stay out).
- `signal-filtering.ts` — market-move events (`market rout`, `sell-off`, `stocks plunge/soar`, `$NNNbn rout`) → `macro_market_move`.

## Prevention

Deterministic tests (`signal-filtering.classify-correctness.test.ts`) pin each false-positive pattern → non-core and each false-negative pattern → core, plus controls (genuine question stays core; non-security "hack" stays non-cyber). Validated on the persisted 06-08 fixture (3 false-positives → non-core, Meta-hack → cyber, 0 remaining opinion/gossip in core) and the live dry-run (0 evergreen leaks; #312/#313 lifts intact). Known residual (out of scope, different pattern): the MIT-TR "The Download" newsletter digest remains core-typed — a roundup/digest filter is the next lever, not an event-type discriminator.
