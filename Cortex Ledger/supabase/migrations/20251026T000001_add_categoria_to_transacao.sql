-- Add categoria_id column to transacao table
-- This column links transactions to categories for classification

alter table transacao
  add column if not exists categoria_id uuid references categoria(id) on delete set null;

-- Create index for better query performance
create index if not exists idx_tx_categoria on transacao(categoria_id);

-- Add created_at columns if missing (for consistency)
alter table instituicao add column if not exists created_at timestamptz not null default now();
alter table conta add column if not exists created_at timestamptz not null default now();
alter table categoria add column if not exists created_at timestamptz not null default now();
alter table categoria add column if not exists ordem int not null default 0;
alter table transacao add column if not exists created_at timestamptz not null default now();
