-- Supabase schema (mínimo) para Cortex / Segundo Cérebro
-- Cole no SQL editor do Supabase e execute.

-- Recomendado (para UUIDs/crypto). Em alguns projetos já vem habilitado.
create extension if not exists pgcrypto;

-- WORKSPACES (separação por contexto)
create table if not exists public.workspaces (
  id text primary key,
  title text not null,
  created_at timestamptz not null default now()
);

insert into public.workspaces (id, title)
values ('pessoal', 'Pessoal')
on conflict (id) do nothing;

insert into public.workspaces (id, title)
values ('freelaw', 'Freelaw')
on conflict (id) do nothing;

-- NOTES
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'pessoal',
  title text not null,
  body_md text not null,
  type text not null default 'inbox',
  tags text[] not null default '{}'::text[],
  source text not null default 'telegram',
  context text not null default 'unknown',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Se a tabela já existia antes, garante colunas de migração
alter table public.notes add column if not exists source_path text null;
alter table public.notes add column if not exists source_hash text null;
alter table public.notes add column if not exists vault_id text null;
alter table public.notes add column if not exists imported_at timestamptz null;
alter table public.notes add column if not exists raw_frontmatter jsonb not null default '{}'::jsonb;

create index if not exists notes_workspace_updated_at_idx on public.notes (workspace_id, updated_at desc);
create index if not exists notes_title_idx on public.notes (title);
create index if not exists notes_source_path_idx on public.notes (workspace_id, source_path);

-- Upsert seguro para fontes externas (Notion/Gmail/Calendar/etc):
-- garante unicidade por (workspace, source, source_path) quando source_path existe.
create unique index if not exists notes_workspace_source_sourcepath_unique
  on public.notes (workspace_id, source, source_path)
  where source_path is not null;

-- Busca melhor (FTS) — simples e útil já no início
alter table public.notes
  add column if not exists body_tsv tsvector
  generated always as (
    to_tsvector('portuguese', coalesce(title,'') || ' ' || coalesce(body_md,''))
  ) stored;

create index if not exists notes_tsv_gin_idx on public.notes using gin (body_tsv);

-- OBSIDIAN SYNC STATE (rastreia import incremental)
create table if not exists public.obsidian_sync_state (
  workspace_id text not null default 'pessoal',
  vault_id text not null default 'default',
  source_path text not null,
  note_id uuid null references public.notes(id) on delete set null,
  source_hash text not null default '',
  file_mtime timestamptz null,
  last_synced_at timestamptz not null default now(),
  status text not null default 'ok', -- ok | skipped | error
  error text not null default '',
  primary key (workspace_id, vault_id, source_path)
);

create index if not exists obsidian_sync_note_idx on public.obsidian_sync_state (workspace_id, note_id);

-- RULES (manual versionado)
create table if not exists public.rules (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'pessoal',
  version int not null,
  body_md text not null,
  active boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists rules_workspace_version_idx on public.rules (workspace_id, version);
create index if not exists rules_workspace_active_idx on public.rules (workspace_id, active) where active = true;

-- Garante no máximo 1 regra ativa por workspace
create unique index if not exists rules_one_active_per_workspace_idx
  on public.rules (workspace_id)
  where active = true;

-- PEOPLE
create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'pessoal',
  name text not null,
  tags text[] not null default '{}'::text[],
  notes text not null default '',
  birthday_day int null,
  birthday_month int null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint birthday_day_range check (birthday_day is null or (birthday_day >= 1 and birthday_day <= 31)),
  constraint birthday_month_range check (birthday_month is null or (birthday_month >= 1 and birthday_month <= 12))
);

create index if not exists people_workspace_name_idx on public.people (workspace_id, name);
create index if not exists people_birthday_idx on public.people (workspace_id, birthday_month, birthday_day);

create table if not exists public.people_gifts (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'pessoal',
  person_id uuid not null references public.people(id) on delete cascade,
  idea text not null,
  created_at timestamptz not null default now()
);

create index if not exists people_gifts_person_idx on public.people_gifts (person_id);

-- PROFILE (dados do Guilherme / do workspace)
create table if not exists public.profiles (
  workspace_id text primary key default 'pessoal',
  display_name text not null default 'Guilherme',
  timezone text not null default 'America/Sao_Paulo',
  locale text not null default 'pt-BR',
  birthday_day int null,
  birthday_month int null,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_birthday_day_range check (birthday_day is null or (birthday_day >= 1 and birthday_day <= 31)),
  constraint profile_birthday_month_range check (birthday_month is null or (birthday_month >= 1 and birthday_month <= 12))
);

