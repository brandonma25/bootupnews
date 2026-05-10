-- Feature: Phase 2 historical signal-card and newsletter ingestion DB foundation.
-- Scope: schema preparation only. This migration does not implement Gmail
-- ingestion, cron execution, LLM extraction, source matching, clustering
-- logic, historical browsing UI, admin/public UI, publish behavior, or
-- production data backfill.
--
-- Privacy contract:
-- - newsletter_emails.raw_content is internal source material and must never be
--   selected by public routes.
-- - signal_posts.context_material is internal editorial grounding material for
--   WITM drafting and must never be selected by public routes.
-- - The new internal Phase 2 tables are RLS-restricted to service_role in v1.
--   No anon or authenticated policies are created.
--
-- Historical snapshot path:
-- - public.published_slates already represents one published briefing snapshot.
-- - public.published_slate_items already represents the ordered published
--   Signal Card rows in that snapshot.
-- - This migration therefore extends those existing tables instead of creating
--   duplicate briefing_snapshots or briefing_snapshot_signals tables.
-- - Historical browsing UI and public replay queries are out of scope here.

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

comment on table public.newsletter_emails is
  'Internal processed Gmail newsletter registry. Prevents reprocessing by unique gmail_message_id.';
comment on column public.newsletter_emails.gmail_thread_id is
  'Gmail thread ids are not unique because one thread can contain multiple benchmark newsletter messages.';
comment on column public.newsletter_emails.raw_content is
  'Internal-only raw newsletter source material. Do not select from public routes.';
comment on column public.newsletter_emails.content_sha256 is
  'Indexed but not unique: duplicate or resend-equivalent newsletter bodies should not block separate Gmail messages.';

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

comment on table public.story_clusters is
  'Internal Story Cluster grouping for RSS Article candidates and newsletter-derived Article candidates.';

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

alter table public.signal_posts
  add column if not exists context_material text,
  add column if not exists source_cluster_id uuid references public.story_clusters(id) on delete set null,
  add column if not exists witm_draft_generated_by text,
  add column if not exists witm_draft_generated_at timestamptz,
  add column if not exists witm_draft_model text;

alter table public.signal_posts
  drop constraint if exists signal_posts_witm_draft_generated_by_check;

alter table public.signal_posts
  add constraint signal_posts_witm_draft_generated_by_check
  check (
    witm_draft_generated_by is null
    or witm_draft_generated_by in ('llm', 'deterministic_template', 'human')
  );

comment on column public.signal_posts.context_material is
  'Internal-only editorial grounding material for WITM drafting. Do not select from public routes.';
comment on column public.signal_posts.source_cluster_id is
  'Nullable Story Cluster reference because legacy signal_posts rows can exist before cluster persistence.';
comment on column public.signal_posts.witm_draft_generated_by is
  'Internal attribution for WITM draft origin, not public render copy.';
comment on column public.signal_posts.witm_draft_model is
  'Internal model identifier for WITM draft provenance when generated by an LLM.';

create index if not exists signal_posts_source_cluster_id_idx
on public.signal_posts (source_cluster_id);

create index if not exists signal_posts_witm_draft_generated_by_idx
on public.signal_posts (witm_draft_generated_by);

create index if not exists signal_posts_witm_draft_generated_at_idx
on public.signal_posts (witm_draft_generated_at desc);

alter table public.published_slates
  add column if not exists snapshot_status text not null default 'published',
  add column if not exists publish_batch_id text,
  add column if not exists source_briefing_date date,
  add column if not exists archived_from_live_set boolean,
  add column if not exists public_surface_verified_at timestamptz,
  add column if not exists rollback_snapshot jsonb not null default '{}'::jsonb;

alter table public.published_slates
  drop constraint if exists published_slates_snapshot_status_check;

alter table public.published_slates
  add constraint published_slates_snapshot_status_check
  check (snapshot_status in ('draft', 'published', 'archived', 'rolled_back'));

comment on table public.published_slates is
  'Published briefing snapshot envelope. Reused as the Phase 2 historical snapshot table instead of adding duplicate briefing_snapshots.';
comment on column public.published_slates.snapshot_status is
  'Lifecycle marker for historical snapshot handling. Defaults to published for current publish-event snapshots.';
comment on column public.published_slates.publish_batch_id is
  'Optional external publish/run batch id. The primary id remains the canonical snapshot id.';
comment on column public.published_slates.source_briefing_date is
  'Optional source briefing date for historical browsing and backfill grouping.';
comment on column public.published_slates.archived_from_live_set is
  'Optional marker for whether the snapshot was captured from the live public set.';
comment on column public.published_slates.public_surface_verified_at is
  'Optional timestamp for a later verification pass that the public surface matched this snapshot.';
comment on column public.published_slates.rollback_snapshot is
  'Internal rollback/audit metadata. Must not contain private newsletter raw content.';

create index if not exists published_slates_snapshot_status_idx
on public.published_slates (snapshot_status);

