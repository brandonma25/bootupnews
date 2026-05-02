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

alter table public.mvp_measurement_events enable row level security;

drop policy if exists "Service role reads MVP measurement events" on public.mvp_measurement_events;
create policy "Service role reads MVP measurement events"
on public.mvp_measurement_events
for select
to service_role
using (true);

drop policy if exists "Service role writes MVP measurement events" on public.mvp_measurement_events;
create policy "Service role writes MVP measurement events"
on public.mvp_measurement_events
for insert
to service_role
with check (true);
