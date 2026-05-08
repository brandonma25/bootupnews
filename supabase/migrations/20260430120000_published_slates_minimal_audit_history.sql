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

alter table public.published_slates enable row level security;
alter table public.published_slate_items enable row level security;

drop policy if exists "Service role reads published slates" on public.published_slates;
create policy "Service role reads published slates"
on public.published_slates
for select
to service_role
using (true);

drop policy if exists "Service role writes published slates" on public.published_slates;
create policy "Service role writes published slates"
on public.published_slates
for insert
to service_role
with check (true);

drop policy if exists "Service role deletes published slates" on public.published_slates;
create policy "Service role deletes published slates"
on public.published_slates
for delete
to service_role
using (true);

drop policy if exists "Service role reads published slate items" on public.published_slate_items;
create policy "Service role reads published slate items"
on public.published_slate_items
for select
to service_role
using (true);

drop policy if exists "Service role writes published slate items" on public.published_slate_items;
create policy "Service role writes published slate items"
on public.published_slate_items
for insert
to service_role
with check (true);

drop policy if exists "Service role deletes published slate items" on public.published_slate_items;
create policy "Service role deletes published slate items"
on public.published_slate_items
for delete
to service_role
using (true);
