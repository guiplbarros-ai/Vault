import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { calculateCost } from '@/lib/services/ai-usage.service'
import { getServerStore, checkAIBudgetLimitSafe } from '@/lib/services/ai-usage.store'

type AIModel = 'gpt-4o-mini' | 'gpt-4o'
type AIStrategy = 'aggressive' | 'balanced' | 'quality'

interface TopCategoria {
  nome: string
  valor: number
}

interface MonthSummary {
  month: string // YYYY-MM
  total_receitas: number
  total_despesas: number
  saldo_liquido: number
  top_categorias: TopCategoria[]
}

interface ReportConfig {
  defaultModel?: AIModel
  monthlyCostLimit?: number
  allowOverride?: boolean
  strategy?: AIStrategy
}

interface FinancialReportRequest {
  months: MonthSummary[]
  config?: ReportConfig
}

interface FinancialReportResponse {
  resumo: string
  recomendacoes: string[]
  oportunidades: string[]
  alertas: string[]
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  metadata?: {
    modelo: string
    prompt: string
    resposta: string
  }
}

const SYSTEM_PROMPT = `
Você é um analista financeiro pessoal especializado em orçamento doméstico no Brasil.
Analise os dados dos últimos 3 meses e produza um relatório sucinto e prático.
Regras:
- Escreva em português do Brasil
- Seja direto, prático e acionável
- Foque em redução de despesas, aumento de poupança e melhoria do saldo
- Considere sazonalidade, variações e concentração em categorias
- Responda APENAS com JSON válido no formato:
{
  "resumo": string,
  "recomendacoes": string[],
  "oportunidades": string[],
  "alertas": string[]
}
`.trim()

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    const body: FinancialReportRequest = await request.json()
    const months = body.months || []
    const config = body.config || {}

    if (!Array.isArray(months) || months.length < 3) {
      return NextResponse.json(
        { error: 'Provide at least 3 months of data' },
        { status: 400 }
      )
    }

    // Defaults
    const modelo = (config.defaultModel || 'gpt-4o-mini') as AIModel
    const monthlyCostLimit = config.monthlyCostLimit ?? 10.0
    const allowOverride = config.allowOverride ?? false
    const strategy = (config.strategy || 'balanced') as AIStrategy

    // Budget check before calling OpenAI
    const store = getServerStore()
    const budgetCheck = await checkAIBudgetLimitSafe(store, new Date(), monthlyCostLimit, 0.8)
    if (budgetCheck.isOverLimit && !allowOverride) {
      return NextResponse.json(
        {
          error: 'AI budget limit exceeded',
          message: 'Limite de gastos de IA excedido. Ajuste nas configurações.',
        },
        { status: 429 }
      )
    }

    // Build concise input summary
    const monthsSummary = months.map((m) => {
      const top = [...m.top_categorias]
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 5)
        .map(c => `${c.nome}: R$ ${c.valor.toFixed(2)}`)
        .join(', ')
      return `- ${m.month}: receitas=R$ ${m.total_receitas.toFixed(2)}, despesas=R$ ${m.total_despesas.toFixed(2)}, saldo=R$ ${m.saldo_liquido.toFixed(2)}, top categorias: ${top}`
    }).join('\n')

    const userPrompt = `
Dados dos últimos 3 meses (mais recente por último):
${monthsSummary}
`.trim()

    const strategyParams = {
      aggressive: { temperature: 0.5, max_tokens: 300 },
      balanced: { temperature: 0.3, max_tokens: 350 },
      quality: { temperature: 0.1, max_tokens: 450 },
    } as const
    const params = strategyParams[strategy]

    const completion = await openai.chat.completions.create({
      model: modelo,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: params.temperature,
      max_tokens: params.max_tokens,
    })

    const resposta = completion.choices[0]?.message?.content ?? ''
    const usage = completion.usage
    if (!usage) {
      throw new Error('No usage data returned from OpenAI')
    }

    // Parse JSON result
    let parsed: {
      resumo: string
      recomendacoes: string[]
      oportunidades: string[]
      alertas: string[]
    }
    try {
      const jsonStr = resposta.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      parsed = JSON.parse(jsonStr)
    } catch {
      return NextResponse.json(
        {
          error: 'Invalid AI response',
          message: 'Resposta da IA não pôde ser processada',
        },
        { status: 500 }
      )
    }

    // Log into server store for budget control
    const custo_usd = calculateCost(modelo as any, usage.prompt_tokens, usage.completion_tokens)
    await store.logUsage({
      id: crypto.randomUUID(),
      timestamp: new Date(),
      tokens_total: usage.total_tokens,
      custo_usd,
    })

    const response: FinancialReportResponse = {
      resumo: parsed.resumo,
      recomendacoes: parsed.recomendacoes || [],
      oportunidades: parsed.oportunidades || [],
      alertas: parsed.alertas || [],
      usage: {
        prompt_tokens: usage.prompt_tokens,
        completion_tokens: usage.completion_tokens,
        total_tokens: usage.total_tokens,
      },
      metadata: {
        modelo,
        prompt: userPrompt,
        resposta,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error generating AI report:', error)
    return NextResponse.json(
      { error: 'Failed to generate AI report' },
      { status: 500 }
    )
  }
}


