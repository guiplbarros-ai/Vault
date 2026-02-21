/**
 * Benchmark de preços para rotas aéreas (classe econômica, 1 pessoa, IDA E VOLTA)
 *
 * Esses valores são referências de mercado para identificar promoções reais.
 * Preços em BRL, atualizados manualmente com base em pesquisas de mercado.
 *
 * Fontes de referência:
 * - Google Flights (observação manual)
 * - Melhores Destinos
 * - Passagens Promo
 *
 * Persistência: benchmarks são carregados do Supabase na inicialização
 * e salvos ao recalibrar. Os hardcoded abaixo são fallback/seed.
 */

import { getSupabaseClient, isSupabaseConfigured } from '../services/supabase.service.js'
import { logger } from './logger.js'

export interface PriceBenchmark {
  route: string // "ORIGIN-DEST"
  avgPrice: number // Preço médio normal
  goodPrice: number // Preço bom (vale a pena)
  greatPrice: number // Preço excelente (promoção real)
  lastUpdated: string // Data da última atualização
  notes?: string
}

// Benchmark de preços por rota (origem-destino) - IDA E VOLTA (18 dias)
const PRICE_BENCHMARKS: Record<string, PriceBenchmark> = {
  // Brasil -> Japão (ida e volta) — calibrado com dados reais (fev/2026)
  'CNF-NRT': {
    route: 'CNF-NRT',
    avgPrice: 7600,
    goodPrice: 7200,
    greatPrice: 6000,
    lastUpdated: '2026-02',
    notes: 'Via EUA ou Oriente Médio. Mediana real: R$7.581 (840 amostras).',
  },
  'CNF-HND': {
    route: 'CNF-HND',
    avgPrice: 7600,
    goodPrice: 7200,
    greatPrice: 6000,
    lastUpdated: '2026-02',
    notes: 'Haneda (Tokyo). Média real: R$7.914 (112 amostras).',
  },
  'GRU-NRT': {
    route: 'GRU-NRT',
    avgPrice: 7500,
    goodPrice: 7000,
    greatPrice: 5800,
    lastUpdated: '2026-02',
    notes: 'Melhor hub para Ásia. Média real: R$7.556, mín: R$6.547.',
  },
  'GRU-HND': {
    route: 'GRU-HND',
    avgPrice: 7500,
    goodPrice: 7000,
    greatPrice: 5800,
    lastUpdated: '2026-02',
    notes: 'Média real: R$7.695, mín: R$6.540.',
  },

  // Brasil -> Osaka (ida e volta) — estimativa conservadora (menos opções que Tóquio)
  'CNF-KIX': {
    route: 'CNF-KIX',
    avgPrice: 8000,
    goodPrice: 7500,
    greatPrice: 6200,
    lastUpdated: '2026-02',
    notes: 'Osaka/Kansai. Menos voos diretos, geralmente via EUA ou Oriente Médio.',
  },
  'GRU-KIX': {
    route: 'GRU-KIX',
    avgPrice: 7800,
    goodPrice: 7300,
    greatPrice: 6000,
    lastUpdated: '2026-02',
    notes: 'Osaka/Kansai via GRU. Mais opções que CNF.',
  },

  // Brasil -> EUA (ida e volta)
  'CNF-DEN': {
    route: 'CNF-DEN',
    avgPrice: 8000,
    goodPrice: 6500,
    greatPrice: 5000,
    lastUpdated: '2026-01',
    notes: 'Conexão em Houston, Miami ou Atlanta.',
  },
  'GRU-MIA': {
    route: 'GRU-MIA',
    avgPrice: 5500,
    goodPrice: 4000,
    greatPrice: 3200,
    lastUpdated: '2026-01',
    notes: 'Rota popular, muitas opções.',
  },
  'GRU-JFK': {
    route: 'GRU-JFK',
    avgPrice: 6500,
    goodPrice: 4500,
    greatPrice: 3600,
    lastUpdated: '2026-01',
  },
  'GRU-MCO': {
    route: 'GRU-MCO',
    avgPrice: 6000,
    goodPrice: 4500,
    greatPrice: 3500,
    lastUpdated: '2026-01',
    notes: 'Orlando - destino popular.',
  },
}

/**
 * Obtém o benchmark de preço para uma rota
 */
export function getBenchmark(origin: string, destination: string): PriceBenchmark | undefined {
  const key = `${origin.toUpperCase()}-${destination.toUpperCase()}`
  return PRICE_BENCHMARKS[key]
}

/**
 * Classifica um preço em relação ao benchmark
 */
export type PriceRating = 'expensive' | 'normal' | 'good' | 'great'

