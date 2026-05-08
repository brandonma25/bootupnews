alter table public.signal_posts
  add column if not exists editorial_decision text,
  add column if not exists decision_note text,
  add column if not exists rejected_reason text,
  add column if not exists held_reason text,
  add column if not exists replacement_of_row_id uuid,
  add column if not exists reviewed_by text,
  add column if not exists reviewed_at timestamptz;

alter table public.signal_posts
  drop constraint if exists signal_posts_editorial_decision_check,
  drop constraint if exists signal_posts_replacement_of_row_id_fkey;

alter table public.signal_posts
  add constraint signal_posts_editorial_decision_check
    check (
      editorial_decision is null
      or editorial_decision in (
        'pending_review',
        'draft_edited',
        'approved',
        'rewrite_requested',
        'rejected',
        'held',
        'removed_from_slate'
      )
    ),
  add constraint signal_posts_replacement_of_row_id_fkey
    foreign key (replacement_of_row_id)
    references public.signal_posts(id)
    on delete set null;
