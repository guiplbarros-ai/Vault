import { loadEnv } from '../utils/env.js'
import { logger } from '../utils/logger.js'
import { sanitizeApiError } from '../utils/sanitize.js'
import { getUsageDbService } from './usage-db.service.js'
import { formatAirportFull } from '../utils/airports.js'
import type { DealInsight, BenchmarkInsight, ParsedDeal } from '../types/index.js'
import { stripCitations } from '../utils/telegram-format.js'

loadEnv()

const PERPLEXITY_URL = 'https://api.perplexity.ai/chat/completions'
const TIMEOUT_MS = Number(process.env.ATLAS_PERPLEXITY_TIMEOUT_MS) || 30000

interface PerplexityResponse {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
  citations?: string[]
  search_results?: Array<{
    title?: string
    url?: string
    snippet?: string
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
  }
}

function getPerplexityKey(): string | null {
  return (process.env.PERPLEXITY_API_KEY || '').trim() || null
}

export function isPerplexityConfigured(): boolean {
  return getPerplexityKey() !== null
}

// --- Helper: chama Perplexity Sonar (texto livre, sem json_schema) ---
async function callPerplexity(
  systemPrompt: string,
  userPrompt: string,
  endpoint: string,
  metadata?: Record<string, unknown>,
): Promise<{ content: string; citations: string[] } | null> {
  const apiKey = getPerplexityKey()
  if (!apiKey) return null

  // Check budget
  const usageDb = getUsageDbService()
  const budgetCheck = await usageDb.checkBudget('perplexity')
  if (!budgetCheck.allowed) {
    logger.warn(`Perplexity BLOQUEADO: ${budgetCheck.used}/${budgetCheck.limit} calls`)
    return null
  }

  logger.apiCall('perplexity', endpoint)
  await usageDb.trackCall('perplexity', endpoint, metadata)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(PERPLEXITY_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        search_recency_filter: 'month',
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Perplexity error: ${response.status} - ${sanitizeApiError(text)}`)
    }

    const data = (await response.json()) as PerplexityResponse

    const content = data.choices?.[0]?.message?.content
    if (!content) {
      logger.warn(`Perplexity [${endpoint}]: resposta vazia`)
      return null
    }

    const citations = data.citations || []
    if (citations.length > 0) {
      logger.info(`Perplexity [${endpoint}]: ${citations.length} citation(s)`)
    }

    return { content, citations }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      logger.warn(`Perplexity [${endpoint}]: timeout`)
      return null
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

// --- Parse structured deals from Perplexity response ---
function parseDeals(raw: string): ParsedDeal[] {
  const cleaned = stripCitations(raw)

  // Try structured DEAL/PRICE/VALIDITY/SOURCE format
  const dealBlocks = cleaned.split(/(?=DEAL:)/i).filter(b => /DEAL:/i.test(b))

  if (dealBlocks.length > 0) {
    return dealBlocks.map(block => {
      const desc = block.match(/DEAL:\s*(.+?)(?=\n|PRICE:|$)/i)?.[1]?.trim() || ''
      const price = block.match(/PRICE:\s*(.+?)(?=\n|VALIDITY:|SOURCE:|$)/i)?.[1]?.trim() || ''
      const validity = block.match(/VALIDITY:\s*(.+?)(?=\n|SOURCE:|$)/i)?.[1]?.trim() || ''
      const source = block.match(/SOURCE:\s*(.+?)(?=\n|$)/i)?.[1]?.trim() || ''
      return { description: desc, price, validity, source }
    }).filter(d => d.description.length > 0)
  }

  // Fallback: return single deal with cleaned text
  if (cleaned.length > 10 && !/^NONE$/i.test(cleaned.trim())) {
    return [{ description: cleaned.slice(0, 300), price: '', validity: '', source: '' }]
  }

  return []
}

// --- 1. Caçador de promoções ---
export async function searchFlightDeals(
  routes: Array<{ origin: string; destination: string }>,
): Promise<DealInsight | null> {
  if (!isPerplexityConfigured() || routes.length === 0) return null

  const routeLabels = routes
    .map((r) => `${r.origin}-${r.destination}`)
    .filter((v, i, a) => a.indexOf(v) === i)
    .join(', ')

  const routeDescriptions = routes
    .map((r) => `${formatAirportFull(r.origin)} → ${formatAirportFull(r.destination)}`)
    .filter((v, i, a) => a.indexOf(v) === i)
    .join(', ')

  const systemPrompt = `You are a flight deal researcher. Search for CURRENT flight promotions from Brazil.

RULES:
- Only report deals with specific prices or points values
- Never mention aggregators (Google Flights, Kayak, Skyscanner)
- No generic advice like "book in advance"
- Answer in Portuguese (Brazil)

FORMAT each deal as:
DEAL: [description]
PRICE: [price or points]
VALIDITY: [dates if known]
SOURCE: [airline or program name]

If nothing found, reply exactly: NONE`

  const userPrompt = `Busque promoções ATUAIS de passagens aéreas para: ${routeDescriptions}.

Procure por:
- Promoções de companhias aéreas (LATAM, ANA, JAL, Emirates, Qatar, Turkish, Ethiopian)
- Bônus de transferência Livelo, Smiles, LATAM Pass
- Error fares
- Flash sales`

  const result = await callPerplexity(systemPrompt, userPrompt, 'deals', { routes: routeLabels })
  if (!result) return null

  const deals = parseDeals(result.content)
  const hasDeal = deals.length > 0

  // Build clean summary from parsed deals
  let summary = ''
  if (hasDeal) {
    for (const deal of deals) {
      summary += `${deal.description}`
      if (deal.price) summary += ` — ${deal.price}`
      if (deal.validity) summary += ` (${deal.validity})`
      if (deal.source) summary += ` [${deal.source}]`
      summary += '\n'
    }
  }

  return {
    summary: summary.trim(),
    deals,
    citations: result.citations,
    hasDeal,
  }
}

// --- 2. Benchmark de rota ---
export async function getRouteBenchmark(
  origin: string,
  destination: string,
): Promise<BenchmarkInsight | null> {
  if (!isPerplexityConfigured()) return null

  const originFull = formatAirportFull(origin)
  const destFull = formatAirportFull(destination)

  const systemPrompt = `You are a flight market analyst. Provide factual data about flight pricing based on your web search results. Answer in Portuguese (Brazil). Be concise.`

  const userPrompt = `Qual o preço típico de passagens aéreas ida e volta de ${originFull} (${origin}) para ${destFull} (${destination})?

Inclua:
- Preço médio em BRL (reais)
- Meses mais baratos para voar
- Companhias aéreas que operam essa rota (direto e com conexão)
- Tendência recente de preços (subindo, caindo ou estável)

Baseie suas respostas nos resultados de Google Flights, Skyscanner e Kayak.`

  const result = await callPerplexity(systemPrompt, userPrompt, 'benchmark', {
    origin,
    destination,
  })
  if (!result) return null

  // Tenta extrair preço médio do texto
  const avgMatch = result.content.match(
    /(?:preço médio|média|average|typical).*?R\$\s*([\d.]+)/i,
  )
  const avgPriceBRL = avgMatch ? Number(avgMatch[1].replace('.', '')) : undefined

  // Tenta extrair meses mais baratos
  const months = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
  ]
  const contentLower = result.content.toLowerCase()
  const cheapMonths = months.filter((m) => {
    // Procura menções de meses perto de "barato", "econômico", "menor"
    const idx = contentLower.indexOf(m)
    if (idx === -1) return false
    const nearby = contentLower.slice(Math.max(0, idx - 80), idx + 80)
    return /barat|econôm|menor|cheap|low/i.test(nearby)
  })
  const cheapestMonth = cheapMonths[0] || undefined

  // Extrai nomes de cias aéreas mencionadas
  const knownAirlines = [
    'LATAM', 'ANA', 'JAL', 'Japan Airlines', 'Emirates', 'Qatar Airways',
    'Turkish Airlines', 'Ethiopian Airlines', 'Air China', 'Korean Air',
    'Air France', 'KLM', 'Lufthansa', 'Swiss', 'United', 'Delta',
    'American Airlines', 'Copa Airlines', 'Gol', 'Azul',
  ]
  const airlines = knownAirlines.filter((a) =>
    result.content.toLowerCase().includes(a.toLowerCase()),
  )

  return {
    avgPriceBRL,
    cheapestMonth,
    airlines,
    summary: result.content,
    citations: result.citations,
  }
}

// --- 3. Contexto para digest semanal ---
export async function getDigestInsights(
  routes: Array<{ origin: string; destination: string }>,
  departureMonths?: string[],
): Promise<string | null> {
  if (!isPerplexityConfigured() || routes.length === 0) return null

  const routeDescriptions = routes
    .map((r) => `${r.origin}-${r.destination}`)
    .filter((v, i, a) => a.indexOf(v) === i)
    .join(', ')

  const monthContext = departureMonths?.length
    ? `Meses de embarque monitorados: ${departureMonths.join(', ')}.`
    : ''

  const systemPrompt = `You are a travel market analyst. Provide brief, actionable intelligence about the flight market. Answer in Portuguese (Brazil). Be very concise — max 5 bullet points. Format each point starting with an emoji. Max 1 line per point.`

  const userPrompt = `Inteligência de mercado para voos do Brasil (rotas: ${routeDescriptions}). ${monthContext}

Responda com 3-5 bullet points cobrindo:
- Alguma promoção de companhia aérea ativa ou prevista?
- Tendência de preços (subindo, caindo, estável)?
- Notícias relevantes (novas rotas, mudanças de cias, etc)?
- Dica de janela de compra para os próximos meses

Cada ponto com no máximo 1 linha. Sem citações numéricas.`

  const result = await callPerplexity(systemPrompt, userPrompt, 'digest', {
    routes: routeDescriptions,
  })
  if (!result) return null

  const content = stripCitations(result.content)
  let formatted = `📡 *Inteligência de Mercado*\n\n${content}`

  if (result.citations.length > 0) {
    formatted += '\n\n_Fontes: '
    const domains = result.citations.slice(0, 3).map((c) => {
      try { return new URL(c).hostname.replace('www.', '') }
      catch { return c }
    })
    formatted += domains.join(', ')
    formatted += '_'
  }

  return formatted
}

// --- 4. Validador de promoções (anti-falso-positivo) ---
export interface PromoValidation {
  isValid: boolean
  isTransferBonus: boolean // É bônus de transferência Livelo→programa?
  isActive: boolean // A promoção está ativa agora?
  summary: string // Resumo do que a promoção realmente é
  correction?: string // Correção se o alerta original estava errado
}

export async function validatePromotion(
  title: string,
  url: string,
  description?: string,
): Promise<PromoValidation | null> {
  if (!isPerplexityConfigured()) return null

  const systemPrompt = `You are a Brazilian loyalty points expert. Analyze promotions about Livelo, Smiles, LATAM Pass, and airline miles. Be factual and concise. Answer in Portuguese (Brazil).`

  const userPrompt = `Analise esta promoção encontrada em um feed RSS:

Título: "${title}"
URL: ${url}
${description ? `Descrição: "${description.slice(0, 300)}"` : ''}

Responda EXATAMENTE neste formato:
TIPO: [transferência de pontos | compra de milhas | promoção de consumo | outro]
ATIVA: [sim | não | incerto]
RESUMO: [1-2 frases explicando o que a promoção realmente é]
RELEVANTE_LIVELO: [sim | não] (é sobre transferir pontos Livelo para programa aéreo?)
CORREÇÃO: [se o título é enganoso, explique o que realmente é]`

  const result = await callPerplexity(systemPrompt, userPrompt, 'validate-promo', {
    title,
    url,
  })
  if (!result) return null

  const content = result.content

  // Parse structured response
  const tipoMatch = content.match(/TIPO:\s*(.+)/i)
  const ativaMatch = content.match(/ATIVA:\s*(.+)/i)
  const resumoMatch = content.match(/RESUMO:\s*(.+)/i)
  const relevanteMatch = content.match(/RELEVANTE_LIVELO:\s*(.+)/i)
  const correcaoMatch = content.match(/CORREÇÃO:\s*(.+)/i)

  const tipo = tipoMatch?.[1]?.trim().toLowerCase() || ''
  const ativa = ativaMatch?.[1]?.trim().toLowerCase() || ''
  const resumo = resumoMatch?.[1]?.trim() || content.slice(0, 200)
  const relevante = relevanteMatch?.[1]?.trim().toLowerCase() || ''
  const correcao = correcaoMatch?.[1]?.trim()

  // RELEVANTE_LIVELO é o sinal principal — é sobre transferir pontos Livelo?
  const isTransferBonus = relevante.includes('sim')
  const isActive = ativa.includes('sim')
  const isValid = isTransferBonus && isActive

  logger.info(
    `[PromoValidation] "${title}" → tipo=${tipo}, ativa=${ativa}, relevante=${relevante}, valid=${isValid}`,
  )

  return {
    isValid,
    isTransferBonus,
    isActive,
    summary: resumo,
    correction: isValid ? undefined : correcao || undefined,
  }
}