create index if not exists published_slates_publish_batch_id_idx
on public.published_slates (publish_batch_id);

create index if not exists published_slates_source_briefing_date_idx
on public.published_slates (source_briefing_date);

create index if not exists published_slates_public_surface_verified_at_idx
on public.published_slates (public_surface_verified_at desc);

alter table public.published_slate_items
  add column if not exists source_cluster_id uuid references public.story_clusters(id) on delete set null,
  add column if not exists tags_snapshot text[] not null default '{}'::text[],
  add column if not exists promoted_from_artifact_id text;

alter table public.published_slate_items
  drop constraint if exists published_slate_items_replacement_of_row_id_snapshot_fkey;

alter table public.published_slate_items
  add constraint published_slate_items_replacement_of_row_id_snapshot_fkey
  foreign key (replacement_of_row_id_snapshot)
  references public.signal_posts(id)
  on delete set null;

comment on table public.published_slate_items is
  'Published Signal Card snapshot rows. Reused as the Phase 2 historical snapshot signal table instead of adding duplicate briefing_snapshot_signals.';
comment on column public.published_slate_items.source_cluster_id is
  'Optional Story Cluster lineage for the published card snapshot row.';
comment on column public.published_slate_items.tags_snapshot is
  'Published tag snapshot for historical card replay.';
comment on column public.published_slate_items.promoted_from_artifact_id is
  'Optional internal artifact id that supplied or promoted the card into the final slate.';

create index if not exists published_slate_items_source_cluster_id_idx
on public.published_slate_items (source_cluster_id);

create index if not exists published_slate_items_replacement_of_row_id_snapshot_idx
on public.published_slate_items (replacement_of_row_id_snapshot);

create index if not exists published_slate_items_promoted_from_artifact_id_idx
on public.published_slate_items (promoted_from_artifact_id);

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

comment on table public.newsletter_story_extractions is
  'Internal Article candidates extracted from benchmark newsletter emails.';
comment on column public.newsletter_story_extractions.newsletter_email_id is
  'Required parent email FK; extraction rows should not outlive their processed source email.';
comment on column public.newsletter_story_extractions.pipeline_candidate_id is
  'Nullable FK because a newsletter extraction may not be matched to an RSS pipeline Article candidate.';
comment on column public.newsletter_story_extractions.signal_post_id is
  'Nullable FK because a newsletter extraction may never be promoted into the signal_posts read model.';

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

comment on table public.story_cluster_members is
  'Internal mapping table that joins RSS pipeline Article candidates and newsletter Article candidates into Story Clusters.';
comment on column public.story_cluster_members.pipeline_candidate_id is
  'Nullable FK by design; populated only when source_type is rss.';
comment on column public.story_cluster_members.newsletter_extraction_id is
  'Nullable FK by design; populated only when source_type is newsletter.';

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
  evolution_type text not null,
  evolution_summary text,
  evidence text,
  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint signal_evolution_type_check
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
  constraint signal_evolution_reference_check
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

comment on table public.signal_evolution is
  'Internal Phase 2 lineage table for tracking how a Story Cluster or Signal Card changes across days or published snapshots.';
comment on column public.signal_evolution.from_snapshot_signal_id is
  'Optional FK to published_slate_items because that table is the reused snapshot signal/card table.';
comment on column public.signal_evolution.to_snapshot_signal_id is
  'Optional FK to published_slate_items because that table is the reused snapshot signal/card table.';

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
  connection_type text not null,
  connection_summary text not null,
  evidence text,
  is_public_candidate boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cross_event_connections_type_check
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
  constraint cross_event_connections_from_reference_check
    check (
      num_nonnulls(from_story_cluster_id, from_signal_post_id, from_snapshot_signal_id) >= 1
    ),
  constraint cross_event_connections_to_reference_check
    check (
      num_nonnulls(to_story_cluster_id, to_signal_post_id, to_snapshot_signal_id) >= 1
    ),
  constraint cross_event_connections_no_self_story_cluster_check
    check (
      from_story_cluster_id is null
      or to_story_cluster_id is null
      or from_story_cluster_id <> to_story_cluster_id
    ),
  constraint cross_event_connections_no_self_signal_post_check
    check (
      from_signal_post_id is null
      or to_signal_post_id is null
      or from_signal_post_id <> to_signal_post_id
    ),
  constraint cross_event_connections_no_self_snapshot_signal_check
    check (
      from_snapshot_signal_id is null
      or to_snapshot_signal_id is null
      or from_snapshot_signal_id <> to_snapshot_signal_id
    )
);

comment on table public.cross_event_connections is
  'Internal Phase 2 connection map between Story Clusters, signal_posts rows, or published Signal Card snapshot rows.';
comment on column public.cross_event_connections.is_public_candidate is
  'Internal review marker only. It does not expose this connection publicly without future route and RLS work.';

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

alter table public.newsletter_emails enable row level security;
alter table public.newsletter_story_extractions enable row level security;
alter table public.story_clusters enable row level security;
alter table public.story_cluster_members enable row level security;
alter table public.signal_evolution enable row level security;
alter table public.cross_event_connections enable row level security;