-- FACTS (key/value) — “memórias declarativas” rápidas
create table if not exists public.facts (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'pessoal',
  key text not null,
  value_text text not null default '',
  value_json jsonb not null default '{}'::jsonb,
  source text not null default 'telegram',
  confidence real not null default 1.0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists facts_workspace_key_idx on public.facts (workspace_id, key);

-- CHAT SETTINGS (contexto por chat do Telegram)
create table if not exists public.chat_settings (
  chat_id bigint primary key,
  workspace_id text not null default 'pessoal' references public.workspaces(id),
  google_account_email text null,
  timezone text not null default 'America/Sao_Paulo',
  weather_location text null,
  weather_location_label text null,
  config_mode boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Se a tabela já existia antes, garante que a coluna foi adicionada
alter table public.chat_settings
  add column if not exists google_account_email text null;

alter table public.chat_settings
  add column if not exists weather_location text null;

alter table public.chat_settings
  add column if not exists weather_location_label text null;

create index if not exists chat_settings_workspace_idx on public.chat_settings (workspace_id);
create index if not exists chat_settings_google_account_idx on public.chat_settings (google_account_email);

-- TAXONOMY (plano de contas / biblioteconomia)
create table if not exists public.taxons (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'pessoal' references public.workspaces(id),
  namespace text not null, -- ex: 'area', 'tipo', 'tag'
  slug text not null,      -- ex: 'casa', 'familia'
  title text not null,     -- ex: 'Casa', 'Família'
  parent_id uuid null references public.taxons(id) on delete set null,
  description text not null default '',
  created_at timestamptz not null default now()
);

create unique index if not exists taxons_unique_idx on public.taxons (workspace_id, namespace, slug);

-- Seed mínimo (pessoal)
insert into public.taxons (workspace_id, namespace, slug, title, description)
values
  ('pessoal','area','casa','Casa','Obra, manutenção, vida doméstica'),
  ('pessoal','area','casamento','Casamento','Relacionamento com a esposa, vida a dois'),
  ('pessoal','area','familia','Família','Família extensa, pais, irmãos, etc.'),
  ('pessoal','area','financas-pessoais','Finanças pessoais','Orçamento, gastos, investimentos'),
  ('pessoal','area','saude','Saúde','Saúde física e mental'),
  ('pessoal','area','amigos','Amigos','Relações e contatos pessoais'),
  ('pessoal','area','lazer','Lazer','Hobbies, viagens, diversão')
on conflict do nothing;

-- GOOGLE TOKENS (OAuth por workspace + conta)
create table if not exists public.google_tokens (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'pessoal' references public.workspaces(id),
  account_email text not null,
  tokens jsonb not null default '{}'::jsonb,
  scopes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint google_tokens_email_nonempty check (length(trim(account_email)) > 3)
);

create unique index if not exists google_tokens_workspace_email_idx
  on public.google_tokens (workspace_id, account_email);

-- USAGE EVENTS (custos/telemetria) — para report semanal de custos do bot
create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,                 -- ex: 'openai', 'fly'
  model text null,                        -- ex: 'gpt-4o'
  input_tokens int null,
  output_tokens int null,
  usd_estimate numeric null,              -- custo estimado em USD (quando disponível)
  chat_id bigint null,
  workspace_id text null references public.workspaces(id),
  meta jsonb not null default '{}'::jsonb, -- payload extra
  created_at timestamptz not null default now()
);

create index if not exists usage_events_created_at_idx on public.usage_events (created_at desc);
create index if not exists usage_events_provider_created_at_idx on public.usage_events (provider, created_at desc);

-- DIGEST SCHEDULES (persistência de agendamentos /resumo e /semanal)
create table if not exists public.digest_schedules (
  id uuid primary key default gen_random_uuid(),
  chat_id bigint not null,
  kind text not null default 'daily', -- 'daily' | 'weekly'
  cron_expression text not null,
  enabled boolean not null default true,
  timezone text not null default 'America/Sao_Paulo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint digest_kind_check check (kind in ('daily','weekly'))
);

create index if not exists digest_schedules_chat_kind_idx on public.digest_schedules (chat_id, kind);
create unique index if not exists digest_schedules_unique_idx on public.digest_schedules (chat_id, kind, cron_expression);

-- MEMORY REFRESH (estado incremental + histórico leve)
create table if not exists public.memory_refresh_state (
  workspace_id text primary key default 'pessoal' references public.workspaces(id),
  last_notes_indexed_at timestamptz null,
  updated_at timestamptz not null default now()
);

create table if not exists public.memory_refresh_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'pessoal' references public.workspaces(id),
  trigger text not null default 'scheduled', -- 'scheduled' | 'manual'
  status text not null default 'ok',         -- 'ok' | 'error'
  indexed_notes int not null default 0,
  error text not null default '',
  meta jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz null
);

