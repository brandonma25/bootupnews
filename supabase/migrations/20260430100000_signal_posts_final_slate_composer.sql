alter table public.signal_posts
  add column if not exists final_slate_rank integer,
  add column if not exists final_slate_tier text;

alter table public.signal_posts
  drop constraint if exists signal_posts_final_slate_rank_check,
  drop constraint if exists signal_posts_final_slate_tier_check,
  drop constraint if exists signal_posts_final_slate_placement_check;

alter table public.signal_posts
  add constraint signal_posts_final_slate_rank_check
    check (final_slate_rank is null or final_slate_rank between 1 and 7),
  add constraint signal_posts_final_slate_tier_check
    check (final_slate_tier is null or final_slate_tier in ('core', 'context')),
  add constraint signal_posts_final_slate_placement_check
    check (
      (final_slate_rank is null and final_slate_tier is null)
      or (final_slate_rank between 1 and 5 and final_slate_tier = 'core')
      or (final_slate_rank between 6 and 7 and final_slate_tier = 'context')
    );

create unique index if not exists signal_posts_briefing_date_final_slate_rank_key
on public.signal_posts (briefing_date, final_slate_rank)
where final_slate_rank is not null;
