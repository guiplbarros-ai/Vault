-- Supabase init migration (extensions, tables, indexes, triggers, RLS)

-- Extensions
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;
create extension if not exists "uuid-ossp";
create extension if not exists pg_stat_statements;

-- Tables
create table if not exists instituicao (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  nome text not null,
  tipo text,
  created_at timestamptz not null default now()
);

create table if not exists conta (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  instituicao_id uuid references instituicao(id) on delete cascade,
  apelido text,
  tipo text,
  moeda text not null default 'BRL',
  ativa boolean not null default true
);

create table if not exists categoria (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  grupo text,
  nome text not null,
  ativa boolean not null default true
);

create table if not exists transacao (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  conta_id uuid not null references conta(id) on delete cascade,
  data date not null,
  descricao text not null,
  valor numeric(14,2) not null,
  tipo text not null check (tipo in ('debito','credito')),
  id_externo text,
  saldo_apos numeric(14,2),
  hash_dedupe text not null,
  parcela_n int,
  parcelas_total int,
  link_original_id uuid,
  valor_original numeric(14,2),
  moeda_original text
);

create table if not exists regra_classificacao (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  ordem int not null,
  expressao text not null,
  tipo_regra text not null check (tipo_regra in ('regex','contains','starts','ends')),
  categoria_id uuid references categoria(id),
  tags text[],
  confianca_min numeric(3,2)
);

create table if not exists template_importacao (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  instituicao_id uuid references instituicao(id),
  mapeamento_json jsonb not null,
  header_idx int,
  sep text,
  exemplos jsonb
);

create table if not exists recorrencia (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  descricao text,
  periodicidade text,
  proximo_lanc date,
  valor_est numeric(14,2)
);

create table if not exists orcamento (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  mes date,
  categoria_id uuid references categoria(id),
  valor_alvo numeric(14,2)
);

create table if not exists meta (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  nome text,
  conta_id uuid references conta(id),
  valor_alvo numeric(14,2),
  progresso numeric(14,2)
);

create table if not exists log_ia (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  ts timestamptz not null default now(),
  tarefa text,
  modelo text,
  tokens_in int,
  tokens_out int,
  custo_usd numeric(10,4),
  score numeric(4,2),
  detalhe jsonb
);

create table if not exists preferencias (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  moeda text not null default 'BRL',
  fuso text not null default 'America/Sao_Paulo',
  modo_tema text not null default 'system',
  limites_alerta jsonb
);

-- Indexes & constraints
create unique index if not exists idx_tx_user_hash on transacao(user_id, hash_dedupe);
create index if not exists idx_tx_user_conta_data on transacao(user_id, conta_id, data);
create index if not exists idx_regra_user_ordem on regra_classificacao(user_id, ordem);
create index if not exists idx_template_user_inst on template_importacao(user_id, instituicao_id);

-- Trigger functions
create or replace function set_user_id() returns trigger as $$
begin
  if new.user_id is null then new.user_id := auth.uid(); end if;
  return new;
end; $$ language plpgsql;

create or replace function compute_hash_dedupe(d date, v numeric, descricao text, c uuid)
returns text as $$
  select encode(digest(coalesce(d::text,'')||'|'||coalesce(v::text,'')||'|'||coalesce(descricao,'')||'|'||coalesce(c::text,''),'sha256'),'hex');
$$ language sql stable;

create or replace function set_transacao_hash() returns trigger as $$
begin
  new.hash_dedupe := compute_hash_dedupe(new.data, new.valor, new.descricao, new.conta_id);
  return new;
end; $$ language plpgsql;

-- Triggers
drop trigger if exists transacao_set_user on transacao;
create trigger transacao_set_user
before insert on transacao for each row execute procedure set_user_id();

drop trigger if exists transacao_hash_biu on transacao;
create trigger transacao_hash_biu
before insert or update of data, valor, descricao, conta_id on transacao
for each row execute procedure set_transacao_hash();

-- RLS enable & policies (owner)
alter table if exists instituicao enable row level security;
alter table if exists conta enable row level security;
alter table if exists categoria enable row level security;
alter table if exists transacao enable row level security;
alter table if exists regra_classificacao enable row level security;
alter table if exists template_importacao enable row level security;
alter table if exists recorrencia enable row level security;
alter table if exists orcamento enable row level security;
alter table if exists meta enable row level security;
alter table if exists log_ia enable row level security;
alter table if exists preferencias enable row level security;

drop policy if exists instituicao_is_owner on instituicao;
create policy instituicao_is_owner on instituicao for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists conta_is_owner on conta;
create policy conta_is_owner on conta for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists categoria_is_owner on categoria;
create policy categoria_is_owner on categoria for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists transacao_is_owner on transacao;
create policy transacao_is_owner on transacao for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists regra_is_owner on regra_classificacao;
create policy regra_is_owner on regra_classificacao for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists template_is_owner on template_importacao;
create policy template_is_owner on template_importacao for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists recorrencia_is_owner on recorrencia;
create policy recorrencia_is_owner on recorrencia for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists orcamento_is_owner on orcamento;
create policy orcamento_is_owner on orcamento for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists meta_is_owner on meta;
create policy meta_is_owner on meta for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists log_ia_is_owner on log_ia;
create policy log_ia_is_owner on log_ia for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists preferencias_is_owner on preferencias;
create policy preferencias_is_owner on preferencias for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