create index if not exists memory_refresh_runs_workspace_started_idx on public.memory_refresh_runs (workspace_id, started_at desc);

-- NOTION REFRESH STATE (por workspace + database)
create table if not exists public.notion_refresh_state (
  workspace_id text not null default 'pessoal' references public.workspaces(id),
  database_id text not null,
  last_edited_time timestamptz null,
  updated_at timestamptz not null default now(),
  primary key (workspace_id, database_id)
);

-- Seed mínimo (freelaw)
insert into public.taxons (workspace_id, namespace, slug, title, description)
values
  ('freelaw','area','comunidade','Comunidade','Área de comunidade da Freelaw'),
  ('freelaw','area','financeiro','Financeiro','Financeiro da Freelaw'),
  ('freelaw','area','pessoas','Pessoas','Time e stakeholders'),
  ('freelaw','area','diretoria','Diretoria','Reuniões, decisões e pautas de diretoria'),
  ('freelaw','area','sociedade','Sociedade','Sócios, cap table, acordos e temas societários')
on conflict do nothing;

-- FINANCE (esqueleto completo para controle pessoal + import mensal)
--
-- Premissas:
-- - O bot NÃO cria lançamentos via Telegram; ele apenas CONSULTA/analisa.
-- - 1x/mês você sobe CSVs/OFX e o app processa e insere na base.
-- - Mantemos metadados de importação (runs/files/rows) + dedupe.

-- Instituições (bancos/corretoras/emissores)
create table if not exists public.finance_institutions (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'pessoal' references public.workspaces(id),
  slug text not null, -- ex: nubank, inter, bradesco, santander, xp
  name text not null, -- ex: Nubank
  kind text not null default 'bank', -- bank | broker | card_issuer | other
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finance_institution_kind check (kind in ('bank','broker','card_issuer','other')),
  constraint finance_institution_slug_nonempty check (length(trim(slug)) > 1)
);

create unique index if not exists finance_institutions_unique_idx
  on public.finance_institutions (workspace_id, slug);

create index if not exists finance_institutions_workspace_name_idx
  on public.finance_institutions (workspace_id, name);

-- Seed (pessoal): instituições citadas
insert into public.finance_institutions (workspace_id, slug, name, kind)
values
  ('pessoal','nubank','Nubank','bank'),
  ('pessoal','inter','Banco Inter','bank'),
  ('pessoal','bradesco','Bradesco','bank'),
  ('pessoal','santander','Santander','bank'),
  ('pessoal','xp','XP','broker')
on conflict (workspace_id, slug) do nothing;

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'pessoal',
  name text not null,
  institution text not null default '',
  currency text not null default 'BRL',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists accounts_workspace_name_idx on public.accounts (workspace_id, name);

