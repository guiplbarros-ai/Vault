import { Command } from 'commander'
import { getNotesDbService } from '../services/notes-db.service.js'
import { getPolymarketService } from '../services/polymarket.service.js'
import { logger } from '../utils/logger.js'

function clampInt(raw: unknown, min: number, max: number, fallback: number): number {
  const n = typeof raw === 'string' ? Number(raw) : typeof raw === 'number' ? raw : Number.NaN
  if (!Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(max, Math.trunc(n)))
}

function toProb(x: unknown): number | null {
  const n = typeof x === 'string' ? Number(x) : typeof x === 'number' ? x : Number.NaN
  if (!Number.isFinite(n)) return null
  if (n > 1.01 && n <= 100) return n / 100
  if (n >= 0 && n <= 1.01) return n
  return null
}

function formatPct(p: number | null): string {
  if (p === null) return '—'
  return `${(p * 100).toFixed(1)}%`
}

export function createPolymarketCommand(): Command {
  const polymarket = new Command('polymarket').description(
    'Consulta mercados da Polymarket (Gamma API)'
  )

  polymarket
    .command('search')
    .description('Busca mercados/eventos por texto')
    .argument('<query>', 'Termo de busca')
    .option('-l, --limit <n>', 'Limite de mercados exibidos (1-20)', '8')
    .option('--include-closed', 'Incluir mercados fechados', false)
    .action(async (query, options) => {
      try {
        const pm = getPolymarketService()
        const limit = clampInt(options.limit, 1, 20, 8)
        const res = await pm.publicSearch({
          q: String(query),
          limitPerType: Math.max(5, limit),
          keepClosedMarkets: Boolean(options.includeClosed),
          cache: true,
        })

        // Best-effort extraction (same strategy as agent tool).
        const markets: any[] = Array.isArray((res as any).markets) ? (res as any).markets : []
        if (!markets.length && Array.isArray((res as any).events)) {
          for (const e of (res as any).events) {
            if (Array.isArray(e?.markets)) markets.push(...e.markets)
          }
        }

        if (!markets.length) {
          console.log(`Nenhum mercado encontrado para "${query}"`)
          return
        }

        console.log(`\n🔎 Polymarket — resultados para "${query}":\n`)
        markets.slice(0, limit).forEach((m, i) => {
          const q = String(m.question || m.title || `market ${m.id}`).trim()
          const outcomes = Array.isArray(m.outcomes) ? m.outcomes.map(String) : []
          const prices = Array.isArray(m.outcomePrices) ? m.outcomePrices : []
          const left = outcomes[0] || 'A'
          const right = outcomes[1] || 'B'
          console.log(`${i + 1}. ${q}`)
          console.log(`   id: ${m.id}`)
          console.log(
            `   ${left}: ${formatPct(toProb(prices[0]))} | ${right}: ${formatPct(toProb(prices[1]))}`
          )
          console.log('')
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro desconhecido'
        logger.error(message)
        console.error(`✗ Erro: ${message}`)
        process.exit(1)
      }
    })

  polymarket
    .command('get')
    .description('Mostra detalhes de um mercado por id')
    .argument('<id>', 'ID do mercado')
    .action(async (id) => {
      try {
        const pm = getPolymarketService()
        const m = await pm.getMarketById(String(id))
        console.log(JSON.stringify(m, null, 2))
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro desconhecido'
        logger.error(message)
        console.error(`✗ Erro: ${message}`)
        process.exit(1)
      }
    })

  polymarket
    .command('capture')
    .description('Salva snapshot de um mercado como nota no Supabase (upsert por market/id)')
    .argument('<id>', 'ID do mercado')
    .option('-w, --workspace <workspaceId>', 'Workspace no Supabase (padrão: pessoal)', 'pessoal')
    .action(async (id, options) => {
      try {
        const notesDb = getNotesDbService()
        if (!notesDb.enabled()) {
          console.error('✗ Supabase não configurado (SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY).')
          process.exit(1)
        }

        const pm = getPolymarketService()
        const m = await pm.getMarketById(String(id))
        const title = String(m.question || m.title || `Polymarket ${id}`)
          .trim()
          .slice(0, 120)
        const bodyMd = JSON.stringify(m, null, 2)
        const saved = await notesDb.upsertExternalNote({
          workspaceId: String(options.workspace || 'pessoal'),
          source: 'polymarket',
          sourcePath: `market/${String(id)}`,
          title,
          bodyMd,
          type: 'nota',
          tags: ['origem/polymarket', 'tipo/mercado-preditivo', `polymarket/id/${String(id)}`],
          context: 'unknown',
        })
        console.log(`✓ Snapshot salvo: notes/${saved.id}`)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro desconhecido'
        logger.error(message)
        console.error(`✗ Erro: ${message}`)
        process.exit(1)
      }
    })

  return polymarket
}
