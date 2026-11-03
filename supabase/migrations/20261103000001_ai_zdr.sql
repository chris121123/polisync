-- Zero data retention (phase 13a): the edge sends `x-cmd-zdr: 1`, and a model
-- with no ZDR upstream fails 422 instead of silently falling back.

alter table public.ai_config add column if not exists zdr boolean not null default true;

comment on column public.ai_config.zdr is 'Zero data retention: the edge sends x-cmd-zdr: 1; providers without a ZDR upstream fail 422 instead of falling back.';

-- ROLLBACK (commented — nothing below runs)
-- alter table public.ai_config drop column if exists zdr;