-- Evolução do schema de accounts (sem quebrar compatibilidade)
alter table public.accounts add column if not exists institution_id uuid null references public.finance_institutions(id) on delete set null;
alter table public.accounts add column if not exists type text not null default 'checking'; -- checking | savings | credit_card | investment | cash | other
alter table public.accounts add column if not exists status text not null default 'open';  -- open | closed
alter table public.accounts add column if not exists opened_at date null;
alter table public.accounts add column if not exists closed_at date null;
alter table public.accounts add column if not exists last4 text null;
alter table public.accounts add column if not exists external_id text null; -- id estável do import (quando existir)
alter table public.accounts add column if not exists meta jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'accounts_type_check') then
    alter table public.accounts
      add constraint accounts_type_check check (type in ('checking','savings','credit_card','investment','cash','other'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'accounts_status_check') then
    alter table public.accounts
      add constraint accounts_status_check check (status in ('open','closed'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'accounts_last4_check') then
    alter table public.accounts
      add constraint accounts_last4_check check (last4 is null or last4 ~ '^[0-9]{4}$');
  end if;
end$$;

create index if not exists accounts_workspace_type_idx on public.accounts (workspace_id, type);
create index if not exists accounts_workspace_institution_idx on public.accounts (workspace_id, institution_id);
create unique index if not exists accounts_workspace_external_id_unique
  on public.accounts (workspace_id, external_id)
  where external_id is not null;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'pessoal',
  name text not null,
  kind text not null default 'expense',
  created_at timestamptz not null default now(),
  constraint category_kind check (kind in ('income','expense','transfer'))
);

create unique index if not exists categories_workspace_name_idx on public.categories (workspace_id, name);

-- Evolução do schema de categories (hierarquia + normalização)
alter table public.categories add column if not exists slug text null;
alter table public.categories add column if not exists parent_id uuid null references public.categories(id) on delete set null;
alter table public.categories add column if not exists system boolean not null default false; -- categorias "seed"/sistêmicas
alter table public.categories add column if not exists meta jsonb not null default '{}'::jsonb;

create index if not exists categories_workspace_parent_idx on public.categories (workspace_id, parent_id);
create unique index if not exists categories_workspace_slug_unique
  on public.categories (workspace_id, slug)
  where slug is not null;

-- Cartões (metadados) — um cartão pode mapear para uma "account" do tipo credit_card
create table if not exists public.finance_cards (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'pessoal' references public.workspaces(id),
  institution_id uuid null references public.finance_institutions(id) on delete set null,
  account_id uuid null references public.accounts(id) on delete set null,
  name text not null,                 -- ex: "Nubank Ultravioleta"
  brand text not null default '',      -- ex: "Nubank"
  network text not null default '',    -- ex: "visa", "mastercard", "elo", "amex"
  last4 text null,
  holder text not null default '',     -- ex: "Guilherme"
  status text not null default 'open', -- open | closed
  opened_at date null,
  closed_at date null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finance_cards_status_check check (status in ('open','closed')),
  constraint finance_cards_last4_check check (last4 is null or last4 ~ '^[0-9]{4}$')
);

create index if not exists finance_cards_workspace_name_idx on public.finance_cards (workspace_id, name);
create index if not exists finance_cards_workspace_account_idx on public.finance_cards (workspace_id, account_id);
create unique index if not exists finance_cards_workspace_institution_last4_unique
  on public.finance_cards (workspace_id, institution_id, last4)
  where institution_id is not null and last4 is not null;

-- Import runs (1x/mês; pode ter reprocessamentos)
create table if not exists public.finance_import_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'pessoal' references public.workspaces(id),
  period_month date not null, -- salvar como 1º dia do mês (YYYY-MM-01)
  status text not null default 'pending', -- pending | processing | done | error
  trigger text not null default 'manual', -- manual | scheduled
  notes text not null default '',
  error text not null default '',
  started_at timestamptz not null default now(),
  finished_at timestamptz null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finance_import_runs_status_check check (status in ('pending','processing','done','error')),
  constraint finance_import_runs_trigger_check check (trigger in ('manual','scheduled'))
);

create index if not exists finance_import_runs_workspace_month_idx
  on public.finance_import_runs (workspace_id, period_month desc, started_at desc);

-- Import files (referência aos documentos na "pasta da aplicação")
create table if not exists public.finance_import_files (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'pessoal' references public.workspaces(id),
  run_id uuid null references public.finance_import_runs(id) on delete set null,
  storage text not null default 'app_folder', -- app_folder | supabase_storage
  relative_path text not null,               -- ex: finance/inbox/2026-01/nubank/...
  original_filename text not null default '',
  file_ext text not null default '',         -- csv | ofx | ofc | txt | pdf
  mime_type text not null default '',
  file_size_bytes bigint null,
  sha256 text not null,                      -- dedupe forte por arquivo
  institution_id uuid null references public.finance_institutions(id) on delete set null,
  account_id uuid null references public.accounts(id) on delete set null,
  statement_start date null,
  statement_end date null,
  parser text not null default 'auto',       -- auto | csv | ofx
  status text not null default 'pending',    -- pending | parsed | loaded | error
  error text not null default '',
  meta jsonb not null default '{}'::jsonb,
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finance_import_files_storage_check check (storage in ('app_folder','supabase_storage')),
  constraint finance_import_files_status_check check (status in ('pending','parsed','loaded','error')),
  constraint finance_import_files_sha256_nonempty check (length(trim(sha256)) >= 16)
);

