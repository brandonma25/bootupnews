create table if not exists public.pipeline_article_candidates (
  id uuid primary key default gen_random_uuid(),
  run_id text not null,
  ingested_at timestamptz not null,
  source_name text not null,
  source_tier text check (source_tier in ('tier_1', 'tier_2', 'tier_3')),
  canonical_url text not null,
  title text not null,
  summary text,
  keywords text[],
  entities text[],
  cluster_id text,
  ranking_score numeric,
  surfaced boolean not null default false,
  pipeline_stage_reached text not null
    check (pipeline_stage_reached in ('normalized', 'deduped', 'clustered', 'ranked', 'surfaced')),
  drop_reason text
    check (
      drop_reason in (
        'duplicate_url',
        'duplicate_title',
        'low_cluster_score',
        'below_rank_threshold',
        'diversity_capped',
        'editorial_excluded'
      )
    )
);

create index if not exists pipeline_article_candidates_run_id_idx
on public.pipeline_article_candidates (run_id);

create index if not exists pipeline_article_candidates_run_id_surfaced_idx
on public.pipeline_article_candidates (run_id, surfaced);

create index if not exists pipeline_article_candidates_ingested_at_idx
on public.pipeline_article_candidates (ingested_at);

alter table public.pipeline_article_candidates enable row level security;

drop policy if exists "Service role reads pipeline article candidates" on public.pipeline_article_candidates;
create policy "Service role reads pipeline article candidates"
on public.pipeline_article_candidates
for select
to service_role
using (true);

drop policy if exists "Service role writes pipeline article candidates" on public.pipeline_article_candidates;
create policy "Service role writes pipeline article candidates"
on public.pipeline_article_candidates
for insert
to service_role
with check (true);

drop policy if exists "Service role updates pipeline article candidates" on public.pipeline_article_candidates;
create policy "Service role updates pipeline article candidates"
on public.pipeline_article_candidates
for update
to service_role
using (true)
with check (true);

drop policy if exists "Service role deletes pipeline article candidates" on public.pipeline_article_candidates;
create policy "Service role deletes pipeline article candidates"
on public.pipeline_article_candidates
for delete
to service_role
using (true);
