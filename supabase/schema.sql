create extension if not exists "pgcrypto";

create table if not exists public.user_profiles (
  id uuid primary key,
  email text not null unique,
  full_name text,
  avatar_url text,
  category_preferences text[] not null default array['tech', 'finance', 'politics']::text[],
  newsletter_enabled boolean not null default false,
  last_sign_in_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_profiles_category_preferences_check
    check (
      category_preferences <@ array['tech', 'finance', 'politics']::text[]
    )
);

create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  description text not null default '',
  color text not null default '#1F4F46',
  keywords text[] not null default '{}'::text[],
  exclude_keywords text[] not null default '{}'::text[],
  created_at timestamptz not null default now()
);

create unique index if not exists topics_user_id_name_key
on public.topics (user_id, name);

create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  topic_id uuid references public.topics(id) on delete set null,
  name text not null,
  feed_url text not null,
  homepage_url text,
  status text not null default 'active' check (status in ('active', 'paused')),
  created_at timestamptz not null default now()
);

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  source_id uuid references public.sources(id) on delete cascade,
  event_id uuid,
  title text not null,
  url text not null,
  summary_text text,
  published_at timestamptz,
  dedupe_key text,
  source_tier text check (source_tier in ('tier1', 'tier2', 'tier3', 'unknown')),
  headline_quality text check (headline_quality in ('strong', 'medium', 'weak')),
  event_type text,
  filter_decision text check (filter_decision in ('pass', 'suppress', 'reject')),
  filter_reasons jsonb not null default '[]'::jsonb,
  filter_evaluated_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  topic_id uuid references public.topics(id) on delete set null,
  title text not null,
  summary text not null,
  why_it_matters text not null,
  created_at timestamptz not null default now()
);

alter table public.articles
  drop constraint if exists articles_event_id_fkey;

alter table public.articles
  add constraint articles_event_id_fkey
  foreign key (event_id) references public.events(id) on delete set null;

create table if not exists public.article_topics (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  matched_keywords text[] not null default '{}'::text[],
  match_score integer not null default 0,
  created_at timestamptz not null default now(),
  unique (article_id, topic_id)
);

create table if not exists public.daily_briefings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  briefing_date date not null,
  title text not null,
  intro text not null default '',
  reading_window text not null default '0 minutes',
  created_at timestamptz not null default now(),
  unique (user_id, briefing_date)
);

create table if not exists public.user_event_state (
  user_id uuid not null,
  event_key text not null,
  last_viewed_at timestamptz,
  last_seen_at timestamptz not null default now(),
  last_seen_fingerprint text,
  last_seen_importance_score numeric,
  primary key (user_id, event_key)
);