drop policy if exists "Service role updates published slates" on public.published_slates;
create policy "Service role updates published slates"
on public.published_slates
for update
to service_role
using (true)
with check (true);

drop policy if exists "Service role updates published slate items" on public.published_slate_items;
create policy "Service role updates published slate items"
on public.published_slate_items
for update
to service_role
using (true)
with check (true);

drop policy if exists "Service role reads newsletter emails" on public.newsletter_emails;
create policy "Service role reads newsletter emails"
on public.newsletter_emails
for select
to service_role
using (true);

drop policy if exists "Service role writes newsletter emails" on public.newsletter_emails;
create policy "Service role writes newsletter emails"
on public.newsletter_emails
for insert
to service_role
with check (true);

drop policy if exists "Service role updates newsletter emails" on public.newsletter_emails;
create policy "Service role updates newsletter emails"
on public.newsletter_emails
for update
to service_role
using (true)
with check (true);

drop policy if exists "Service role deletes newsletter emails" on public.newsletter_emails;
create policy "Service role deletes newsletter emails"
on public.newsletter_emails
for delete
to service_role
using (true);

drop policy if exists "Service role reads newsletter story extractions" on public.newsletter_story_extractions;
create policy "Service role reads newsletter story extractions"
on public.newsletter_story_extractions
for select
to service_role
using (true);

drop policy if exists "Service role writes newsletter story extractions" on public.newsletter_story_extractions;
create policy "Service role writes newsletter story extractions"
on public.newsletter_story_extractions
for insert
to service_role
with check (true);

drop policy if exists "Service role updates newsletter story extractions" on public.newsletter_story_extractions;
create policy "Service role updates newsletter story extractions"
on public.newsletter_story_extractions
for update
to service_role
using (true)
with check (true);

drop policy if exists "Service role deletes newsletter story extractions" on public.newsletter_story_extractions;
create policy "Service role deletes newsletter story extractions"
on public.newsletter_story_extractions
for delete
to service_role
using (true);

drop policy if exists "Service role reads story clusters" on public.story_clusters;
create policy "Service role reads story clusters"
on public.story_clusters
for select
to service_role
using (true);

drop policy if exists "Service role writes story clusters" on public.story_clusters;
create policy "Service role writes story clusters"
on public.story_clusters
for insert
to service_role
with check (true);

drop policy if exists "Service role updates story clusters" on public.story_clusters;
create policy "Service role updates story clusters"
on public.story_clusters
for update
to service_role
using (true)
with check (true);

drop policy if exists "Service role deletes story clusters" on public.story_clusters;
create policy "Service role deletes story clusters"
on public.story_clusters
for delete
to service_role
using (true);

drop policy if exists "Service role reads story cluster members" on public.story_cluster_members;
create policy "Service role reads story cluster members"
on public.story_cluster_members
for select
to service_role
using (true);

drop policy if exists "Service role writes story cluster members" on public.story_cluster_members;
create policy "Service role writes story cluster members"
on public.story_cluster_members
for insert
to service_role
with check (true);

drop policy if exists "Service role updates story cluster members" on public.story_cluster_members;
create policy "Service role updates story cluster members"
on public.story_cluster_members
for update
to service_role
using (true)
with check (true);

drop policy if exists "Service role deletes story cluster members" on public.story_cluster_members;
create policy "Service role deletes story cluster members"
on public.story_cluster_members
for delete
to service_role
using (true);

drop policy if exists "Service role reads signal evolution" on public.signal_evolution;
create policy "Service role reads signal evolution"
on public.signal_evolution
for select
to service_role
using (true);

drop policy if exists "Service role writes signal evolution" on public.signal_evolution;
create policy "Service role writes signal evolution"
on public.signal_evolution
for insert
to service_role
with check (true);

drop policy if exists "Service role updates signal evolution" on public.signal_evolution;
create policy "Service role updates signal evolution"
on public.signal_evolution
for update
to service_role
using (true)
with check (true);

drop policy if exists "Service role deletes signal evolution" on public.signal_evolution;
create policy "Service role deletes signal evolution"
on public.signal_evolution
for delete
to service_role
using (true);

drop policy if exists "Service role reads cross event connections" on public.cross_event_connections;
create policy "Service role reads cross event connections"
on public.cross_event_connections
for select
to service_role
using (true);

drop policy if exists "Service role writes cross event connections" on public.cross_event_connections;
create policy "Service role writes cross event connections"
on public.cross_event_connections
for insert
to service_role
with check (true);

drop policy if exists "Service role updates cross event connections" on public.cross_event_connections;
create policy "Service role updates cross event connections"
on public.cross_event_connections
for update
to service_role
using (true)
with check (true);

drop policy if exists "Service role deletes cross event connections" on public.cross_event_connections;
create policy "Service role deletes cross event connections"
on public.cross_event_connections
for delete
to service_role
using (true);
