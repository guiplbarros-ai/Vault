import { getChatSettingsDbService } from '../../services/chat-settings-db.service.js'
import { getNotesDbService } from '../../services/notes-db.service.js'
import {
  type PolymarketMarket,
  type PolymarketPublicSearchResponse,
  getPolymarketService,
} from '../../services/polymarket.service.js'
import { getSupermemoryService } from '../../services/supermemory.service.js'
import type { AgentTool } from '../types.js'

function clampInt(raw: unknown, min: number, max: number, fallback: number): number {
  const n = typeof raw === 'string' ? Number(raw) : typeof raw === 'number' ? raw : Number.NaN
  if (!Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(max, Math.trunc(n)))
}

function toProb(x: unknown): number | null {
  const n = typeof x === 'string' ? Number(x) : typeof x === 'number' ? x : Number.NaN
  if (!Number.isFinite(n)) return null
  // Some APIs return 0..1, others 0..100; we normalize to 0..1.
  if (n > 1.01 && n <= 100) return n / 100
  if (n >= 0 && n <= 1.01) return n
  return null
}

function formatPct(p: number | null): string {
  if (p === null) return '—'
  return `${(p * 100).toFixed(1)}%`
}

function marketUrl(m: PolymarketMarket): string | null {
  const slug = typeof m.slug === 'string' ? m.slug.trim() : ''
  if (slug) return `https://polymarket.com/market/${slug}`
  const id = (m.id || '').trim()
  if (id) return `https://polymarket.com/market/${id}`
  return null
}

function extractMarketsFromPublicSearch(res: PolymarketPublicSearchResponse): PolymarketMarket[] {
  if (Array.isArray(res.markets)) return res.markets

  const out: PolymarketMarket[] = []

  // Common shape: events -> markets[]
  const events = Array.isArray(res.events) ? res.events : []
  for (const e of events) {
    const markets = (e as any)?.markets
    if (Array.isArray(markets)) {
      for (const m of markets) {
        if (m && typeof m === 'object' && typeof (m as any).id !== 'undefined') {
          out.push(m as PolymarketMarket)
        }
      }
    }
  }
  return out
}

function formatMarketLine(m: PolymarketMarket): string {
  const q =
    (m.question || '').toString().trim() || (m.title || '').toString().trim() || `market ${m.id}`
  const outcomes = Array.isArray(m.outcomes) ? m.outcomes.map(String) : []
  const prices = Array.isArray(m.outcomePrices) ? m.outcomePrices : []

  // Heuristic: show first two outcomes if present (often Yes/No).
  const left = outcomes[0] || 'A'
  const right = outcomes[1] || 'B'
  const pLeft = formatPct(toProb(prices[0]))
  const pRight = formatPct(toProb(prices[1]))
  const status = m.closed ? 'closed' : m.active ? 'active' : 'unknown'
  return `• ${q}\n  id: ${m.id} | ${left}: ${pLeft} | ${right}: ${pRight} | ${status}`
}

function formatMarketMarkdown(m: PolymarketMarket): string {
  const q =
    (m.question || '').toString().trim() || (m.title || '').toString().trim() || `Market ${m.id}`
  const url = marketUrl(m)
  const outcomes = Array.isArray(m.outcomes) ? m.outcomes.map(String) : []
  const prices = Array.isArray(m.outcomePrices) ? m.outcomePrices : []

  const lines: string[] = []
  lines.push(`# ${q}`)
  lines.push('')
  lines.push(`- id: ${m.id}`)
  if (typeof m.slug === 'string' && m.slug.trim()) lines.push(`- slug: ${m.slug.trim()}`)
  if (url) lines.push(`- url: ${url}`)
  if (typeof m.active === 'boolean') lines.push(`- active: ${m.active}`)
  if (typeof m.closed === 'boolean') lines.push(`- closed: ${m.closed}`)
  if (typeof m.endDate === 'string' && m.endDate.trim())
    lines.push(`- endDate: ${m.endDate.trim()}`)
  if (typeof m.startDate === 'string' && m.startDate.trim())
    lines.push(`- startDate: ${m.startDate.trim()}`)
  lines.push('')

  if (outcomes.length) {
    lines.push('## Probabilidades (snapshot)')
    for (let i = 0; i < outcomes.length; i++) {
      const p = toProb(prices[i])
      lines.push(`- ${outcomes[i]}: ${formatPct(p)}`)
    }
    lines.push('')
  }

  const desc = (m.description || '').toString().trim()
  if (desc) {
    lines.push('## Descrição')
    lines.push(desc)
    lines.push('')
  }

  lines.push('---')
  lines.push(`source: polymarket (gamma)`)
  lines.push(`captured_at: ${new Date().toISOString()}`)
  return lines.join('\n')
}

