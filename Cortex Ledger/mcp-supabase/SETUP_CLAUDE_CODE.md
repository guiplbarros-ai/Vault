# Configuração para Claude Code

Para usar este servidor MCP no Claude Code, siga os passos abaixo:

## 1. Localizar o arquivo de configuração

O arquivo de configuração MCP do Claude Code geralmente está localizado em:

- **macOS/Linux**: `~/.config/claude-code/mcp.json`
- **Windows**: `%APPDATA%\claude-code\mcp.json`

Se o arquivo não existir, crie-o.

## 2. Adicionar a configuração do servidor

Abra o arquivo `mcp.json` e adicione a seguinte configuração:

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

**Importante**: Se você já tiver outros servidores MCP configurados, apenas adicione a entrada "supabase" dentro de "mcpServers".

## 3. Reiniciar o Claude Code

Após salvar o arquivo de configuração, reinicie o Claude Code completamente.

## 4. Verificar a instalação

No Claude Code, você pode verificar se o servidor está funcionando pedindo:

```
Liste as ferramentas MCP disponíveis
```

Você deve ver as ferramentas do Supabase listadas, incluindo:
- supabase_query
- supabase_insert
- supabase_update
- supabase_delete
- supabase_list_tables
- supabase_get_schema
- supabase_rpc

## 5. Exemplo de uso

Experimente fazer uma consulta:

```
Use a ferramenta supabase_query para listar todos os registros da tabela "users"
```

O Claude Code irá usar o servidor MCP para executar a query e retornar os resultados.

## Troubleshooting

### Servidor não aparece

1. Verifique se o caminho no arquivo de configuração está correto
2. Certifique-se de que executou `npm run build` no diretório mcp-supabase
3. Verifique se o arquivo `.env` existe e contém as credenciais corretas
4. Verifique os logs do Claude Code para ver se há erros

### Erro de permissão

Se você receber um erro de permissão, pode ser necessário dar permissão de execução:

```bash
chmod +x /Users/guilhermebarros/Documents/Coding/Cortex Ledger/mcp-supabase/dist/index.js
```

### Erro ao conectar ao Supabase

Verifique se as credenciais no arquivo `.env` estão corretas e se o projeto Supabase está ativo.
