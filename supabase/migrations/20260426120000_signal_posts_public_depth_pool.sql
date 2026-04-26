alter table public.signal_posts
  drop constraint if exists signal_posts_rank_check;

alter table public.signal_posts
  add constraint signal_posts_rank_check check (rank between 1 and 20);

drop index if exists signal_posts_live_rank_key;

create unique index if not exists signal_posts_live_top_rank_key
on public.signal_posts (rank)
where is_live and rank between 1 and 5;
