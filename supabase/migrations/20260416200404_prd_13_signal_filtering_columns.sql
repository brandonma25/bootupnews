alter table public.articles
  add column if not exists source_tier text,
  add column if not exists headline_quality text,
  add column if not exists event_type text,
  add column if not exists filter_decision text,
  add column if not exists filter_reasons jsonb not null default '[]'::jsonb,
  add column if not exists filter_evaluated_at timestamptz;

alter table public.articles
  drop constraint if exists articles_source_tier_check,
  drop constraint if exists articles_headline_quality_check,
  drop constraint if exists articles_filter_decision_check;

alter table public.articles
  add constraint articles_source_tier_check
    check (source_tier in ('tier1', 'tier2', 'tier3', 'unknown')),
  add constraint articles_headline_quality_check
    check (headline_quality in ('strong', 'medium', 'weak')),
  add constraint articles_filter_decision_check
    check (filter_decision in ('pass', 'suppress', 'reject'));

update public.articles
set filter_reasons = '[]'::jsonb
where filter_reasons is null;
