create extension if not exists "pgcrypto";

create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  description text not null default '',
  color text not null default '#1F4F46',
  created_at timestamptz not null default now()
);

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
  title text not null,
  url text not null,
  summary_text text,
  published_at timestamptz,
  dedupe_key text,
  created_at timestamptz not null default now()
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

alter table public.topics enable row level security;
alter table public.sources enable row level security;
alter table public.articles enable row level security;
alter table public.daily_briefings enable row level security;
alter table public.briefing_items enable row level security;

create policy "Users manage their own topics" on public.topics
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage their own sources" on public.sources
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage their own articles" on public.articles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

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
