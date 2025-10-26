# Configuração para Cursor

Para usar este servidor MCP no Cursor, siga os passos abaixo:

## 1. Localizar o arquivo de configuração

O Cursor usa um arquivo de configuração para servidores MCP. Localize ou crie o arquivo:

- **macOS/Linux**: `~/.cursor/mcp.json` ou `~/.config/cursor/mcp.json`
- **Windows**: `%APPDATA%\Cursor\mcp.json`

Você também pode configurar por projeto criando um arquivo `.cursor/mcp.json` na raiz do seu projeto.

## 2. Adicionar a configuração do servidor

Abra ou crie o arquivo `mcp.json` e adicione:

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

**Nota**: Se você já tiver outros servidores configurados, apenas adicione a entrada "supabase".

## 3. Configuração por projeto (alternativa)

Para usar apenas em um projeto específico, crie o arquivo `.cursor/mcp.json` na raiz do seu projeto:

```bash
mkdir -p .cursor
```

E adicione a mesma configuração acima no arquivo `.cursor/mcp.json`.

## 4. Reiniciar o Cursor

Após salvar o arquivo de configuração:

1. Feche completamente o Cursor
2. Reabra o Cursor
3. Aguarde alguns segundos para o servidor MCP inicializar

## 5. Verificar a instalação

No Cursor, abra o chat com Claude e pergunte:

```
Quais ferramentas MCP estão disponíveis?
```

Você deve ver as ferramentas do Supabase listadas.

## 6. Exemplo de uso no Cursor

Experimente pedir ao Claude no Cursor:

```
Liste todos os usuários da tabela users usando o Supabase
```

O Claude utilizará automaticamente a ferramenta `supabase_query` para executar a consulta.

## Comandos úteis

### Consultar dados
```
Mostre os últimos 10 registros da tabela "orders" ordenados por data
```

### Inserir dados
```
Adicione um novo usuário na tabela users com nome "Maria" e email "maria@example.com"
```

### Atualizar dados
```
Atualize o status do usuário com id 5 para "inactive"
```

### Obter schema
```
Mostre a estrutura da tabela "products"
```

## Troubleshooting

### Servidor não inicia

1. Verifique os logs do Cursor (Help > Toggle Developer Tools > Console)
2. Certifique-se de que o Node.js está instalado: `node --version`
3. Verifique se o caminho no arquivo de configuração está correto
4. Execute `npm run build` novamente no diretório mcp-supabase

### Ferramentas não aparecem

1. Reinicie o Cursor completamente
2. Aguarde alguns segundos após a inicialização
3. Verifique se o arquivo de configuração está no local correto
4. Tente usar a configuração por projeto em `.cursor/mcp.json`

### Erro de conexão com Supabase

Verifique:
1. O arquivo `.env` existe e está preenchido corretamente
2. As credenciais do Supabase estão corretas
3. Seu projeto Supabase está ativo
4. A URL do Supabase está no formato correto: `https://xborrshstfcvzrxyqyor.supabase.co`
