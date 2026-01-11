import type { AgentTool } from '../types.js';

export function createNotionSearchTool(): AgentTool {
  return {
    name: 'NOTION_SEARCH',
    description: 'Busca no Notion via função injetada (MCP ou API)',
    async execute(params, ctx) {
      const fn = ctx.notion?.search;
      if (!fn) return 'Notion não disponível';
      const results = await fn(params.query);
      ctx.appendInternalData(`NOTION_SEARCH("${params.query}")`, results.substring(0, 6500));
      return `Resultados do Notion carregados (${Math.min(results.length, 6500)} chars)`;
    },
  };
}

export function createNotionFetchTool(): AgentTool {
  return {
    name: 'NOTION_FETCH',
    description: 'Lê página do Notion via função injetada (MCP ou API)',
    async execute(params, ctx) {
      const fn = ctx.notion?.fetch;
      if (!fn) return 'Notion não disponível';
      const content = await fn(params.id);
      ctx.appendInternalData(`NOTION_FETCH("${params.id}")`, content.substring(0, 6500));
      return `Conteúdo do Notion carregado (${content.length} caracteres)`;
    },
  };
}