export function ratePriceVsBenchmark(
  origin: string,
  destination: string,
  price: number
): { rating: PriceRating; benchmark?: PriceBenchmark; percentVsAvg?: number } {
  const benchmark = getBenchmark(origin, destination)

  if (!benchmark) {
    // Sem benchmark, não podemos avaliar
    return { rating: 'normal' }
  }

  const percentVsAvg = ((benchmark.avgPrice - price) / benchmark.avgPrice) * 100

  if (price <= benchmark.greatPrice) {
    return { rating: 'great', benchmark, percentVsAvg }
  }

  if (price <= benchmark.goodPrice) {
    return { rating: 'good', benchmark, percentVsAvg }
  }

  if (price <= benchmark.avgPrice) {
    return { rating: 'normal', benchmark, percentVsAvg }
  }

  return { rating: 'expensive', benchmark, percentVsAvg }
}

/**
 * Verifica se um preço é considerado promoção (good ou great)
 */
export function isPromotion(origin: string, destination: string, price: number): boolean {
  const { rating } = ratePriceVsBenchmark(origin, destination, price)
  return rating === 'good' || rating === 'great'
}

/**
 * Remove outliers usando IQR (Interquartile Range).
 * Preços extremos (ex: error fares, premium class mistagged) distorcem percentis.
 * @param sorted Array de preços já ordenado do menor para o maior
 */
export function filterPriceOutliers(sorted: number[]): number[] {
  if (sorted.length < 5) return sorted
  const q1 = sorted[Math.floor(sorted.length * 0.25)]
  const q3 = sorted[Math.floor(sorted.length * 0.75)]
  const iqr = q3 - q1
  return sorted.filter(v => v >= q1 - 1.5 * iqr && v <= q3 + 1.5 * iqr)
}

/**
 * Retorna todos os benchmarks disponíveis
 */
export function getAllBenchmarks(): PriceBenchmark[] {
  return Object.values(PRICE_BENCHMARKS)
}

/**
 * Adiciona ou atualiza um benchmark (in-memory)
 */
export function setBenchmark(benchmark: PriceBenchmark): void {
  PRICE_BENCHMARKS[benchmark.route] = benchmark
}

/**
 * Salva um benchmark no Supabase (upsert)
 */
export async function saveBenchmarkToSupabase(benchmark: PriceBenchmark): Promise<void> {
  if (!isSupabaseConfigured()) return

  try {
    const supabase = getSupabaseClient()
    const { error } = await supabase
      .from('atlas_benchmarks')
      .upsert({
        route: benchmark.route,
        avg_price: benchmark.avgPrice,
        good_price: benchmark.goodPrice,
        great_price: benchmark.greatPrice,
        last_updated: benchmark.lastUpdated,
        notes: benchmark.notes || null,
      })

    if (error) {
      logger.warn(`[Benchmark] Erro ao salvar ${benchmark.route} no Supabase: ${error.message}`)
    }
  } catch (err) {
    logger.warn(`[Benchmark] Erro ao persistir ${benchmark.route}: ${err}`)
  }
}

/**
 * Carrega benchmarks do Supabase e merge com os hardcoded
 * (Supabase tem prioridade — sobrescreve hardcoded)
 */
export async function loadBenchmarksFromSupabase(): Promise<number> {
  if (!isSupabaseConfigured()) return 0

  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('atlas_benchmarks')
      .select('*')

    if (error) {
      logger.warn(`[Benchmark] Erro ao carregar do Supabase: ${error.message}`)
      return 0
    }

    if (!data || data.length === 0) return 0

    let loaded = 0
    for (const row of data) {
      PRICE_BENCHMARKS[row.route] = {
        route: row.route,
        avgPrice: Number(row.avg_price),
        goodPrice: Number(row.good_price),
        greatPrice: Number(row.great_price),
        lastUpdated: row.last_updated,
        notes: row.notes || undefined,
      }
      loaded++
    }

    logger.info(`[Benchmark] ${loaded} benchmarks carregados do Supabase`)
    return loaded
  } catch (err) {
    logger.warn(`[Benchmark] Erro ao carregar benchmarks: ${err}`)
    return 0
  }
}

/**
 * Seed: salva todos os benchmarks hardcoded no Supabase (apenas se tabela vazia)
 */
export async function seedBenchmarksToSupabase(): Promise<void> {
  if (!isSupabaseConfigured()) return

  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.from('atlas_benchmarks').select('route').limit(1)

    // Se tabela não existe ou erro, pula silenciosamente
    if (error) return

    // Só faz seed se tabela estiver vazia
    if (data && data.length > 0) return

    const benchmarks = getAllBenchmarks()
    for (const bm of benchmarks) {
      await saveBenchmarkToSupabase(bm)
    }
    logger.info(`[Benchmark] Seed: ${benchmarks.length} benchmarks salvos no Supabase`)
  } catch (err) {
    logger.warn(`[Benchmark] Erro no seed: ${err}`)
  }
}
