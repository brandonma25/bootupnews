# Feature Note: TLDR URL Ingestion

TLDR ingestion now behaves like a discovery-source adapter instead of a normal publisher feed.

Highlights:

- Validated official TLDR category feeds now include `tech`, `ai`, `product`, `founders`, `design`, `fintech`, `it`, `crypto`, and `marketing`.
- TLDR digests now expand into outbound article URLs inside the existing ingestion pipeline.
- Each TLDR-derived candidate carries explicit discovery metadata:
  - `discoverySource`
  - `tldrCategory`
  - `originalUrl`
  - `normalizedUrl`
  - `sourceDomain`
  - `tldrDigestUrl`
  - `ingestionTimestamp`
- User-facing source attribution stays on the outbound article domain.
- All TLDR sources remain paused/non-default unless an ingesting surface explicitly enables them.
- [Bullrich/tldr-rss](https://github.com/Bullrich/tldr-rss/) and [bullrich.dev/tldr-rss](https://bullrich.dev/tldr-rss/) remain reference-only inputs, not runtime dependencies.

Operational note:

If TLDR changes its digest markup or throttles native feed access, ingestion should degrade safely by skipping malformed digest entries instead of breaking the full pipeline run.
