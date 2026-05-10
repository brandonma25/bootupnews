alter table public.signal_posts
  drop constraint if exists signal_posts_public_source_url_check;

alter table public.signal_posts
  add constraint signal_posts_public_source_url_check
  check (btrim(source_url) <> '' and source_url ~* '^https?://');
