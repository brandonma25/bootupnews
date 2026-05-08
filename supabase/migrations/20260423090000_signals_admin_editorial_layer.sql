create table if not exists public.signal_posts (
  id uuid primary key default gen_random_uuid(),
  rank integer not null unique check (rank between 1 and 5),
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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.signal_posts
  add column if not exists rank integer,
  add column if not exists title text,
  add column if not exists source_name text,
  add column if not exists source_url text,
  add column if not exists summary text,
  add column if not exists tags text[],
  add column if not exists signal_score numeric,
  add column if not exists selection_reason text,
  add column if not exists ai_why_it_matters text,
  add column if not exists edited_why_it_matters text,
  add column if not exists published_why_it_matters text,
  add column if not exists editorial_status text,
  add column if not exists edited_by text,
  add column if not exists edited_at timestamptz,
  add column if not exists approved_by text,
  add column if not exists approved_at timestamptz,
  add column if not exists published_at timestamptz,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

update public.signal_posts
set
  source_name = coalesce(source_name, ''),
  source_url = coalesce(source_url, ''),
  summary = coalesce(summary, ''),
  tags = coalesce(tags, '{}'::text[]),
  selection_reason = coalesce(selection_reason, ''),
  ai_why_it_matters = coalesce(ai_why_it_matters, ''),
  editorial_status = coalesce(editorial_status, 'needs_review'),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now());

alter table public.signal_posts
  alter column rank set not null,
  alter column title set not null,
  alter column source_name set default '',
  alter column source_name set not null,
  alter column source_url set default '',
  alter column source_url set not null,
  alter column summary set default '',
  alter column summary set not null,
  alter column tags set default '{}'::text[],
  alter column tags set not null,
  alter column selection_reason set default '',
  alter column selection_reason set not null,
  alter column ai_why_it_matters set default '',
  alter column ai_why_it_matters set not null,
  alter column editorial_status set default 'needs_review',
  alter column editorial_status set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

alter table public.signal_posts
  drop constraint if exists signal_posts_rank_check,
  drop constraint if exists signal_posts_editorial_status_check;

alter table public.signal_posts
  add constraint signal_posts_rank_check check (rank between 1 and 5),
  add constraint signal_posts_editorial_status_check
    check (editorial_status in ('draft', 'needs_review', 'approved', 'published'));

create unique index if not exists signal_posts_rank_key
on public.signal_posts (rank);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

alter table public.signal_posts enable row level security;

drop policy if exists "Public reads published signal posts" on public.signal_posts;

drop trigger if exists set_signal_posts_updated_at on public.signal_posts;
create trigger set_signal_posts_updated_at
before update on public.signal_posts
for each row
execute function public.set_updated_at();
