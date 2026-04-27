alter table public.signal_posts
  add column if not exists why_it_matters_validation_status text,
  add column if not exists why_it_matters_validation_failures text[],
  add column if not exists why_it_matters_validation_details text[],
  add column if not exists why_it_matters_validated_at timestamptz;

update public.signal_posts
set
  why_it_matters_validation_status = coalesce(why_it_matters_validation_status, 'passed'),
  why_it_matters_validation_failures = coalesce(why_it_matters_validation_failures, '{}'::text[]),
  why_it_matters_validation_details = coalesce(why_it_matters_validation_details, '{}'::text[]);

alter table public.signal_posts
  alter column why_it_matters_validation_status set default 'passed',
  alter column why_it_matters_validation_status set not null,
  alter column why_it_matters_validation_failures set default '{}'::text[],
  alter column why_it_matters_validation_failures set not null,
  alter column why_it_matters_validation_details set default '{}'::text[],
  alter column why_it_matters_validation_details set not null;

alter table public.signal_posts
  drop constraint if exists signal_posts_why_it_matters_validation_status_check;

alter table public.signal_posts
  add constraint signal_posts_why_it_matters_validation_status_check
    check (why_it_matters_validation_status in ('passed', 'requires_human_rewrite'));
