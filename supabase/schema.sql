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

create table if not exists public.newsletter_emails (
  id uuid primary key default gen_random_uuid(),
  gmail_thread_id text not null,
  gmail_message_id text not null,
  sender text not null,
  subject text,
  received_at timestamptz not null,
  processed_at timestamptz,
  label text not null default 'boot-up-benchmark',
  raw_content text,
  content_sha256 text,
  extraction_status text not null default 'pending',
  extraction_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint newsletter_emails_gmail_message_id_key unique (gmail_message_id),
  constraint newsletter_emails_extraction_status_check
    check (extraction_status in ('pending', 'extracted', 'failed'))
);

create index if not exists newsletter_emails_gmail_thread_id_idx
on public.newsletter_emails (gmail_thread_id);

create index if not exists newsletter_emails_label_idx
on public.newsletter_emails (label);

create index if not exists newsletter_emails_extraction_status_idx
on public.newsletter_emails (extraction_status);

create index if not exists newsletter_emails_received_at_idx
on public.newsletter_emails (received_at desc);

create index if not exists newsletter_emails_processed_at_idx
on public.newsletter_emails (processed_at desc);

create index if not exists newsletter_emails_content_sha256_idx
on public.newsletter_emails (content_sha256);

create table if not exists public.story_clusters (
  id uuid primary key default gen_random_uuid(),
  canonical_title text not null,
  event_type text,
  first_seen_at timestamptz not null default now(),
  last_updated_at timestamptz not null default now(),
  briefing_date date,
  member_count integer not null default 0,
  cluster_status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint story_clusters_member_count_check
    check (member_count >= 0),
  constraint story_clusters_cluster_status_check
    check (cluster_status in ('active', 'resolved', 'dismissed'))
);

create index if not exists story_clusters_briefing_date_idx
on public.story_clusters (briefing_date);

create index if not exists story_clusters_cluster_status_idx
on public.story_clusters (cluster_status);

create index if not exists story_clusters_last_updated_at_idx
on public.story_clusters (last_updated_at desc);

create index if not exists story_clusters_first_seen_at_idx
on public.story_clusters (first_seen_at desc);

create index if not exists story_clusters_event_type_idx
on public.story_clusters (event_type);

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
  context_material text,
  source_cluster_id uuid references public.story_clusters(id) on delete set null,
  witm_draft_generated_by text
    check (
      witm_draft_generated_by is null
      or witm_draft_generated_by in ('llm', 'deterministic_template', 'human')
    ),
  witm_draft_generated_at timestamptz,
  witm_draft_model text,
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

create index if not exists signal_posts_source_cluster_id_idx
on public.signal_posts (source_cluster_id);

create index if not exists signal_posts_witm_draft_generated_by_idx
on public.signal_posts (witm_draft_generated_by);

create index if not exists signal_posts_witm_draft_generated_at_idx
on public.signal_posts (witm_draft_generated_at desc);