async function getWorkspaceId(chatId: number): Promise<string | undefined> {
  try {
    const chatDb = getChatSettingsDbService()
    if (!chatDb.enabled()) return undefined
    return (await chatDb.getOrCreate(chatId)).workspace_id
  } catch {
    return undefined
  }
}

export function createPolymarketSearchTool(): AgentTool {
  return {
    name: 'POLYMARKET_SEARCH_MARKETS',
    description:
      'Busca mercados/eventos na Polymarket por texto e carrega amostra no contexto interno',
    async execute(params, ctx) {
      const pm = getPolymarketService()
      const q = (params.query || params.q || '').toString().trim()
      if (!q) return 'Parâmetro obrigatório: query'

      const limit = clampInt(params.limit, 1, 20, 8)
      const keepClosed =
        String(params.keep_closed || params.include_closed || '')
          .trim()
          .toLowerCase() === 'true'

      const res = await pm.publicSearch({
        q,
        limitPerType: Math.max(5, limit),
        keepClosedMarkets: keepClosed,
        cache: true,
      })

      const markets = extractMarketsFromPublicSearch(res).slice(0, limit)
      if (!markets.length) return `Nenhum mercado encontrado para "${q}"`

      const formatted = markets.map(formatMarketLine).join('\n')
      ctx.appendInternalData(`POLYMARKET_SEARCH "${q}"`, formatted, 6500)
      return `Mercados carregados (${markets.length})`
    },
  }
}

export function createPolymarketGetMarketTool(): AgentTool {
  return {
    name: 'POLYMARKET_GET_MARKET',
    description:
      'Busca detalhes de um mercado da Polymarket por id (salva detalhes no contexto interno)',
    async execute(params, ctx) {
      const pm = getPolymarketService()
      const id = (params.id || '').toString().trim()
      if (!id) return 'Parâmetro obrigatório: id'

      const m = await pm.getMarketById(id)
      const formatted = formatMarketMarkdown(m)
      ctx.appendInternalData(`POLYMARKET_MARKET(${id})`, formatted, 6500)
      return `Mercado carregado`
    },
  }
}

export function createPolymarketCaptureMarketTool(): AgentTool {
  return {
    name: 'POLYMARKET_CAPTURE_MARKET',
    description:
      'Captura snapshot de um mercado e salva como nota (Supabase) e/ou memória (Supermemory)',
    async execute(params, ctx) {
      const pm = getPolymarketService()
      const id = (params.id || '').toString().trim()
      if (!id) return 'Parâmetro obrigatório: id'

      const m = await pm.getMarketById(id)
      const md = formatMarketMarkdown(m)
      const title = ((m.question || m.title || '').toString().trim() || `Polymarket ${id}`).slice(
        0,
        120
      )
      const workspaceId = await getWorkspaceId(ctx.chatId)

      const notesDb = getNotesDbService()
      if (notesDb.enabled()) {
        const saved = await notesDb.upsertExternalNote({
          workspaceId: workspaceId || 'pessoal',
          source: 'polymarket',
          sourcePath: `market/${id}`,
          title,
          bodyMd: md,
          type: 'nota',
          tags: [
            'origem/polymarket',
            'tipo/mercado-preditivo',
            `polymarket/id/${id}`,
            ...(typeof m.slug === 'string' && m.slug.trim()
              ? [`polymarket/slug/${m.slug.trim()}`]
              : []),
          ],
          context: 'unknown',
        })
        return `Snapshot salvo: notes/${saved.id}`
      }

      // Fallback: Supermemory direto (se Supabase não estiver configurado).
      const sm = getSupermemoryService()
      if (sm.enabled()) {
        const url = marketUrl(m)
        const content = url ? `${md}\n\nlink: ${url}` : md
        const out = await sm.addMemory({
          title,
          content,
          containerTags: [`chat_${ctx.chatId}`],
          metadata: {
            kind: 'polymarket_snapshot',
            marketId: id,
            slug: typeof m.slug === 'string' ? m.slug.trim() : null,
            chatId: ctx.chatId,
            source: 'polymarket',
          },
        })
        const mid = out.documentId || out.id || 'ok'
        return `Snapshot salvo no Supermemory: ${mid}`
      }

      return 'Não consegui salvar: configure Supabase (SUPABASE_*) ou Supermemory (SUPERMEMORY_API_KEY).'
    },
  }
}
