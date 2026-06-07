# Bug fix - Newsletter extractor staged email chrome as story candidates (2026-06-07)

Canonical PRD required: `no` (remediation of an existing system; maps to PRD-61 Newsletter Ingestion).

## Summary

Gmail ingestion was dead 2026-05-18 -> ~06-05 (expired token). After restoration the newsletter leg fetched + extracted again, but it extracted **email chrome** (footers, nav/social CTAs, app-promo buttons, a CAN-SPAM postal address, tracking/redirect links) **as story candidates**. The 2026-06-06 12:00 UTC cron staged 11 newsletter-derived `signal_posts` (ranks 10-20); **all 11** carried `why_it_matters_validation_status='requires_human_rewrite'` with empty `ai_*`/`edited_*` layers - a 100% unpublishable slate. The downstream validator correctly refused to draft on them, but they should never have reached staging.

## Diagnosis (grounded in the real code + prod data)

**Mechanism: heuristic line/block parser**, not LLM. `extractStoriesFromEmail` ([storage.ts:235](../../../src/lib/newsletter-ingestion/storage.ts)) delegates to `parseNewsletterStoriesDetailed` ([parser.ts](../../../src/lib/newsletter-ingestion/parser.ts)): `splitCandidateBlocks` -> `buildStoryFromBlock`, gated by `isLikelyHeadline` + `NOISE_PATTERN` + `classifyUrlForArticleEligibility`. The dry path (`parseNewsletterStories`) shares the same code, so the fix applies to dry runs too.

Real input->output from prod (`newsletter_emails` -> `newsletter_story_extractions`, briefing_date=2026-06-06):

| Email | Staged "headline" (output) | Failure class |
| --- | --- | --- |
| Money Stuff (Bloomberg) | `<https://bloom.bg/3PWd74F>` | bare angle-bracket URL as title |
| Money Stuff | `Follow Us <https://bloom.bg/4nqVBoU> <https://bloom.bg/4k7tEj3>` | social footer CTA |
| Money Stuff | `<https://www.bloomberg.com/account/newsletters/money-stuff?...unsub...>` | subscription-management link |
| Money Stuff | `I discuss the Knicks, the Jeffrey, hedging sports bets with sp` (src=bloom.bg) | teaser fragment |
| 1440 | `1440 Media 222 W Merchandise Mart Plaza, Suite 1212 Chicago, IL 60654` | CAN-SPAM postal address |
| a16z | `} Remote work to my job?; AI SMB Power Users; Lil&#8217; Biotech` | leading-`}` segmentation + undecoded entity |
| a16z | `https://substack.com/redirect/5f115a4c-...` | tracking-redirect URL as title |
| a16z | `READ IN APP (https://open.substack.com/pub/a16z/p/...read-in-app)` | app-promo button |
| a16z | `View this post on the web at https://www.a16z.news/p/...` | boilerplate link line |

### One located cause per failure class

1. **Bare URL / angle-bracket title** - `isLikelyHeadline` ([parser.ts](../../../src/lib/newsletter-ingestion/parser.ts)) had **no check** that a line is not just a URL. `<https://bloom.bg/3PWd74F>` passed (length 12-180, has `[A-Za-z]`, not NOISE) and became a headline. The URL filter (`classifyUrlForArticleEligibility`) was only ever applied to find the *source* URL, **never to the headline**.
2. **Footer/nav/social/app-promo CTAs** - `NOISE_PATTERN` did not include "follow us", "read in app", "view this post on the web", so those lines passed `isLikelyHeadline`.
3. **CAN-SPAM postal address** - no address detection anywhere.
4. **Undecoded entities + leading `}`** - `normalizeText` collapsed whitespace but **never decoded HTML entities** (`&#8217;`, `&#847;`, `&#173;`), and `CSS_AT_RULE_PATTERN` only stripped `@`-rules, so plain selector blocks (`a{...}`, `} blockquote {...}`) survived as text - a dangling `}` became a headline and CSS leaked into snippets.
5. **Tracking / subscription URLs surfaced** - `classifyUrlForArticleEligibility`'s denylist did not cover `bloom.bg`, `*.everestengagement.com`, `substack.com/app-link`, or `/account/newsletters`.

## The two-layer fix (defense in depth)

**Layer 1 - extraction quality** ([parser.ts](../../../src/lib/newsletter-ingestion/parser.ts)):
- `normalizeText` now decodes HTML entities (numeric `&#8217;`/`&#x2019;`, named `&amp;`/`&mdash;`) and strips zero-width preview-padding code points (`&#847;`, `&#173;`).
- `stripInlineCss` now strips plain CSS selector blocks (`selector { ... }`) and leftover stray `}`, not just `@`-rules.
- `isLikelyHeadline` rejects URL-only / angle-bracket-only lines and lines starting with a stray `{`/`}`.
- A new `cleanHeadline` strips any URL/link wrapper glued onto the chosen title (`"Charts of the Week: Retail to the Moon (https://substack.com/redirect/...)"` -> `"Charts of the Week: Retail to the Moon"`).
- URL gate ([url-filtering.ts](../../../src/lib/url-filtering.ts), newsletter-only): added `.everestengagement.com` host + `/app-link` and `/account/newsletters` non-article paths.

**Layer 2 - mechanism-agnostic reject filter** ([chrome-filter.ts](../../../src/lib/newsletter-ingestion/chrome-filter.ts)), applied to the parsed story list before anything is written, **logged with count + per-reason breakdown** (never a silent drop). Rejects a candidate whose title/body is: (a) a bare URL / angle-bracket link, (b) a tracking / shortener / subscription source domain (`bloom.bg`, `substack.com/redirect`, `/app-link`, `/account/newsletters`, `everestengagement.com`), (c) a boilerplate phrase ("Follow Us", "READ IN APP", "View this post on the web at", "Unsubscribe", "Manage preferences", "View in browser", ...), (d) a CAN-SPAM postal address, or (e) below a minimum real-prose threshold.

The downstream `why_it_matters` validator (`requires_human_rewrite`) is unchanged - it stays the last line of defense, and was **not** loosened to compensate.

## Validation

- New `chrome-filter.test.ts` - one case per failure class (a-e) + summary roll-up.
- New `parser.chrome-fixtures.test.ts` - runs the parser on the **actual 2026-06-06 bodies** (captured to `src/lib/newsletter-ingestion/__fixtures__/` via `scripts/capture-newsletter-fixtures.ts`, subscriber email redacted). Asserts: none of the nine reproduction strings survive; no surviving headline is a bare URL / tracking link; Money Stuff (all chrome) -> 0 stories; 1440 no longer stages the postal address; a16z survivors are real (entities decoded, no embedded link); a synthetic pure-chrome email -> empty.
- Existing `parser.test.ts` positive tests (Morning Brew / Semafor / TLDR / AP) still green - the extractor still yields real story units; one synthetic fixture was updated because it encoded the now-fixed "`More: <link>` as headline" behavior.
- Full suite: 920 tests green. Lint + build clean. `dryRun` zero-write contract preserved (chrome filter runs in the in-memory dry path; writes nothing).

## Honesty / scope boundary

This fixes newsletter extraction **QUALITY**. It does **not** fix:
- **RSS Fed-source concentration** - the 06-06 slate had **zero** RSS rows; that is a separate ingestion problem.
- **The 60s cron timeout** - though dropping chrome earlier may modestly reduce the newsletter leg's runtime, this PR does not address the timeout.

A green extractor PR is not "pipeline fixed."
