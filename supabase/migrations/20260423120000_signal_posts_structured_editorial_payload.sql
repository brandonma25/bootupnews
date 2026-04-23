alter table public.signal_posts
  add column if not exists edited_why_it_matters_payload jsonb,
  add column if not exists published_why_it_matters_payload jsonb;
