# Source Health Summary — 2026-05-21

Window: last 7 days (since 2026-05-15). Compiled from Sentry issues
[BOOT-UP-WEB-1](https://boot-up.sentry.io/issues/BOOT-UP-WEB-1),
[BOOT-UP-WEB-2](https://boot-up.sentry.io/issues/BOOT-UP-WEB-2),
[BOOT-UP-WEB-4](https://boot-up.sentry.io/issues/BOOT-UP-WEB-4),
[BOOT-UP-WEB-5](https://boot-up.sentry.io/issues/BOOT-UP-WEB-5),
and Supabase `signal_posts` snapshot pre-/post- migration
`20260521120000_cron_runs_and_source_url_idempotency.sql`.

> **Source of truth going forward:** the Notion Source Health Log database.
> Regenerate this report any time with
> `NOTION_TOKEN=… NOTION_SOURCE_HEALTH_LOG_DB_ID=… npm run source-health:summary -- --days 7 --out docs/engineering/reports/source-health-summary-YYYY-MM-DD.md`
> (script at [`scripts/source-health-summary.ts`](../../../scripts/source-health-summary.ts)).
> This first snapshot is hand-compiled because PR #261 is the change that adds
> the script + the `junk_filtered` outcome the script reports on.

## Chronic feed failures (Branch B / RSS)

| Source | Symptom | Sentry | First seen | Last seen | Status |
| --- | --- | --- | --- | --- | --- |
| Reuters Business | "Feed request retry exhausted: fetch failed" — recurring network timeout | [BOOT-UP-WEB-1](https://boot-up.sentry.io/issues/BOOT-UP-WEB-1) (33 events) | 2026-05-12 | 2026-05-18 | Open — needs upstream check, possibly IP-blocked from IAD1 |
| Foreign Affairs | HTTP 403 on `https://www.foreignaffairs.com/rss.xml` | [BOOT-UP-WEB-2](https://boot-up.sentry.io/issues/BOOT-UP-WEB-2) (2 events) | 2026-05-15 | 2026-05-20 | This PR ships a browser-shaped UA + `Accept` / `Accept-Language` headers. If 403 persists ≥3 days post-deploy, mark `source-foreign-affairs` inactive in `src/lib/source-manifest.ts` (the source is `mvpDefaultAllowed: false`, so dropping it costs nothing for the public surface). |
| France24 | sax-js "Attribute without value" parse error | [BOOT-UP-WEB-5](https://boot-up.sentry.io/issues/BOOT-UP-WEB-5) (1 event) | 2026-05-21 | 2026-05-21 | This PR ships `xml2js: { strict: false }` tolerant parsing on the shared `rss-parser` instance. |

The per-feed try/catch in `src/lib/pipeline/ingestion/index.ts:270` was already in place; the
asymmetric Sentry severity (inner capture in `rss.ts` at default `error`, outer capture in
ingestion at `warning`) was producing duplicate events at differing levels. This PR aligns
both surfaces at `level: "warning"` so failed feeds are advisory, not page-out-able.

## Newsletter parser junk-URL rejections (Branch C)

The 2026-05-17 garbage rows on Supabase `signal_posts` (the 7 rows deduped by migration
`20260521120000`) were not articles. The parser was harvesting:

| Sender | Junk pattern | Rejections (estimated for 2026-05-17) |
| --- | --- | --- |
| `Axios AM` (`static.axios.com` via inline CSS) | `@font-face { src: url('…woff2') … }` blocks parsed as candidate story URLs | 5 distinct webfont assets × 2 weights = 10 rejections (4 stored as signal_posts, 6 stored as `newsletter_story_extractions` only) |
| `POLITICO Playbook PM` | Sailthru `/ss/c/` click-redirector wrappers (`url4027.email.politico.com/ss/c/…`) | 3 unique trackers stored as signal_posts; 4 unique trackers in `newsletter_story_extractions` |

Counts will be exact in subsequent reports because this PR adds the
`junk_filtered` Source Health Log outcome that records per-source counts each
run.

### Filter coverage going forward

`src/lib/url-filtering.ts` (new) rejects URLs by:

- **Asset extensions** — `.woff`/`.woff2`/`.ttf`/`.eot`/`.otf`/`.css`/`.js`/`.json`/`.xml`/`.png`/`.jpg`/`.jpeg`/`.gif`/`.svg`/`.ico`/`.webp`/`.bmp`/`.tif`/`.tiff`/`.pdf`/`.zip`/`.tar`/`.gz`/`.mp3`/`.mp4`/`.m4a`/`.wav`/`.ogg`/`.flac`/`.avi`/`.mov`/`.mkv`/`.webm`.
- **Tracking hosts** — `email.politico.com`, `.sailthru.com`, `.list-manage.com`, `.lpages.co`, `cl.s2.exct.net`, `click.convertkit-mail`, `link.mail.beehiiv.com`, `url.s.tbsfact.com`, `track.constantcontact.com`, `click.mailchimpapp.com`, `ctrk.klclick.com`, `.rs6.net`.
- **Marketing subdomains** — `url\d+\.email\.*`, `email.*`, `links?.*` (with allow-list for legit `links.youtube.*` etc.), `mail.*`, `e.*`.
- **Non-article paths** — `/ss/c/`, `/click/`, `/redirect`, `/redir/`, `/unsubscribe`, `/preferences`, `/manage-subscription`, `/email-preferences`, `/optout`, `/track?`, `/track/`, `/pixel?`.

Plus the newsletter parser now strips `<style>…</style>` and raw `@font-face` /
`@media` / `@import` at-rules from the raw body before block-splitting, so CSS
source no longer becomes story content even if a filter pattern doesn't match
the asset URL.

## Cron `<5 items` errors (downstream symptom)

| Date | Source | Symptom | Action |
| --- | --- | --- | --- |
| 2026-05-20 | `/api/cron/fetch-news` | "Cron run produced 4 ranked briefing items; at least five are required for editorial review." | [BOOT-UP-WEB-4](https://boot-up.sentry.io/issues/BOOT-UP-WEB-4) (1 event). This PR softens the floor to ≥1; runs of 1–6 items are now "degraded" (still ship, email subject is tagged `[DEGRADED N/7]`). Hard error only on 0 items. |

## Open (out of scope for this PR)

- **BOOT-UP-WEB-3** "Connection closed" on `/` — homepage Supabase-connection issue. Per the
  brief, triaged separately; this PR does not resolve it.
- **Reuters Business** [BOOT-UP-WEB-1] — chronic network timeouts. Likely IP-range blocking
  from Vercel IAD1 (Cloudflare gating); fix candidates include rotating egress, a residential
  proxy, or marking the source `active_optional` and accepting the drop on those days.

## Reading the per-run Notion Source Health Log

After this PR deploys, every ingestion run will produce ≤ 1 row per (Source, Date) in the
Notion DB. Outcomes:

- `success` — fetch + parse + at least one story extracted. Increments **Success Count**.
- `fail` — fetch or parse fully failed. Increments **Fail Count** and feeds the circuit breaker (3 fails in one day ⇒ next day's run is skipped).
- `junk_filtered` — the URL filter rejected N candidate URLs as non-articles. **Does NOT** increment either counter; the count + reason breakdown lives in the **Notes** field.
- `skipped_circuit_breaker` — we deliberately skipped the fetch because the breaker had already tripped earlier today. **Does NOT** increment either counter.
