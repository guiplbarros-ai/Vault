# MCP Supabase Server

Servidor MCP (Model Context Protocol) para integração com Supabase, permitindo que o Cursor e Claude Code interajam diretamente com seu banco de dados Supabase.

## Funcionalidades

Este servidor MCP oferece as seguintes ferramentas:

- **supabase_query**: Executa queries SELECT com filtros, ordenação e limite
- **supabase_insert**: Insere um ou mais registros em uma tabela
- **supabase_update**: Atualiza registros existentes
- **supabase_delete**: Remove registros de uma tabela
- **supabase_list_tables**: Lista todas as tabelas do schema public
- **supabase_get_schema**: Obtém o schema (colunas e tipos) de uma tabela
- **supabase_rpc**: Executa funções RPC personalizadas

## Instalação

1. Instale as dependências:

```bash
cd mcp-supabase
npm install
```

2. Configure as variáveis de ambiente:

Copie o arquivo `.env.example` para `.env` e preencha com suas credenciais do Supabase:

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas credenciais.

3. Compile o TypeScript:

```bash
npm run build
```

## Configuração no Claude Code

Para usar este servidor MCP no Claude Code, adicione a seguinte configuração ao seu arquivo de configuração MCP (`~/.config/claude-code/mcp.json` ou similar):

```json
{
  "mcpServers": {
    "supabase": {
      "command": "node",
      "args": [
        "/caminho/absoluto/para/mcp-supabase/dist/index.js"
      ]
    }
  }
}
```

**Importante**: Substitua `/caminho/absoluto/para/mcp-supabase` pelo caminho absoluto real da pasta onde você instalou o servidor.

## Configuração no Cursor

Para usar no Cursor, adicione ao arquivo de configuração do Cursor (`cursor.json` ou similar):

```json
{
  "mcpServers": {
    "supabase": {
      "command": "node",
      "args": [
        "/Users/guilhermebarros/Documents/Coding/Cortex Ledger/mcp-supabase/dist/index.js"
      ]
    }
  }
}
```

## Exemplos de Uso

### Consultar dados

```
Usando a ferramenta supabase_query:
{
  "table": "users",
  "select": "id, name, email",
  "filters": { "status": "active" },
  "limit": 10,
  "order": "created_at.desc"
}
```

### Inserir dados

```
Usando a ferramenta supabase_insert:
{
  "table": "users",
  "data": {
    "name": "João Silva",
    "email": "joao@example.com",
    "status": "active"
  }
}
```

### Atualizar dados

```
Usando a ferramenta supabase_update:
{
  "table": "users",
  "data": { "status": "inactive" },
  "filters": { "id": 123 }
}
```

### Deletar dados

```
Usando a ferramenta supabase_delete:
{
  "table": "users",
  "filters": { "id": 123 }
}
```

## Configuração Opcional: Função RPC para Metadados

Para usar as ferramentas `supabase_list_tables` e `supabase_get_schema`, você precisa criar uma função RPC no Supabase. Execute o seguinte SQL no SQL Editor do Supabase:

```sql
CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  EXECUTE sql INTO result;
  RETURN result;
END;
$$;
```

**Atenção**: Esta função permite execução de SQL arbitrário. Use com cuidado e apenas com a service_role key.

## Segurança

- O arquivo `.env` contém credenciais sensíveis e está no `.gitignore` por padrão
- Use a `SUPABASE_SERVICE_ROLE_KEY` apenas em ambientes seguros
- Nunca compartilhe suas chaves publicamente
- Considere usar Row Level Security (RLS) no Supabase para proteção adicional

## Desenvolvimento

Para desenvolvimento com hot reload:

```bash
npm run dev
```

Para compilar:

```bash
npm run build
```

Para executar:

```bash
npm start
```

## Estrutura do Projeto

```
mcp-supabase/
├── src/
│   └── index.ts          # Código principal do servidor MCP
├── dist/                 # Código compilado (gerado)
├── .env                  # Variáveis de ambiente (não versionado)
├── .env.example          # Exemplo de variáveis de ambiente
├── .gitignore
├── package.json
├── tsconfig.json
├── mcp-config.json       # Configuração de exemplo
└── README.md
```

## Troubleshooting

### Erro: "SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são necessários"

Certifique-se de que o arquivo `.env` existe e contém as variáveis corretas.

### Erro ao listar tabelas ou obter schema

Você precisa criar a função RPC `exec_sql` no Supabase (veja seção "Configuração Opcional").

### Servidor não aparece no Cursor/Claude Code

1. Verifique se o caminho no arquivo de configuração está correto
2. Certifique-se de que executou `npm run build`
3. Reinicie o Cursor/Claude Code após alterar a configuração

## Licença

MIT
