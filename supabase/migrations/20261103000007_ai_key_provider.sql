-- Saved-key provider binding (phase 14a, plan §1 D4): remembers which console
-- preset the saved `api_key` was entered under, so /admin/ai offers "Clear
-- saved key" only for the provider that owns the key.
--
-- What this does
--   1. `ai_config.key_provider` — the preset the saved key belongs to. Nullable
--      on purpose: null means "no key association" (nothing saved, or cleared).
--      A `not null default 'custom'` would instead claim a stale 'custom'
--      binding after the key is cleared, which the page cannot distinguish from
--      a real custom key.
--   2. Backfill: a row that already holds a key adopts its `provider_preset`
--      (today's saved key belongs to CommandCode), so the per-provider Clear
--      state is correct on the first reload after deploy.
--
-- Additive and reversible: no row is deleted, no column is narrowed, RLS and
-- grants are untouched (`ai_config` stays edge-only, service role reads it).
--
-- Re-runnable: `if not exists` on the column, drop-then-add on the CHECK, and
-- the backfill only touches rows that still have a key and no binding.
--
-- Ordering: apply before deploying the `ai-config` edge that reads the column.

alter table public.ai_config
  add column if not exists key_provider text;

alter table public.ai_config drop constraint if exists ai_config_key_provider_check;
alter table public.ai_config
  add constraint ai_config_key_provider_check
  check (key_provider in ('commandcode', 'opencode', 'custom'));

comment on column public.ai_config.key_provider is 'Provider the saved api_key was entered under: commandcode, opencode or custom; null = no key association. The key is provider-scoped: ai-config:get returns keyProvider and never the key.';

update public.ai_config
   set key_provider = provider_preset
 where key_provider is null
   and api_key is not null;

-- Verify after running:
--   select provider_preset, key_provider, api_key is not null as has_key
--     from public.ai_config where id = 1;

-- ── ROLLBACK (commented — nothing below runs) ───────────────────────────────
-- Dropping the column loses only the key/provider association: the key and
-- every other setting stay, and "Clear saved key" reverts to a plain hasKey
-- check.
-- alter table public.ai_config drop constraint if exists ai_config_key_provider_check;
-- alter table public.ai_config drop column if exists key_provider;