create table if not exists public.published_slates (
  id uuid primary key default gen_random_uuid(),
  published_at timestamptz not null,
  published_by text,
  snapshot_status text not null default 'published'
    check (snapshot_status in ('draft', 'published', 'archived', 'rolled_back')),
  publish_batch_id text,
  source_briefing_date date,
  archived_from_live_set boolean,
  public_surface_verified_at timestamptz,
  row_count integer not null check (row_count >= 0),
  core_count integer not null check (core_count >= 0),
  context_count integer not null check (context_count >= 0),
  previous_live_row_ids jsonb not null default '[]'::jsonb,
  published_row_ids jsonb not null default '[]'::jsonb,
  rollback_note text,
  rollback_snapshot jsonb not null default '{}'::jsonb,
  verification_checklist_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.published_slate_items (
  id uuid primary key default gen_random_uuid(),
  published_slate_id uuid not null references public.published_slates(id) on delete cascade,
  signal_post_id uuid not null references public.signal_posts(id) on delete restrict,
  source_cluster_id uuid references public.story_clusters(id) on delete set null,
  final_slate_rank integer not null check (final_slate_rank between 1 and 7),
  final_slate_tier text not null check (final_slate_tier in ('core', 'context')),
  title_snapshot text not null,
  why_it_matters_snapshot text not null default '',
  summary_snapshot text,
  source_name_snapshot text,
  source_url_snapshot text,
  tags_snapshot text[] not null default '{}'::text[],
  editorial_decision_snapshot text,
  replacement_of_row_id_snapshot uuid references public.signal_posts(id) on delete set null,
  promoted_from_artifact_id text,
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

create index if not exists published_slate_items_source_cluster_id_idx
on public.published_slate_items (source_cluster_id);

create index if not exists published_slate_items_replacement_of_row_id_snapshot_idx
on public.published_slate_items (replacement_of_row_id_snapshot);

create index if not exists published_slate_items_promoted_from_artifact_id_idx
on public.published_slate_items (promoted_from_artifact_id);

create index if not exists published_slates_published_at_idx
on public.published_slates (published_at desc);

create index if not exists published_slates_snapshot_status_idx
on public.published_slates (snapshot_status);

create index if not exists published_slates_publish_batch_id_idx
on public.published_slates (publish_batch_id);

create index if not exists published_slates_source_briefing_date_idx
on public.published_slates (source_briefing_date);

create index if not exists published_slates_public_surface_verified_at_idx
on public.published_slates (public_surface_verified_at desc);

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

create table if not exists public.newsletter_story_extractions (
  id uuid primary key default gen_random_uuid(),
  newsletter_email_id uuid not null references public.newsletter_emails(id) on delete cascade,
  headline text not null,
  snippet text,
  source_url text,
  source_domain text,
  category text,
  extracted_at timestamptz not null default now(),
  extraction_confidence numeric,
  pipeline_candidate_id uuid references public.pipeline_article_candidates(id) on delete set null,
  signal_post_id uuid references public.signal_posts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint newsletter_story_extractions_category_check
    check (category is null or category in ('Finance', 'Tech', 'Politics')),
  constraint newsletter_story_extractions_confidence_check
    check (
      extraction_confidence is null
      or (extraction_confidence >= 0 and extraction_confidence <= 1)
    )
);

create index if not exists newsletter_story_extractions_newsletter_email_id_idx
on public.newsletter_story_extractions (newsletter_email_id);

create index if not exists newsletter_story_extractions_category_idx
on public.newsletter_story_extractions (category);

create index if not exists newsletter_story_extractions_source_domain_idx
on public.newsletter_story_extractions (source_domain);

create index if not exists newsletter_story_extractions_source_url_idx
on public.newsletter_story_extractions (source_url);

create index if not exists newsletter_story_extractions_pipeline_candidate_id_idx
on public.newsletter_story_extractions (pipeline_candidate_id);

create index if not exists newsletter_story_extractions_signal_post_id_idx
on public.newsletter_story_extractions (signal_post_id);

create index if not exists newsletter_story_extractions_extracted_at_idx
on public.newsletter_story_extractions (extracted_at desc);

create table if not exists public.story_cluster_members (
  id uuid primary key default gen_random_uuid(),
  cluster_id uuid not null references public.story_clusters(id) on delete cascade,
  source_type text not null,
  pipeline_candidate_id uuid references public.pipeline_article_candidates(id) on delete cascade,
  newsletter_extraction_id uuid references public.newsletter_story_extractions(id) on delete cascade,
  relevance_score numeric,
  added_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint story_cluster_members_source_type_check
    check (source_type in ('rss', 'newsletter')),
  constraint story_cluster_members_relevance_score_check
    check (
      relevance_score is null
      or (relevance_score >= 0 and relevance_score <= 1)
    ),
  constraint story_cluster_members_exactly_one_source_check
    check (num_nonnulls(pipeline_candidate_id, newsletter_extraction_id) = 1),
  constraint story_cluster_members_source_type_reference_check
    check (
      (
        source_type = 'rss'
        and pipeline_candidate_id is not null
        and newsletter_extraction_id is null
      )
      or (
        source_type = 'newsletter'
        and newsletter_extraction_id is not null
        and pipeline_candidate_id is null
      )
    )
);

create index if not exists story_cluster_members_cluster_id_idx
on public.story_cluster_members (cluster_id);

create index if not exists story_cluster_members_source_type_idx
on public.story_cluster_members (source_type);

create index if not exists story_cluster_members_pipeline_candidate_id_idx
on public.story_cluster_members (pipeline_candidate_id);

create index if not exists story_cluster_members_newsletter_extraction_id_idx
on public.story_cluster_members (newsletter_extraction_id);

create index if not exists story_cluster_members_relevance_score_idx
on public.story_cluster_members (relevance_score desc);

create index if not exists story_cluster_members_added_at_idx
on public.story_cluster_members (added_at desc);

create unique index if not exists story_cluster_members_cluster_pipeline_candidate_key
on public.story_cluster_members (cluster_id, pipeline_candidate_id)
where pipeline_candidate_id is not null;

create unique index if not exists story_cluster_members_cluster_newsletter_extraction_key
on public.story_cluster_members (cluster_id, newsletter_extraction_id)
where newsletter_extraction_id is not null;

create table if not exists public.signal_evolution (
  id uuid primary key default gen_random_uuid(),
  story_cluster_id uuid references public.story_clusters(id) on delete cascade,
  from_signal_post_id uuid references public.signal_posts(id) on delete set null,
  to_signal_post_id uuid references public.signal_posts(id) on delete set null,
  from_snapshot_signal_id uuid references public.published_slate_items(id) on delete set null,
  to_snapshot_signal_id uuid references public.published_slate_items(id) on delete set null,
  evolution_type text not null
    check (
      evolution_type in (
        'continued',
        'escalated',
        'deescalated',
        'reframed',
        'resolved',
        'superseded',
        'follow_up',
        'correction'
      )
    ),
  evolution_summary text,
  evidence text,
  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (
    num_nonnulls(
      story_cluster_id,
      from_signal_post_id,
      to_signal_post_id,
      from_snapshot_signal_id,
      to_snapshot_signal_id
    ) >= 1
  )
);

create index if not exists signal_evolution_story_cluster_id_idx
on public.signal_evolution (story_cluster_id);

create index if not exists signal_evolution_from_signal_post_id_idx
on public.signal_evolution (from_signal_post_id);

create index if not exists signal_evolution_to_signal_post_id_idx
on public.signal_evolution (to_signal_post_id);

create index if not exists signal_evolution_from_snapshot_signal_id_idx
on public.signal_evolution (from_snapshot_signal_id);

create index if not exists signal_evolution_to_snapshot_signal_id_idx
on public.signal_evolution (to_snapshot_signal_id);

create index if not exists signal_evolution_type_idx
on public.signal_evolution (evolution_type);

create index if not exists signal_evolution_observed_at_idx
on public.signal_evolution (observed_at desc);

create table if not exists public.cross_event_connections (
  id uuid primary key default gen_random_uuid(),
  from_story_cluster_id uuid references public.story_clusters(id) on delete cascade,
  to_story_cluster_id uuid references public.story_clusters(id) on delete cascade,
  from_signal_post_id uuid references public.signal_posts(id) on delete set null,
  to_signal_post_id uuid references public.signal_posts(id) on delete set null,
  from_snapshot_signal_id uuid references public.published_slate_items(id) on delete set null,
  to_snapshot_signal_id uuid references public.published_slate_items(id) on delete set null,
  connection_type text not null
    check (
      connection_type in (
        'causal',
        'policy_to_market',
        'market_to_policy',
        'same_actor',
        'same_sector',
        'supply_chain',
        'regulatory',
        'geopolitical',
        'financial_contagion',
        'thematic',
        'contradiction',
        'follow_up'
      )
    ),
  connection_summary text not null,
  evidence text,
  is_public_candidate boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    num_nonnulls(from_story_cluster_id, from_signal_post_id, from_snapshot_signal_id) >= 1
  ),
  check (
    num_nonnulls(to_story_cluster_id, to_signal_post_id, to_snapshot_signal_id) >= 1
  ),
  check (
    from_story_cluster_id is null
    or to_story_cluster_id is null
    or from_story_cluster_id <> to_story_cluster_id
  ),
  check (
    from_signal_post_id is null
    or to_signal_post_id is null
    or from_signal_post_id <> to_signal_post_id
  ),
  check (
    from_snapshot_signal_id is null
    or to_snapshot_signal_id is null
    or from_snapshot_signal_id <> to_snapshot_signal_id
  )
);

create index if not exists cross_event_connections_from_story_cluster_id_idx
on public.cross_event_connections (from_story_cluster_id);

create index if not exists cross_event_connections_to_story_cluster_id_idx
on public.cross_event_connections (to_story_cluster_id);

create index if not exists cross_event_connections_from_signal_post_id_idx
on public.cross_event_connections (from_signal_post_id);

create index if not exists cross_event_connections_to_signal_post_id_idx
on public.cross_event_connections (to_signal_post_id);

create index if not exists cross_event_connections_from_snapshot_signal_id_idx
on public.cross_event_connections (from_snapshot_signal_id);

create index if not exists cross_event_connections_to_snapshot_signal_id_idx
on public.cross_event_connections (to_snapshot_signal_id);

create index if not exists cross_event_connections_type_idx
on public.cross_event_connections (connection_type);

create index if not exists cross_event_connections_public_candidate_idx
on public.cross_event_connections (is_public_candidate);

create index if not exists cross_event_connections_created_at_idx
on public.cross_event_connections (created_at desc);

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

drop trigger if exists set_newsletter_emails_updated_at on public.newsletter_emails;
create trigger set_newsletter_emails_updated_at
before update on public.newsletter_emails
for each row
execute function public.set_updated_at();

drop trigger if exists set_newsletter_story_extractions_updated_at on public.newsletter_story_extractions;
create trigger set_newsletter_story_extractions_updated_at
before update on public.newsletter_story_extractions
for each row
execute function public.set_updated_at();

drop trigger if exists set_story_clusters_updated_at on public.story_clusters;
create trigger set_story_clusters_updated_at
before update on public.story_clusters
for each row
execute function public.set_updated_at();

drop trigger if exists set_cross_event_connections_updated_at on public.cross_event_connections;
create trigger set_cross_event_connections_updated_at
before update on public.cross_event_connections
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
alter table public.newsletter_emails enable row level security;
alter table public.newsletter_story_extractions enable row level security;
alter table public.story_clusters enable row level security;
alter table public.story_cluster_members enable row level security;
alter table public.signal_evolution enable row level security;
alter table public.cross_event_connections enable row level security;

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

create policy "Service role reads newsletter emails" on public.newsletter_emails
  for select to service_role using (true);

create policy "Service role writes newsletter emails" on public.newsletter_emails
  for insert to service_role with check (true);

create policy "Service role updates newsletter emails" on public.newsletter_emails
  for update to service_role using (true) with check (true);

create policy "Service role deletes newsletter emails" on public.newsletter_emails
  for delete to service_role using (true);

create policy "Service role reads newsletter story extractions" on public.newsletter_story_extractions
  for select to service_role using (true);

create policy "Service role writes newsletter story extractions" on public.newsletter_story_extractions
  for insert to service_role with check (true);

create policy "Service role updates newsletter story extractions" on public.newsletter_story_extractions
  for update to service_role using (true) with check (true);

create policy "Service role deletes newsletter story extractions" on public.newsletter_story_extractions
  for delete to service_role using (true);

create policy "Service role reads story clusters" on public.story_clusters
  for select to service_role using (true);

create policy "Service role writes story clusters" on public.story_clusters
  for insert to service_role with check (true);

create policy "Service role updates story clusters" on public.story_clusters
  for update to service_role using (true) with check (true);

create policy "Service role deletes story clusters" on public.story_clusters
  for delete to service_role using (true);

create policy "Service role reads story cluster members" on public.story_cluster_members
  for select to service_role using (true);

create policy "Service role writes story cluster members" on public.story_cluster_members
  for insert to service_role with check (true);

create policy "Service role updates story cluster members" on public.story_cluster_members
  for update to service_role using (true) with check (true);

create policy "Service role deletes story cluster members" on public.story_cluster_members
  for delete to service_role using (true);

create policy "Service role reads signal evolution" on public.signal_evolution
  for select to service_role using (true);

create policy "Service role writes signal evolution" on public.signal_evolution
  for insert to service_role with check (true);

create policy "Service role updates signal evolution" on public.signal_evolution
  for update to service_role using (true) with check (true);

create policy "Service role deletes signal evolution" on public.signal_evolution
  for delete to service_role using (true);

create policy "Service role reads cross event connections" on public.cross_event_connections
  for select to service_role using (true);

create policy "Service role writes cross event connections" on public.cross_event_connections
  for insert to service_role with check (true);

create policy "Service role updates cross event connections" on public.cross_event_connections
  for update to service_role using (true) with check (true);

create policy "Service role deletes cross event connections" on public.cross_event_connections
  for delete to service_role using (true);

create policy "Service role reads published slates" on public.published_slates
  for select to service_role using (true);

create policy "Service role writes published slates" on public.published_slates
  for insert to service_role with check (true);

create policy "Service role updates published slates" on public.published_slates
  for update to service_role using (true) with check (true);

create policy "Service role deletes published slates" on public.published_slates
  for delete to service_role using (true);

create policy "Service role reads published slate items" on public.published_slate_items
  for select to service_role using (true);

create policy "Service role writes published slate items" on public.published_slate_items
  for insert to service_role with check (true);

create policy "Service role updates published slate items" on public.published_slate_items
  for update to service_role using (true) with check (true);

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
