import OpenAI from 'openai';
import { loadEnv } from '../utils/env.js';
import { logger } from '../utils/logger.js';
import { getChatSettingsDbService } from './chat-settings-db.service.js';
import { getNotesDbService } from './notes-db.service.js';
import { getPeopleDbService } from './people-db.service.js';
import { getSupermemoryIndexService } from './supermemory-index.service.js';
import { getSupermemoryService } from './supermemory.service.js';

loadEnv();

export type PolicyIntent =
  | 'recall'
  | 'lookup_notes'
  | 'lookup_people'
  | 'save_memory'
  | 'no_retrieval';

export interface PolicyDecision {
  intent: PolicyIntent;
  /**
   * Query to retrieve, if applicable
   */
  query?: string;
  /**
   * If true, save user's message to Supermemory as memory.
   */
  saveMemory?: boolean;
  memoryKind?: 'note' | 'decision' | 'preference' | 'policy' | 'contact' | 'meeting';
  /**
   * Optional short explanation for debug
   */
  reason?: string;
}

function truthyEnv(name: string, defaultValue: string = '1'): boolean {
  const v = (process.env[name] ?? defaultValue).toString().trim().toLowerCase();
  return !(v === '0' || v === 'false' || v === 'off' || v === 'no' || v === '');
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

async function getWorkspaceId(chatId: number): Promise<string> {
  const chatDb = getChatSettingsDbService();
  if (!chatDb.enabled()) return 'pessoal';
  const s = await chatDb.getOrCreate(chatId);
  return ((s.workspace_id as any) || 'pessoal') as string;
}

function normalizeText(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function heuristicDecision(text: string): PolicyDecision {
  const t = normalizeText(text);

  const recall =
    /(quais eram|quais era|qual era|o que era|lembra|relembra|o que eu te disse|o que eu falei)/i.test(t) ||
    (/\b(foco|focos|prioridade|prioridades|meta|metas|objetivo|objetivos)\b/i.test(t) &&
      (/\b(era|eram|mesmo|mesma)\b/i.test(t) || /\b(quais|qual|o que)\b/i.test(t)));
  if (recall) return { intent: 'recall', query: text, reason: 'heuristic:recall' };

  const explicitSave =
    /(lembre|guarde|registra|registre|anote|salve)\s+(que|isso|este|esta|pra|para)/i.test(t) ||
    /nao\s+(esquece|esqueca)/i.test(t) ||
    /isso\s+e\s+importante/i.test(t);
  if (explicitSave) return { intent: 'save_memory', saveMemory: true, memoryKind: 'note', reason: 'heuristic:save' };

  const people =
    /(quem e|quem eh|contato|telefone|whatsapp|telegram|email de|cargo de|trabalha com)/i.test(t);
  if (people) return { intent: 'lookup_people', query: text, reason: 'heuristic:people' };

  // Conteúdo / conhecimento (mesmo sem "?"):
  // Ex: "o que ficou faltando no planejamento de dezembro pra Comunidade"
  // Esses casos precisam de retrieval; caso contrário o LLM tende a responder "vou buscar..." sem executar.
  const knowledgeHints = [
    'notion',
    'comunidade',
    'diretoria',
    'financeira',
    'weekly',
    'okr',
    'okrs',
    'planejamento',
    'plano',
    'report',
    'pauta',
    'ata',
    'dezembro',
    'janeiro',
    'fevereiro',
    'marco',
    'abril',
    'maio',
    'junho',
    'julho',
    'agosto',
    'setembro',
    'outubro',
    'novembro',
    'q1',
    'q2',
    'q3',
    'q4',
    'faltando',
    'resumo',
    'status',
  ];
  const looksLikeKnowledge = knowledgeHints.some(k => t.includes(k));
  if (looksLikeKnowledge && t.length >= 12) {
    return { intent: 'lookup_notes', query: text, reason: 'heuristic:notes(hints)' };
  }

  const question = /\?/.test(text) || /^(o que|como|qual|quais|quem|onde|quando|por que|porque)\b/i.test(t);
  if (question) return { intent: 'lookup_notes', query: text, reason: 'heuristic:notes' };

  return { intent: 'no_retrieval', reason: 'heuristic:none' };
}

function safeJsonParse(s: string): any | null {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

class PolicyService {
  private client: OpenAI | null = null;
  private model: string = process.env.CORTEX_POLICY_MODEL || process.env.CORTEX_MODEL_FAST || process.env.CORTEX_MODEL || 'gpt-4o';

  enabled(): boolean {
    return truthyEnv('CORTEX_POLICY_ENABLED', '1');
  }

  private llmEnabled(): boolean {
    return truthyEnv('CORTEX_POLICY_USE_LLM', '1');
  }

  private getClient(): OpenAI {
    if (this.client) return this.client;
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY não configurado');
    this.client = new OpenAI({ apiKey });
    return this.client;
  }

  async decide(chatId: number, text: string): Promise<PolicyDecision> {
    if (!this.enabled()) return { intent: 'no_retrieval', reason: 'policy:disabled' };

    const base = heuristicDecision(text);
    if (!this.llmEnabled()) return base;

    // Small LLM classification pass (fast + cheap). Always fallback to heuristics.
    try {
      const ws = await getWorkspaceId(chatId);
      const prompt = [
        'Você é uma camada de POLICY para um agente de segundo cérebro.',
        'Classifique a mensagem do usuário e decida se precisa fazer RAG e onde.',
        '',
        'Retorne SOMENTE JSON com este schema:',
        '{ "intent": "recall|lookup_notes|lookup_people|save_memory|no_retrieval", "query": string|null, "saveMemory": boolean, "memoryKind": "note|decision|preference|policy|contact|meeting"|null, "reason": string }',
        '',
        'Regras:',
        '- recall: perguntas do tipo "quais eram meus focos", "lembra do que eu disse" etc.',
        '- lookup_notes: perguntas que provavelmente exigem buscar notas/documentos.',
        '- lookup_people: perguntas sobre pessoas/contatos/cargos.',
        '- save_memory: quando o usuário explicitamente pede para guardar ("lembre que", "anote", "guarde").',
        '- no_retrieval: small talk ou resposta direta sem buscar.',
        '- workspace atual: ' + ws,
        '',
        'Mensagem:',
        text,
      ].join('\n');

      const resp = await this.getClient().chat.completions.create({
        model: this.model,
        messages: [{ role: 'system', content: prompt }],
        temperature: 0,
        max_tokens: 220,
      });

      const raw = resp.choices[0]?.message?.content || '';
      const json = safeJsonParse(raw);
      if (!json || typeof json !== 'object') return base;

      const intent = String(json.intent || '').trim() as PolicyIntent;
      const allowed: PolicyIntent[] = ['recall', 'lookup_notes', 'lookup_people', 'save_memory', 'no_retrieval'];
      if (!allowed.includes(intent)) return base;

      const decision: PolicyDecision = {
        intent,
        query: json.query ? String(json.query) : undefined,
        saveMemory: Boolean(json.saveMemory),
        memoryKind: json.memoryKind ? (String(json.memoryKind) as any) : undefined,
        reason: `llm:${json.reason || ''}`.trim(),
      };
      return decision;
    } catch (e) {
      const dbg = truthyEnv('CORTEX_POLICY_DEBUG', '0');
      if (dbg) {
        const msg = e instanceof Error ? e.message : String(e);
        logger.info(`Policy LLM classify failed: ${msg}`);
      }
      return base;
    }
  }

  /**
   * Execute retrieval/writeback actions implied by policy.
   * This should be best-effort and never break the user flow.
   */
  async apply(chatId: number, decision: PolicyDecision, prefill: (title: string, payload: string) => void): Promise<void> {
    if (!this.enabled()) return;

    const ws = await getWorkspaceId(chatId);

    // Writeback: save short memory (best-effort)
    if (decision.saveMemory || decision.intent === 'save_memory') {
      try {
        const sm = getSupermemoryService();
        if (sm.enabled()) {
          const containerTags = [`ws_${ws}`, `chat_${chatId}`];
          await sm.addMemory({
            title: decision.query ? String(decision.query).slice(0, 80) : undefined,
            content: (decision.query || '').trim() || '',
            containerTags,
            metadata: { source: 'cortex:policy', workspaceId: ws, chatId, kind: decision.memoryKind || 'note' },
          });
        }
      } catch {
        // ignore
      }
    }

    // Retrieval
    const q = (decision.query || '').trim() || (decision.intent === 'lookup_notes' || decision.intent === 'lookup_people' || decision.intent === 'recall' ? (decision.query || '').trim() : '');
    const query = (q || '').trim() || (decision.intent !== 'no_retrieval' ? '' : '');

    if (decision.intent === 'lookup_people') {
      try {
        const db = getPeopleDbService();
        if (!db.enabled()) return;
        const qq = (decision.query || '').trim();
        if (!qq) return;
        const p = await db.findByName(ws, qq);
        if (!p) return;
        const out = [
          `Nome: ${p.name}`,
          p.tags?.length ? `Tags: ${p.tags.join(', ')}` : '',
          p.notes ? `\n${p.notes}` : '',
          `\nID: ${p.id}`,
        ].filter(Boolean).join('\n');
        prefill(`RAG: PEOPLE (${ws})`, out);
      } catch {
        // ignore
      }
      return;
    }

    if (decision.intent === 'lookup_notes') {
      try {
        const notesDb = getNotesDbService();
        if (!notesDb.enabled()) return;
        const qq = (decision.query || '').trim();
        if (!qq) return;

        // Prefer Supermemory index to select best IDs, then fetch from Supabase (truth).
        const idx = getSupermemoryIndexService();
        if (idx.enabled()) {
          const ids = await idx.searchSupabaseNoteIds(qq, ws, 3);
          if (ids.length > 0) {
            const loaded: string[] = [];
            for (const id of ids) {
              const note = await notesDb.getById(id, ws);
              if (!note) continue;
              loaded.push(`- ${note.id} :: ${note.title}`);
              prefill(`FONTE: supabase.notes/${note.id} (via Supermemory)`, (note.body_md || '').substring(0, 6500));
            }
            if (loaded.length) prefill('RAG: NOTES carregadas', loaded.join('\n'));
            return;
          }
        }

        // Fallback: Supabase FTS
        const results = await notesDb.search(qq, 3, ws);
        if (results.length === 0) return;
        for (const n of results.slice(0, 2)) {
          prefill(`FONTE: supabase.notes/${n.id}`, (n.body_md || '').substring(0, 6500));
        }
      } catch {
        // ignore
      }
    }

    // recall is handled in BrainService (direct memory answer)
    void query;
  }
}

let instance: PolicyService | null = null;
export function getPolicyService(): PolicyService {
  if (!instance) instance = new PolicyService();
  return instance;
}

export { PolicyService };

