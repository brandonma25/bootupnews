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
  rank integer not null check (rank between 1 and 5),
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
  editorial_status text not null default 'needs_review'
    check (editorial_status in ('draft', 'needs_review', 'approved', 'published')),
  edited_by text,
  edited_at timestamptz,
  approved_by text,
  approved_at timestamptz,
  published_at timestamptz,
  is_live boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (briefing_date, rank)
);

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

drop trigger if exists set_signal_posts_updated_at on public.signal_posts;
create trigger set_signal_posts_updated_at
before update on public.signal_posts
for each row
execute function public.set_updated_at();
