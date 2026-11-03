-- Provider preset (phase 13a, D10): remembers which console preset filled the
-- connection so a reload restores the same provider instead of "Custom".
-- 'custom' is the safe default for rows written before this migration.

alter table public.ai_config
  add column if not exists provider_preset text not null default 'custom';

alter table public.ai_config drop constraint if exists ai_config_provider_preset_check;
alter table public.ai_config
  add constraint ai_config_provider_preset_check
  check (provider_preset in ('commandcode', 'opencode', 'custom'));

comment on column public.ai_config.provider_preset is 'Console preset chosen on /admin/ai: commandcode, opencode or custom. Selecting a preset only survives a reload after Save.';

-- ROLLBACK (commented — nothing below runs)
-- alter table public.ai_config drop constraint if exists ai_config_provider_preset_check;
-- alter table public.ai_config drop column if exists provider_preset;
