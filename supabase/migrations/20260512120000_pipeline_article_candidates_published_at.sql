alter table public.pipeline_article_candidates
  add column if not exists published_at timestamptz;

create index if not exists pipeline_article_candidates_published_at_idx
on public.pipeline_article_candidates (published_at desc);