create unique index if not exists finance_import_files_workspace_sha256_unique
  on public.finance_import_files (workspace_id, sha256);

create index if not exists finance_import_files_workspace_account_idx
  on public.finance_import_files (workspace_id, account_id, statement_end desc);

create index if not exists finance_import_files_workspace_institution_idx
  on public.finance_import_files (workspace_id, institution_id, imported_at desc);

-- Staging: transações "raw" extraídas de OFX/CSV (antes de normalizar)
create table if not exists public.finance_transactions_raw (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'pessoal' references public.workspaces(id),
  import_file_id uuid not null references public.finance_import_files(id) on delete cascade,
  row_index int not null, -- para rastrear linha do CSV / ordem no OFX
  source_format text not null default 'auto', -- ofx | csv | auto
  external_id text null, -- ex: FITID (OFX) ou "id" do CSV quando existir
  occurred_at date null, -- data da compra/lançamento
  posted_at date null,   -- data de compensação
  amount_cents bigint not null,
  currency text not null default 'BRL',
  description_raw text not null default '',
  memo text not null default '',
  merchant_raw text not null default '',
  category_raw text not null default '',
  raw jsonb not null default '{}'::jsonb,
  dedupe_key text not null, -- chave determinística calculada pelo app
  created_at timestamptz not null default now(),
  constraint finance_raw_amount_nonzero check (amount_cents <> 0),
  constraint finance_raw_source_format_check check (source_format in ('ofx','csv','auto'))
);

create unique index if not exists finance_transactions_raw_file_row_unique
  on public.finance_transactions_raw (workspace_id, import_file_id, row_index);

create unique index if not exists finance_transactions_raw_dedupe_unique
  on public.finance_transactions_raw (workspace_id, dedupe_key);

create index if not exists finance_transactions_raw_workspace_dates_idx
  on public.finance_transactions_raw (workspace_id, coalesce(posted_at, occurred_at) desc);

-- Merchants (normalização opcional para análises)
create table if not exists public.finance_merchants (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'pessoal' references public.workspaces(id),
  name text not null,
  normalized_name text not null, -- ex: "ifood"
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finance_merchants_norm_nonempty check (length(trim(normalized_name)) > 1)
);

create unique index if not exists finance_merchants_workspace_norm_unique
  on public.finance_merchants (workspace_id, normalized_name);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'pessoal',
  account_id uuid null references public.accounts(id) on delete set null,
  occurred_at date not null,
  amount_cents bigint not null,
  currency text not null default 'BRL',
  description text not null default '',
  category_id uuid null references public.categories(id) on delete set null,
  kind text not null default 'expense',
  counterparty text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transaction_kind check (kind in ('income','expense','transfer')),
  constraint transaction_amount_nonzero check (amount_cents <> 0)
);

create index if not exists transactions_workspace_date_idx on public.transactions (workspace_id, occurred_at desc);

-- Evolução do schema de transactions (para link com import + dedupe + posted_at)
alter table public.transactions add column if not exists posted_at date null;
alter table public.transactions add column if not exists merchant text not null default '';
alter table public.transactions add column if not exists merchant_id uuid null references public.finance_merchants(id) on delete set null;
alter table public.transactions add column if not exists notes text not null default '';
alter table public.transactions add column if not exists import_file_id uuid null references public.finance_import_files(id) on delete set null;
alter table public.transactions add column if not exists raw_id uuid null references public.finance_transactions_raw(id) on delete set null;
alter table public.transactions add column if not exists external_id text null;
alter table public.transactions add column if not exists dedupe_key text null;
alter table public.transactions add column if not exists is_pending boolean not null default false;
alter table public.transactions add column if not exists meta jsonb not null default '{}'::jsonb;

create unique index if not exists transactions_workspace_dedupe_unique
  on public.transactions (workspace_id, dedupe_key)
  where dedupe_key is not null;

create index if not exists transactions_workspace_posted_idx
  on public.transactions (workspace_id, posted_at desc)
  where posted_at is not null;