create table if not exists public.briefing_items (
  id uuid primary key default gen_random_uuid(),
  briefing_id uuid not null references public.daily_briefings(id) on delete cascade,
  topic_id uuid references public.topics(id) on delete set null,
  topic_name text not null,
  title text not null,
  what_happened text not null,
  key_points jsonb not null default '[]'::jsonb,
  why_it_matters text not null,
  sources jsonb not null default '[]'::jsonb,
  estimated_minutes integer not null default 4,
  priority text not null default 'normal' check (priority in ('top', 'normal')),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.signal_posts (
  id uuid primary key default gen_random_uuid(),
  briefing_date date not null default current_date,
  rank integer not null check (rank between 1 and 20),
  title text not null,
  source_name text not null default '',
  source_url text not null default '',
  summary text not null default '',
  tags text[] not null default '{}'::text[],
  signal_score numeric,
  selection_reason text not null default '',
  ai_why_it_matters text not null default '',
  edited_why_it_matters text,
  published_why_it_matters text,
  why_it_matters_validation_status text not null default 'passed'
    check (why_it_matters_validation_status in ('passed', 'requires_human_rewrite')),
  why_it_matters_validation_failures text[] not null default '{}'::text[],
  why_it_matters_validation_details text[] not null default '{}'::text[],
  why_it_matters_validated_at timestamptz,
  editorial_status text not null default 'needs_review'
    check (editorial_status in ('draft', 'needs_review', 'approved', 'published')),
  final_slate_rank integer
    check (final_slate_rank is null or final_slate_rank between 1 and 7),
  final_slate_tier text
    check (final_slate_tier is null or final_slate_tier in ('core', 'context')),
  editorial_decision text
    check (
      editorial_decision is null
      or editorial_decision in (
        'pending_review',
        'draft_edited',
        'approved',
        'rewrite_requested',
        'rejected',
        'held',
        'removed_from_slate'
      )
    ),
  decision_note text,
  rejected_reason text,
  held_reason text,
  replacement_of_row_id uuid references public.signal_posts(id) on delete set null,
  reviewed_by text,
  reviewed_at timestamptz,
  edited_by text,
  edited_at timestamptz,
  approved_by text,
  approved_at timestamptz,
  published_at timestamptz,
  is_live boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint signal_posts_public_source_url_check
    check (btrim(source_url) <> '' and source_url ~* '^https?://'),
  check (
    (final_slate_rank is null and final_slate_tier is null)
    or (final_slate_rank between 1 and 5 and final_slate_tier = 'core')
    or (final_slate_rank between 6 and 7 and final_slate_tier = 'context')
  ),
  unique (briefing_date, rank)
);

create unique index if not exists signal_posts_live_top_rank_key
on public.signal_posts (rank)
where is_live and rank between 1 and 5;

create unique index if not exists signal_posts_briefing_date_final_slate_rank_key
on public.signal_posts (briefing_date, final_slate_rank)
where final_slate_rank is not null;

create table if not exists public.published_slates (
  id uuid primary key default gen_random_uuid(),
  published_at timestamptz not null,
  published_by text,
  row_count integer not null check (row_count >= 0),
  core_count integer not null check (core_count >= 0),
  context_count integer not null check (context_count >= 0),
  previous_live_row_ids jsonb not null default '[]'::jsonb,
  published_row_ids jsonb not null default '[]'::jsonb,
  rollback_note text,
  verification_checklist_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.published_slate_items (
  id uuid primary key default gen_random_uuid(),
  published_slate_id uuid not null references public.published_slates(id) on delete cascade,
  signal_post_id uuid not null references public.signal_posts(id) on delete restrict,
  final_slate_rank integer not null check (final_slate_rank between 1 and 7),
  final_slate_tier text not null check (final_slate_tier in ('core', 'context')),
  title_snapshot text not null,
  why_it_matters_snapshot text not null default '',
  summary_snapshot text,
  source_name_snapshot text,
  source_url_snapshot text,
  editorial_decision_snapshot text,
  replacement_of_row_id_snapshot uuid,
  decision_note_snapshot text,
  held_reason_snapshot text,
  rejected_reason_snapshot text,
  reviewed_by_snapshot text,
  reviewed_at_snapshot timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists published_slate_items_slate_rank_key
on public.published_slate_items (published_slate_id, final_slate_rank);

create index if not exists published_slate_items_signal_post_id_idx
on public.published_slate_items (signal_post_id);

create index if not exists published_slates_published_at_idx
on public.published_slates (published_at desc);

create table if not exists public.mvp_measurement_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null
    check (
      event_name in (
        'homepage_view',
        'signals_page_view',
        'signal_card_expand',
        'signal_full_expansion',
        'signal_full_expansion_proxy',
        'signal_details_click',
        'source_click',
        'comprehension_prompt_shown',
        'comprehension_prompt_answered'
      )
    ),
  occurred_at timestamptz not null default now(),
  visitor_id text not null check (length(visitor_id) between 16 and 96),
  session_id text not null check (length(session_id) between 20 and 104),
  user_id uuid,
  route text,
  surface text,
  signal_post_id uuid references public.signal_posts(id) on delete set null,
  signal_slug text,
  signal_rank integer check (signal_rank is null or signal_rank between 1 and 20),
  briefing_date date,
  published_slate_id uuid references public.published_slates(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists mvp_measurement_events_occurred_at_idx
on public.mvp_measurement_events (occurred_at desc);

create index if not exists mvp_measurement_events_visitor_occurred_at_idx
on public.mvp_measurement_events (visitor_id, occurred_at);

create index if not exists mvp_measurement_events_session_idx
on public.mvp_measurement_events (session_id);

create index if not exists mvp_measurement_events_event_name_occurred_at_idx
on public.mvp_measurement_events (event_name, occurred_at desc);

create index if not exists mvp_measurement_events_briefing_date_idx
on public.mvp_measurement_events (briefing_date);

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

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_user_profiles_updated_at on public.user_profiles;
create trigger set_user_profiles_updated_at
before update on public.user_profiles
for each row
execute function public.set_updated_at();

alter table public.user_profiles enable row level security;
alter table public.topics enable row level security;
alter table public.sources enable row level security;
alter table public.articles enable row level security;
alter table public.events enable row level security;
alter table public.article_topics enable row level security;
alter table public.daily_briefings enable row level security;
alter table public.briefing_items enable row level security;
alter table public.user_event_state enable row level security;
alter table public.signal_posts enable row level security;
alter table public.published_slates enable row level security;
alter table public.published_slate_items enable row level security;
alter table public.mvp_measurement_events enable row level security;
alter table public.pipeline_article_candidates enable row level security;

create policy "Users manage their own profile" on public.user_profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "Users manage their own topics" on public.topics
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage their own sources" on public.sources
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage their own articles" on public.articles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage their own events" on public.events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage their own article-topic matches" on public.article_topics
  for all using (
    exists (
      select 1 from public.articles
      where public.articles.id = article_id
      and public.articles.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.articles
      where public.articles.id = article_id
      and public.articles.user_id = auth.uid()
    )
  );

create policy "Users manage their own briefings" on public.daily_briefings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage their own briefing items" on public.briefing_items
  for all using (
    exists (
      select 1 from public.daily_briefings
      where public.daily_briefings.id = briefing_id
      and public.daily_briefings.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.daily_briefings
      where public.daily_briefings.id = briefing_id
      and public.daily_briefings.user_id = auth.uid()
    )
  );

create policy "Users manage their own event state" on public.user_event_state
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Service role reads pipeline article candidates" on public.pipeline_article_candidates
  for select to service_role using (true);

create policy "Service role writes pipeline article candidates" on public.pipeline_article_candidates
  for insert to service_role with check (true);

create policy "Service role updates pipeline article candidates" on public.pipeline_article_candidates
  for update to service_role using (true) with check (true);

create policy "Service role deletes pipeline article candidates" on public.pipeline_article_candidates
  for delete to service_role using (true);

create policy "Service role reads published slates" on public.published_slates
  for select to service_role using (true);

create policy "Service role writes published slates" on public.published_slates
  for insert to service_role with check (true);

create policy "Service role deletes published slates" on public.published_slates
  for delete to service_role using (true);

create policy "Service role reads published slate items" on public.published_slate_items
  for select to service_role using (true);

create policy "Service role writes published slate items" on public.published_slate_items
  for insert to service_role with check (true);

create policy "Service role deletes published slate items" on public.published_slate_items
  for delete to service_role using (true);

create policy "Service role reads MVP measurement events" on public.mvp_measurement_events
  for select to service_role using (true);

create policy "Service role writes MVP measurement events" on public.mvp_measurement_events
  for insert to service_role with check (true);

drop trigger if exists set_signal_posts_updated_at on public.signal_posts;
create trigger set_signal_posts_updated_at
before update on public.signal_posts
for each row
execute function public.set_updated_at();
