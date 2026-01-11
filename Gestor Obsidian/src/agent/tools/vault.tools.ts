import type { AgentTool } from '../types.js';
import { getVaultService } from '../../services/vault.service.js';
import { cleanObsidianContent, isAmbiguousSearch, searchVaultRanked } from '../vault-search.js';

export function createSearchVaultTool(): AgentTool {
  return {
    name: 'SEARCH_VAULT',
    description: 'Busca notas no Obsidian e carrega a melhor candidata no contexto interno',
    async execute(params, ctx) {
      const vault = getVaultService();
      const query = (params.query || '').trim();
      if (!query) return 'Busca inválida: query vazia';

      const results = searchVaultRanked(vault, query);
      if (results.length === 0) return `Nenhuma nota encontrada para "${query}"`;

      if (isAmbiguousSearch(results)) {
        const top = results.slice(0, 6);
        ctx.appendInternalData(
          `BUSCA AMBÍGUA: ${query}`,
          `Peça ao usuário para escolher UM arquivo ou esclarecer (pessoa/quarter/projeto).\n\n` +
            `CANDIDATOS:\n` +
            top.map((r, i) => `${i + 1}. ${r.path}`).join('\n'),
        );
        return `Encontrei múltiplas notas possíveis para "${query}"`;
      }

      const mainFile = results[0].path;
      const content = vault.readFile(mainFile);
      if (!content) {
        const fallback = results.slice(0, 3).map(r => r.path).join(', ');
        return `Encontrei arquivos mas não consegui ler. Tente: ${fallback}`;
      }

      const cleanContent = cleanObsidianContent(content).substring(0, 6500);
      ctx.appendInternalData(`FONTE: ${mainFile}`, cleanContent);
      return `Dados carregados do Obsidian: ${mainFile}`;
    },
  };
}

export function createReadNoteTool(): AgentTool {
  return {
    name: 'READ_NOTE',
    description: 'Lê uma nota do Obsidian por path e coloca no contexto interno',
    async execute(params, ctx) {
      const vault = getVaultService();
      const content = vault.readFile(params.path);
      if (!content) return `Nota não encontrada: ${params.path}`;
      const cleanContent = cleanObsidianContent(content).substring(0, 6500);
      ctx.appendInternalData(`FONTE: ${params.path}`, cleanContent);
      return `Dados carregados do Obsidian: ${params.path}`;
    },
  };
}

