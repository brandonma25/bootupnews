alter table public.user_profiles
  add column if not exists avatar_url text;

alter table public.user_profiles
  add column if not exists newsletter_enabled boolean;

update public.user_profiles
set newsletter_enabled = false
where newsletter_enabled is null;

alter table public.user_profiles
  alter column newsletter_enabled set default false,
  alter column newsletter_enabled set not null;

alter table public.user_profiles
  add column if not exists category_preferences text[];

update public.user_profiles
set category_preferences = array['tech', 'finance', 'politics']::text[]
where category_preferences is null or cardinality(category_preferences) = 0;

alter table public.user_profiles
  alter column category_preferences set default array['tech', 'finance', 'politics']::text[],
  alter column category_preferences set not null;

alter table public.user_profiles
  drop constraint if exists user_profiles_category_preferences_check;

alter table public.user_profiles
  add constraint user_profiles_category_preferences_check
  check (
    category_preferences <@ array['tech', 'finance', 'politics']::text[]
  );

alter table public.sources
  alter column topic_id drop not null;