create index if not exists transactions_workspace_category_idx
  on public.transactions (workspace_id, category_id, occurred_at desc);

-- Regras de categorização (match por regex/contains/exact)
create table if not exists public.finance_category_rules (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null default 'pessoal' references public.workspaces(id),
  enabled boolean not null default true,
  priority int not null default 100, -- menor = aplica antes
  match_type text not null default 'contains', -- contains | regex | exact
  match_value text not null,                 -- termo/regex (aplicado em description/merchant)
  account_id uuid null references public.accounts(id) on delete set null,
  institution_id uuid null references public.finance_institutions(id) on delete set null,
  category_id uuid not null references public.categories(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finance_category_rules_match_type_check check (match_type in ('contains','regex','exact'))
);

create index if not exists finance_category_rules_workspace_prio_idx
  on public.finance_category_rules (workspace_id, enabled desc, priority asc);

create index if not exists finance_category_rules_workspace_category_idx
  on public.finance_category_rules (workspace_id, category_id);

-- AUDIT LOG (recomendado)
create table if not exists public.audit_log (
  id bigserial primary key,
  workspace_id text not null default 'pessoal',
  actor text not null default 'system',
  action text not null,
  entity_type text not null,
  entity_id uuid null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_workspace_created_idx on public.audit_log (workspace_id, created_at desc);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'notes_set_updated_at') then
    create trigger notes_set_updated_at before update on public.notes
    for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'people_set_updated_at') then
    create trigger people_set_updated_at before update on public.people
    for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'accounts_set_updated_at') then
    create trigger accounts_set_updated_at before update on public.accounts
    for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'transactions_set_updated_at') then
    create trigger transactions_set_updated_at before update on public.transactions
    for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'finance_institutions_set_updated_at') then
    create trigger finance_institutions_set_updated_at before update on public.finance_institutions
    for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'finance_cards_set_updated_at') then
    create trigger finance_cards_set_updated_at before update on public.finance_cards
    for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'finance_import_runs_set_updated_at') then
    create trigger finance_import_runs_set_updated_at before update on public.finance_import_runs
    for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'finance_import_files_set_updated_at') then
    create trigger finance_import_files_set_updated_at before update on public.finance_import_files
    for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'finance_merchants_set_updated_at') then
    create trigger finance_merchants_set_updated_at before update on public.finance_merchants
    for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'finance_category_rules_set_updated_at') then
    create trigger finance_category_rules_set_updated_at before update on public.finance_category_rules
    for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'profiles_set_updated_at') then
    create trigger profiles_set_updated_at before update on public.profiles
    for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'facts_set_updated_at') then
    create trigger facts_set_updated_at before update on public.facts
    for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'chat_settings_set_updated_at') then
    create trigger chat_settings_set_updated_at before update on public.chat_settings
    for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'google_tokens_set_updated_at') then
    create trigger google_tokens_set_updated_at before update on public.google_tokens
    for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'memory_refresh_state_set_updated_at') then
    create trigger memory_refresh_state_set_updated_at before update on public.memory_refresh_state
    for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'notion_refresh_state_set_updated_at') then
    create trigger notion_refresh_state_set_updated_at before update on public.notion_refresh_state
    for each row execute function public.set_updated_at();
  end if;
end$$;

-- RLS: para o MVP, habilitamos RLS e deixamos sem policies.
-- Resultado:
-- - requests anon/auth não acessam nada por padrão
-- - service_role (backend) continua com acesso total (bypass)
alter table public.notes enable row level security;
alter table public.obsidian_sync_state enable row level security;
alter table public.rules enable row level security;
alter table public.people enable row level security;
alter table public.people_gifts enable row level security;
alter table public.profiles enable row level security;
alter table public.facts enable row level security;
alter table public.chat_settings enable row level security;
alter table public.taxons enable row level security;
alter table public.workspaces enable row level security;
alter table public.google_tokens enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.finance_institutions enable row level security;
alter table public.finance_cards enable row level security;
alter table public.finance_import_runs enable row level security;
alter table public.finance_import_files enable row level security;
alter table public.finance_transactions_raw enable row level security;
alter table public.finance_merchants enable row level security;
alter table public.finance_category_rules enable row level security;
alter table public.audit_log enable row level security;
alter table public.memory_refresh_state enable row level security;
alter table public.memory_refresh_runs enable row level security;
alter table public.notion_refresh_state enable row level security;

