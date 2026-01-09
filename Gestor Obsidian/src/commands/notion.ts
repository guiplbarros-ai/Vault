import { Command } from 'commander';
import { logger } from '../utils/logger.js';
import * as path from 'node:path';
import { getNotionService } from '../services/notion.service.js';
import { getVaultService } from '../services/vault.service.js';

/**
 * Comandos do Notion
 *
 * Fluxo recomendado: MCP do Notion no Cursor (sem token no projeto).
 * Fallback/automação: Notion API via NOTION_API_KEY.
 */

export function createNotionCommand(): Command {
  const notion = new Command('notion')
    .description('Notion (MCP no Cursor; API opcional via NOTION_API_KEY)');

  const printMcpHint = () => {
    console.log(`
ℹ️ MCP do Notion (recomendado)

Você configurou o MCP do Notion no Cursor. Para trabalhar com o Notion sem token no projeto, peça no chat do Cursor:

- "Busque no Notion por <termo>"
- "Leia a página <título ou URL>"
- "Crie uma página no Notion com <conteúdo>"
- "Atualize a página <título> no Notion"
- "Busque no Notion por <termo> e adicione um resumo na nota <caminho> do Obsidian"

Se você quiser rodar estes comandos via terminal/automação, configure NOTION_API_KEY no .env.
`.trim());
  };

  const getNotionOrExplain = () => {
    const service = getNotionService();
    if (!service) printMcpHint();
    return service;
  };

  const resolveVaultRelativePath = (inputPath: string) => {
    const vault = getVaultService();
    const vaultRoot = vault.getVaultPath();

    if (path.isAbsolute(inputPath)) {
      const rel = path.relative(vaultRoot, inputPath);
      // Only accept absolute paths that are inside the vault
      if (!rel.startsWith('..') && !path.isAbsolute(rel)) return rel;
      throw new Error(`Caminho absoluto fora do vault: ${inputPath}`);
    }

    return inputPath;
  };

  // Ajuda
  notion
    .command('help')
    .description('Mostra como usar a integração com Notion')
    .action(() => {
      console.log(`
📘 Integração com Notion

✅ Recomendado: usar MCP do Notion no Cursor (sem token no projeto)
   - No chat do Cursor, use comandos naturais como:
     • "Busque no Notion por documentos financeiros"
     • "Leia a página Comunidade do Notion"
     • "Crie uma página no Notion com as notas da reunião"
     • "Busque no Notion sobre X e adicione na nota Y do Obsidian"

🧰 Opcional: usar Notion API (NOTION_API_KEY) para automação/terminal

🔍 BUSCAR PÁGINAS:
   npm run dev -- notion search "termo"

📄 LER PÁGINA:
   npm run dev -- notion fetch "<id-ou-url>"

🕒 RECENTES:
   npm run dev -- notion recent --max 10

📝 CRIAR PÁGINA:
   (Ainda não implementado no CLI; dá pra extender pelo NotionService.)

🔄 ATUALIZAR PÁGINA:
   (Ainda não implementado no CLI; dá pra extender pelo NotionService.)

🧩 ENRIQUECER NOTA DO OBSIDIAN (importa conteúdo):
   npm run dev -- notion enrich "10-AREAS/.../nota.md" "termo de busca"

💡 DICAS:
   - Configure a integração em https://www.notion.so/my-integrations
   - Conecte a integração às páginas/databases no Notion (Share → Invite → sua integração)
`);
    });

  // Recentes
  notion
    .command('recent')
    .description('Lista páginas/databases recentes (por last_edited_time)')
    .option('-m, --max <n>', 'Quantidade máxima', '10')
    .action(async (opts) => {
      try {
        const service = getNotionOrExplain();
        if (!service) {
          process.exitCode = 1;
          return;
        }
        const max = Math.max(1, Number(opts.max) || 10);
        const out = await service.recent(max);
        console.log(out);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.error(`Notion recent error: ${msg}`);
        console.error(`❌ ${msg}`);
        process.exitCode = 1;
      }
    });

  // Buscar
  notion
    .command('search')
    .description('Busca páginas/databases no Notion')
    .argument('<query>', 'Termo de busca')
    .option('-m, --max <n>', 'Quantidade máxima', '10')
    .action(async (query, opts) => {
      try {
        const service = getNotionOrExplain();
        if (!service) {
          process.exitCode = 1;
          return;
        }
        const max = Math.max(1, Number(opts.max) || 10);
        const out = await service.search(query, { pageSize: max });
        console.log(out);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.error(`Notion search error: ${msg}`);
        console.error(`❌ ${msg}`);
        process.exitCode = 1;
      }
    });

  // Fetch (ler página)
  notion
    .command('fetch')
    .description('Lê o conteúdo de uma página do Notion (ID ou URL) e imprime em Markdown')
    .argument('<pageIdOrUrl>', 'ID ou URL da página do Notion')
    .action(async (pageIdOrUrl) => {
      try {
        const service = getNotionOrExplain();
        if (!service) {
          process.exitCode = 1;
          return;
        }
        const md = await service.getPage(pageIdOrUrl);
        console.log(md);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.error(`Notion fetch error: ${msg}`);
        console.error(`❌ ${msg}`);
        process.exitCode = 1;
      }
    });

  // Enrich (importar conteúdo para Obsidian)
  notion
    .command('enrich')
    .description('Busca no Notion e anexa o conteúdo na nota do Obsidian')
    .argument('<obsidianNote>', 'Caminho da nota no Obsidian')
    .argument('<notionQuery>', 'Termo para buscar no Notion')
    .option('-m, --max <n>', 'Quantidade máxima de resultados para considerar', '5')
    .action(async (obsidianNote, notionQuery, opts) => {
      try {
        const service = getNotionOrExplain();
        if (!service) {
          console.log('\nDica: no Cursor, você pode pedir algo como:\n' +
            `"Busque no Notion por ${notionQuery} e adicione um resumo na nota ${obsidianNote} do Obsidian"\n`
          );
          process.exitCode = 1;
          return;
        }
        const vault = getVaultService();

        const max = Math.max(1, Number(opts.max) || 5);
        const results = await service.searchResults(notionQuery, { pageSize: max });
        if (results.length === 0) {
          console.log(`Nenhum resultado para "${notionQuery}".`);
          return;
        }

        const chosen = results[0];
        const md = await service.getPage(chosen.id);

        const relative = resolveVaultRelativePath(obsidianNote);
        const header =
          `\n\n---\n\n` +
          `## Importado do Notion\n\n` +
          `- Título: ${chosen.title}\n` +
          `- URL: ${chosen.url}\n` +
          `- Query: ${notionQuery}\n\n`;

        if (vault.fileExists(relative)) {
          vault.appendToFile(relative, header + md + '\n');
        } else {
          vault.writeFile(relative, header.trimStart() + md + '\n');
        }

        console.log(`✅ Conteúdo anexado em: ${relative}`);
        logger.info(`Notion enrich: ${relative} <- ${notionQuery} (id=${chosen.id})`);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.error(`Notion enrich error: ${msg}`);
        console.error(`❌ ${msg}`);
        process.exitCode = 1;
      }
    });

  return notion;
}

