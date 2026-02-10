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
 */

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
  // Brasil -> Japão (ida e volta)
  'CNF-NRT': {
    route: 'CNF-NRT',
    avgPrice: 11000,
    goodPrice: 9000,
    greatPrice: 7000,
    lastUpdated: '2026-01',
    notes: 'Via EUA ou Oriente Médio. Direto não existe.',
  },
  'GRU-NRT': {
    route: 'GRU-NRT',
    avgPrice: 9500,
    goodPrice: 8000,
    greatPrice: 6500,
    lastUpdated: '2026-01',
    notes: 'Melhor hub para Ásia. LATAM tem parceria JAL.',
  },
  'GRU-HND': {
    route: 'GRU-HND',
    avgPrice: 9500,
    goodPrice: 8000,
    greatPrice: 6500,
    lastUpdated: '2026-01',
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
 * Retorna todos os benchmarks disponíveis
 */
export function getAllBenchmarks(): PriceBenchmark[] {
  return Object.values(PRICE_BENCHMARKS)
}

/**
 * Adiciona ou atualiza um benchmark (para uso futuro via API/CLI)
 */
export function setBenchmark(benchmark: PriceBenchmark): void {
  PRICE_BENCHMARKS[benchmark.route] = benchmark
}
