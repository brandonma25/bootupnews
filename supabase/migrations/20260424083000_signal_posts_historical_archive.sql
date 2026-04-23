alter table public.signal_posts
  add column if not exists briefing_date date,
  add column if not exists is_live boolean;

update public.signal_posts
set
  briefing_date = coalesce(briefing_date, published_at::date, created_at::date, current_date),
  is_live = coalesce(
    is_live,
    case
      when published_at is not null or editorial_status = 'published' then true
      else false
    end
  );

alter table public.signal_posts
  alter column briefing_date set default current_date,
  alter column briefing_date set not null,
  alter column is_live set default false,
  alter column is_live set not null;

drop index if exists signal_posts_rank_key;

alter table public.signal_posts
  drop constraint if exists signal_posts_rank_key,
  drop constraint if exists signal_posts_rank_check;

alter table public.signal_posts
  add constraint signal_posts_rank_check check (rank between 1 and 5),
  add constraint signal_posts_briefing_date_rank_key unique (briefing_date, rank);

create unique index if not exists signal_posts_live_rank_key
on public.signal_posts (rank)
where is_live;
