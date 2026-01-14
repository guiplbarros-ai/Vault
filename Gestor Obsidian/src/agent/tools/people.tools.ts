import type { AgentTool } from '../types.js';
import { getPeopleDbService } from '../../services/people-db.service.js';
import { getChatSettingsDbService } from '../../services/chat-settings-db.service.js';

async function getWorkspaceId(chatId: number): Promise<string> {
  const chatDb = getChatSettingsDbService();
  if (!chatDb.enabled()) return 'pessoal';
  const s = await chatDb.getOrCreate(chatId);
  return (s.workspace_id || 'pessoal') as any;
}

function parseTags(raw: string): string[] {
  return raw
    .split(/[,\n]/)
    .map(s => s.trim())
    .filter(Boolean);
}

export function createPeopleUpsertTool(): AgentTool {
  return {
    name: 'PEOPLE_UPSERT',
    description: 'Cria/atualiza uma pessoa no CRM (Supabase people). Ação mutável.',
    async execute(params, ctx) {
      const db = getPeopleDbService();
      if (!db.enabled()) return 'Supabase não configurado para CRM (people).';

      const name = (params.name || '').trim();
      if (!name) return 'Parâmetro obrigatório: name';

      const workspaceId = (params.workspace || '').trim() || (await getWorkspaceId(ctx.chatId));
      const email = (params.email || '').trim();
      const role = (params.role || params.title || '').trim();
      const channels = (params.channels || '').trim();
      const source = (params.source || params.link || '').trim();
      const extraNotes = (params.notes || '').trim();

      const tags = [
        ...parseTags(params.tags || ''),
        ...(channels ? parseTags(channels).map(x => x.toLowerCase()) : []),
      ].filter(Boolean);

      const notesLines: string[] = [];
      if (email) notesLines.push(`Email: ${email}`);
      if (role) notesLines.push(`Cargo: ${role}`);
      if (channels) notesLines.push(`Canais: ${channels}`);
      if (source) notesLines.push(`Fonte: ${source}`);
      if (extraNotes) notesLines.push(extraNotes);

      const person = await db.upsertByExactName({
        workspaceId,
        name,
        tags,
        notes: notesLines.join('\n'),
      });

      ctx.appendInternalData(`PEOPLE_UPSERT("${name}")`, `id=${person.id}\nworkspace=${person.workspace_id}`);
      return `✅ Pessoa salva no CRM: ${person.name} (${person.workspace_id})`;
    },
  };
}

export function createPeopleSearchTool(): AgentTool {
  return {
    name: 'PEOPLE_SEARCH',
    description: 'Busca pessoa no CRM por nome (Supabase people)',
    async execute(params, ctx) {
      const db = getPeopleDbService();
      if (!db.enabled()) return 'Supabase não configurado para CRM (people).';

      const q = (params.query || params.name || '').trim();
      if (!q) return 'Parâmetro obrigatório: query';
      const workspaceId = (params.workspace || '').trim() || (await getWorkspaceId(ctx.chatId));
      const p = await db.findByName(workspaceId, q);
      if (!p) return `Não encontrei ninguém para "${q}" no contexto ${workspaceId}.`;

      const out = [
        `Nome: ${p.name}`,
        p.tags?.length ? `Tags: ${p.tags.join(', ')}` : '',
        p.notes ? `\n${p.notes}` : '',
        `\nID: ${p.id}`,
      ].filter(Boolean).join('\n');
      ctx.appendInternalData(`PEOPLE_SEARCH("${q}")`, out);
      return `Pessoa encontrada: ${p.name}`;
    },
  };
}

