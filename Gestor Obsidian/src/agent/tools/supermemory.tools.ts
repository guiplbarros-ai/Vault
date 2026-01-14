import type { AgentTool } from '../types.js';
import { getChatSettingsDbService } from '../../services/chat-settings-db.service.js';
import { getSupermemoryService } from '../../services/supermemory.service.js';

function normalizeScope(raw: string | undefined): 'workspace' | 'chat' {
  const s = (raw || '').trim().toLowerCase();
  if (s === 'chat' || s === 'thread') return 'chat';
  return 'workspace';
}

async function getWorkspaceId(chatId: number): Promise<string | undefined> {
  try {
    const chatDb = getChatSettingsDbService();
    if (!chatDb.enabled()) return undefined;
    return (await chatDb.getOrCreate(chatId)).workspace_id;
  } catch {
    return undefined;
  }
}

function buildContainerTag(scope: 'workspace' | 'chat', workspaceId: string | undefined, chatId: number): string {
  if (scope === 'chat') return `chat_${chatId}`;
  if (workspaceId) return `ws_${workspaceId}`;
  return `chat_${chatId}`;
}

export function createSupermemorySearchTool(): AgentTool {
  return {
    name: 'SUPER_MEMORY_SEARCH',
    description: 'Busca memórias no Supermemory (cloud) e carrega trechos relevantes no contexto interno',
    async execute(params, ctx) {
      const sm = getSupermemoryService();
      if (!sm.enabled()) return 'Supermemory não configurado (SUPERMEMORY_API_KEY ausente)';

      const query = (params.query || params.q || '').trim();
      if (!query) return 'Busca inválida: query vazia';

      const scope = normalizeScope(params.scope);
      const limitRaw = Number(params.limit || '');
      const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.max(1, Math.min(20, limitRaw)) : 8;

      const workspaceId = await getWorkspaceId(ctx.chatId);
      const containerTag = buildContainerTag(scope, workspaceId, ctx.chatId);

      // Filtro opcional: restringe por chat quando scope=chat
      const filters =
        scope === 'chat'
          ? {
              AND: [{ key: 'chatId', value: String(ctx.chatId), negate: false }],
            }
          : undefined;

      const res = await sm.search({
        q: query,
        limit,
        rerank: true,
        containerTag,
        containerTags: [containerTag],
        filters,
      });

      if (!res.results.length) return `Nenhuma memória encontrada para "${query}"`;

      const formatted = res.results
        .slice(0, limit)
        .map((r, idx) => {
          const id = r.documentId || r.id || 'sem-id';
          const title = (r.title || (r.metadata && (r.metadata as any).title) || '').toString().trim();
          const score = typeof r.score === 'number' ? ` score=${r.score.toFixed(3)}` : '';
          const when = (r.updatedAt || r.createdAt || '').toString();

          // pega 1–3 chunks relevantes
          const chunks = Array.isArray(r.chunks) && r.chunks.length
            ? r.chunks
                .filter(c => (c?.content || '').toString().trim().length > 0)
                .slice(0, 3)
                .map(c => `> ${(c.content || '').toString().trim()}`)
                .join('\n')
            : (r.content || '').toString().trim();

          const headerBits = [
            `#${idx + 1}`,
            title ? `"${title}"` : '',
            `${id}${score}`,
            when ? `(${when})` : '',
          ].filter(Boolean);

          return `${headerBits.join(' ')}\n${chunks}`.trim();
        })
        .join('\n\n');

      ctx.appendInternalData(`SUPERMEMORY (scope=${scope}) — "${query}"`, formatted, 6500);
      return `Memórias carregadas do Supermemory: ${res.results.length} resultado(s)`;
    },
  };
}

export function createSupermemoryAddTool(): AgentTool {
  return {
    name: 'SUPER_MEMORY_ADD',
    description: 'Salva uma memória no Supermemory (cloud) com metadata (workspace/chat/kind)',
    async execute(params, ctx) {
      const sm = getSupermemoryService();
      if (!sm.enabled()) return 'Supermemory não configurado (SUPERMEMORY_API_KEY ausente)';

      const content = (params.content || '').trim();
      if (!content) return 'Memória inválida: content vazio';

      const title = (params.title || '').trim() || undefined;
      const kind = (params.kind || params.type || '').trim() || 'note';
      const workspaceId = await getWorkspaceId(ctx.chatId);

      const scope = normalizeScope(params.scope);
      const containerTag = buildContainerTag(scope, workspaceId, ctx.chatId);
      const workspaceTag = workspaceId ? `ws_${workspaceId}` : undefined;
      const chatTag = `chat_${ctx.chatId}`;
      // Para evitar perda de memória por roteamento, gravamos também no chat container (além do container alvo).
      // Ex: se o user ainda não setou workspace, isso garante recall por chat.
      const containerTags = Array.from(
        new Set([containerTag, workspaceTag, chatTag].filter(Boolean)),
      ) as string[];

      const out = await sm.addMemory({
        content,
        title,
        containerTags,
        metadata: {
          workspaceId: workspaceId || null,
          chatId: ctx.chatId,
          kind,
          title: title || null,
          source: 'cortex',
        },
      });

      const id = out.documentId || out.id || 'ok';
      return `Memória salva no Supermemory: ${id}`;
    },
  };
}

