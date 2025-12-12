import { Command } from 'commander';
import { logger } from '../utils/logger.js';

/**
 * Comandos do Notion
 * 
 * NOTA: O Notion está integrado via MCP no Cursor.
 * Estes comandos servem como guia para o Cursor usar os MCP tools.
 * 
 * O Cursor pode usar diretamente:
 * - mcp_Notion_notion-search: buscar páginas e databases
 * - mcp_Notion_notion-fetch: ler conteúdo de uma página
 * - mcp_Notion_notion-create-pages: criar novas páginas
 * - mcp_Notion_notion-update-page: atualizar páginas existentes
 */

export function createNotionCommand(): Command {
  const notion = new Command('notion')
    .description('Guia de integração com Notion via MCP');

  // Guia de uso
  notion
    .command('help')
    .description('Mostra como usar a integração com Notion')
    .action(() => {
      console.log(`
📘 Integração com Notion

O Notion está conectado via MCP no Cursor. Use os seguintes comandos:

🔍 BUSCAR PÁGINAS:
   Peça ao Cursor: "Busque no Notion por [termo]"
   
   Exemplos:
   - "Busque no Notion por documentos financeiros"
   - "Encontre páginas sobre Comunidade no Notion"
   - "Liste as páginas recentes do Notion"

📄 LER PÁGINA:
   Peça ao Cursor: "Leia a página do Notion [URL ou título]"
   
   Exemplos:
   - "Leia a página Comunidade do Notion"
   - "Mostre o conteúdo da página https://notion.so/..."

📝 CRIAR PÁGINA:
   Peça ao Cursor: "Crie uma página no Notion com [conteúdo]"
   
   Exemplos:
   - "Crie uma página no Notion com as notas da reunião de hoje"
   - "Adicione uma nova página no database X com título Y"

🔄 ATUALIZAR PÁGINA:
   Peça ao Cursor: "Atualize a página [título] no Notion"
   
   Exemplos:
   - "Adicione uma seção na página Comunidade"
   - "Atualize o status do projeto X no Notion"

💡 DICAS:
   - O Cursor tem acesso completo ao seu workspace Notion
   - Você pode pedir para buscar, ler, criar ou atualizar qualquer página
   - Para databases, o Cursor pode criar novas entradas respeitando o schema
`);
    });

  // Comando para mostrar páginas recentes (via MCP)
  notion
    .command('recent')
    .description('Instrução para listar páginas recentes')
    .action(() => {
      console.log(`
Para ver páginas recentes do Notion, peça ao Cursor:

  "Liste as páginas mais recentes do Notion"
  
ou

  "Busque no Notion por documentos atualizados recentemente"

O Cursor usará o MCP mcp_Notion_notion-search para buscar.
`);
    });

  // Comando para buscar (via MCP)
  notion
    .command('search')
    .description('Instrução para buscar no Notion')
    .argument('[query]', 'Termo de busca')
    .action((query) => {
      if (query) {
        console.log(`
Para buscar "${query}" no Notion, peça ao Cursor:

  "Busque no Notion por ${query}"

O Cursor usará o MCP mcp_Notion_notion-search com query: "${query}"
`);
      } else {
        console.log(`
Para buscar no Notion, peça ao Cursor:

  "Busque no Notion por [seu termo de busca]"

Exemplos:
  - "Busque no Notion por reuniões de dezembro"
  - "Encontre documentos sobre financeiro no Notion"
  - "Liste projetos ativos no Notion"
`);
      }
    });

  // Comando para enriquecer nota do Obsidian com Notion
  notion
    .command('enrich')
    .description('Instrução para enriquecer nota Obsidian com dados do Notion')
    .argument('<obsidianNote>', 'Caminho da nota no Obsidian')
    .argument('<notionQuery>', 'Termo para buscar no Notion')
    .action((obsidianNote, notionQuery) => {
      console.log(`
Para enriquecer a nota "${obsidianNote}" com informações do Notion sobre "${notionQuery}":

1. Peça ao Cursor:
   "Busque no Notion por ${notionQuery} e adicione as informações relevantes 
    na nota ${obsidianNote} do Obsidian"

2. O Cursor irá:
   - Buscar no Notion usando mcp_Notion_notion-search
   - Ler as páginas relevantes com mcp_Notion_notion-fetch
   - Atualizar a nota do Obsidian com o conteúdo

Exemplo de prompt completo:
  "Busque no Notion informações sobre a Comunidade Freelaw e adicione 
   um resumo na nota 10-AREAS/Profissional/Freelaw/40-COMUNIDADE/Dashboard-Comunidade.md"
`);
      
      logger.info(`Notion enrich: ${obsidianNote} <- ${notionQuery}`);
    });

  return notion;
}

