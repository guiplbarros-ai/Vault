# MCP Supabase no Cursor (SQL direto)

Objetivo: rodar **consultas e correções rápidas** no Supabase direto pelo Cursor, sem ficar alternando entre editor/Studio.

## 1) Pré-requisitos
- Ter o connection string do Postgres do Supabase (Settings → Database → Connection string).

## 2) Variáveis de ambiente

Defina:
- `SUPABASE_DB_URL`: **Postgres connection string** (com senha).

> Importante: isso dá acesso ao banco. Trate como segredo.

## 3) Rodar o servidor MCP localmente

No repo `Gestor Obsidian`:

```bash
npm run mcp:supabase
```

Se estiver tudo certo, o processo fica “em pé” aguardando o Cursor.

## 4) Configurar no Cursor

No `mcp.json` do Cursor (seu setup), aponte para este comando:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npm",
      "args": ["run", "mcp:supabase"],
      "env": {
        "SUPABASE_DB_URL": "postgresql://...:...@...:5432/postgres"
      }
    }
  }
}
```

## 5) Ferramentas disponíveis
- `supabase_tables`: lista tabelas do schema public
- `supabase_sql`: executa SQL (DDL/DML/SELECT)

