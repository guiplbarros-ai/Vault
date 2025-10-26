# Exemplos de Uso das Ferramentas Supabase MCP

Este documento contém exemplos práticos de como usar cada ferramenta do servidor MCP Supabase.

## 1. supabase_query - Consultar Dados

### Exemplo básico: listar todos os registros

```
Use supabase_query para buscar todos os usuários
```

Parâmetros equivalentes:
```json
{
  "table": "users",
  "select": "*"
}
```

### Exemplo com filtros

```
Busque todos os usuários com status "active"
```

Parâmetros:
```json
{
  "table": "users",
  "select": "*",
  "filters": {
    "status": "active"
  }
}
```

### Exemplo com colunas específicas

```
Liste apenas o id, nome e email dos usuários
```

Parâmetros:
```json
{
  "table": "users",
  "select": "id, name, email"
}
```

### Exemplo com ordenação e limite

```
Mostre os 5 usuários mais recentes
```

Parâmetros:
```json
{
  "table": "users",
  "select": "*",
  "order": "created_at.desc",
  "limit": 5
}
```

### Exemplo completo

```
Busque os 10 pedidos ativos do usuário com id 123, ordenados por data
```

Parâmetros:
```json
{
  "table": "orders",
  "select": "id, total, created_at, status",
  "filters": {
    "user_id": 123,
    "status": "active"
  },
  "order": "created_at.desc",
  "limit": 10
}
```

## 2. supabase_insert - Inserir Dados

### Exemplo básico: inserir um registro

```
Adicione um novo usuário com nome "João Silva" e email "joao@example.com"
```

Parâmetros:
```json
{
  "table": "users",
  "data": {
    "name": "João Silva",
    "email": "joao@example.com",
    "status": "active"
  }
}
```

### Exemplo: inserir múltiplos registros

```
Adicione 3 novos produtos na tabela products
```

Parâmetros:
```json
{
  "table": "products",
  "data": [
    {
      "name": "Produto A",
      "price": 29.99,
      "stock": 100
    },
    {
      "name": "Produto B",
      "price": 49.99,
      "stock": 50
    },
    {
      "name": "Produto C",
      "price": 19.99,
      "stock": 200
    }
  ]
}
```

## 3. supabase_update - Atualizar Dados

### Exemplo básico: atualizar um registro

```
Mude o status do usuário com id 5 para "inactive"
```

Parâmetros:
```json
{
  "table": "users",
  "data": {
    "status": "inactive"
  },
  "filters": {
    "id": 5
  }
}
```

### Exemplo: atualizar múltiplos campos

```
Atualize o nome e email do usuário com id 10
```

Parâmetros:
```json
{
  "table": "users",
  "data": {
    "name": "Maria Santos",
    "email": "maria.santos@example.com",
    "updated_at": "2024-01-20T10:00:00Z"
  },
  "filters": {
    "id": 10
  }
}
```

### Exemplo: atualizar múltiplos registros

```
Marque todos os pedidos pendentes como "processando"
```

Parâmetros:
```json
{
  "table": "orders",
  "data": {
    "status": "processing"
  },
  "filters": {
    "status": "pending"
  }
}
```

## 4. supabase_delete - Deletar Dados

### Exemplo básico: deletar um registro

```
Delete o usuário com id 15
```

Parâmetros:
```json
{
  "table": "users",
  "filters": {
    "id": 15
  }
}
```

### Exemplo: deletar múltiplos registros

```
Remova todos os pedidos cancelados
```

Parâmetros:
```json
{
  "table": "orders",
  "filters": {
    "status": "cancelled"
  }
}
```

## 5. supabase_list_tables - Listar Tabelas

### Exemplo básico

```
Liste todas as tabelas do banco de dados
```

Parâmetros:
```json
{}
```

**Nota**: Esta ferramenta requer a função RPC `exec_sql` configurada no Supabase (veja setup.sql).

## 6. supabase_get_schema - Obter Estrutura da Tabela

### Exemplo básico

```
Mostre a estrutura da tabela "users"
```

Parâmetros:
```json
{
  "table": "users"
}
```

**Nota**: Esta ferramenta também requer a função RPC `exec_sql`.

## 7. supabase_rpc - Executar Função RPC

### Exemplo básico: chamar função sem parâmetros

```
Execute a função "get_user_stats"
```

Parâmetros:
```json
{
  "function_name": "get_user_stats"
}
```

### Exemplo: chamar função com parâmetros

```
Execute a função "calculate_total" para o usuário 123
```

Parâmetros:
```json
{
  "function_name": "calculate_total",
  "params": {
    "user_id": 123
  }
}
```

## Exemplos de Conversas Naturais

Você pode pedir ao Claude de forma natural:

1. **Análise de dados**:
   - "Quantos usuários ativos temos no sistema?"
   - "Mostre os 10 pedidos mais recentes"
   - "Liste todos os produtos com estoque abaixo de 10 unidades"

2. **Criação de registros**:
   - "Crie um novo usuário chamado Pedro com email pedro@test.com"
   - "Adicione um pedido para o usuário 5 com total de R$ 150,00"

3. **Atualizações**:
   - "Atualize o preço do produto com id 20 para R$ 99,90"
   - "Marque todos os pedidos de ontem como entregues"

4. **Análise de estrutura**:
   - "Qual a estrutura da tabela orders?"
   - "Quais tabelas existem no banco de dados?"

## Dicas de Uso

1. **Seja específico**: Quanto mais detalhes você fornecer, melhor o Claude entenderá o que você precisa.

2. **Use filtros**: Sempre que possível, use filtros para limitar os resultados e melhorar a performance.

3. **Limite resultados**: Para tabelas grandes, sempre use `limit` para evitar retornar muitos dados.

4. **Segurança**: Tenha cuidado ao usar `supabase_delete` com filtros amplos - você pode deletar mais registros do que pretendia.

5. **RPC Functions**: Para operações complexas, considere criar funções RPC no Supabase e chamá-las usando `supabase_rpc`.

## Próximos Passos

- Configure Row Level Security (RLS) no Supabase para maior segurança
- Crie funções RPC personalizadas para operações complexas
- Explore relacionamentos entre tabelas usando joins no `select`
- Configure triggers e webhooks no Supabase para automações
