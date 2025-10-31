/**
 * AI Usage Service
 *
 * Gerencia tracking de uso da API OpenAI e limites de gastos
 */

import { db } from '@/lib/db/client';
import { logs_ia } from '@/lib/db/schema';
import { sql, and, gte, lte } from 'drizzle-orm';
import { DatabaseError, ValidationError } from '@/lib/errors';

// Preços OpenAI (USD por 1M tokens) - atualizado em Jan 2025
const PRICING = {
  'gpt-4o-mini': {
    input: 0.150,  // $0.150 / 1M tokens
    output: 0.600, // $0.600 / 1M tokens
  },
  'gpt-4o': {
    input: 2.50,   // $2.50 / 1M tokens
    output: 10.00, // $10.00 / 1M tokens
  },
  'gpt-4-turbo': {
    input: 10.00,
    output: 30.00,
  },
} as const;

export interface AIUsageLog {
  id: string;
  transacao_id: string | null;
  prompt: string;
  resposta: string;
  modelo: string;
  tokens_prompt: number;
  tokens_resposta: number;
  tokens_total: number;
  custo_usd: number;
  categoria_sugerida_id: string | null;
  confianca: number | null;
  confirmada: boolean;
  created_at: Date;
}

export interface CreateAIUsageLogDTO {
  transacao_id?: string;
  prompt: string;
  resposta: string;
  modelo: keyof typeof PRICING;
  tokens_prompt: number;
  tokens_resposta: number;
  categoria_sugerida_id?: string;
  confianca?: number;
}

export interface AIUsageSummary {
  total_requests: number;
  total_tokens: number;
  total_cost_usd: number;
  total_cost_brl: number;
  confirmed_suggestions: number;
  rejected_suggestions: number;
  average_confidence: number;
}

export interface AIUsageByPeriod {
  period: string; // YYYY-MM-DD
  requests: number;
  tokens: number;
  cost_usd: number;
}

/**
 * Calcula o custo em USD baseado no modelo e tokens
 */
export function calculateCost(
  modelo: keyof typeof PRICING,
  tokens_prompt: number,
  tokens_resposta: number
): number {
  const pricing = PRICING[modelo];
  if (!pricing) {
    throw new ValidationError(`Modelo não suportado: ${modelo}`);
  }

  const inputCost = (tokens_prompt / 1_000_000) * pricing.input;
  const outputCost = (tokens_resposta / 1_000_000) * pricing.output;

  return inputCost + outputCost;
}

/**
 * Registra uso da API OpenAI
 */
export async function logAIUsage(data: CreateAIUsageLogDTO): Promise<AIUsageLog> {
  try {
    const custo_usd = calculateCost(
      data.modelo,
      data.tokens_prompt,
      data.tokens_resposta
    );

    const tokens_total = data.tokens_prompt + data.tokens_resposta;

    const [log] = await db.insert(logs_ia).values({
      transacao_id: data.transacao_id ?? null,
      prompt: data.prompt,
      resposta: data.resposta,
      modelo: data.modelo,
      tokens_prompt: data.tokens_prompt,
      tokens_resposta: data.tokens_resposta,
      tokens_total,
      custo_usd,
      categoria_sugerida_id: data.categoria_sugerida_id ?? null,
      confianca: data.confianca ?? null,
      confirmada: false,
    }).returning();

    return log as AIUsageLog;
  } catch (error) {
    throw new DatabaseError('Erro ao registrar uso de IA', { cause: error });
  }
}

/**
 * Marca uma sugestão como confirmada
 */
export async function confirmAISuggestion(logId: string): Promise<void> {
  try {
    await db.update(logs_ia)
      .set({ confirmada: true })
      .where(sql`${logs_ia.id} = ${logId}`);
  } catch (error) {
    throw new DatabaseError('Erro ao confirmar sugestão de IA', { cause: error });
  }
}

/**
 * Obtém resumo de uso de IA (mês atual por padrão)
 */
export async function getAIUsageSummary(
  startDate?: Date,
  endDate?: Date,
  usdToBrl: number = 6.0
): Promise<AIUsageSummary> {
  try {
    const start = startDate ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ?? new Date();

    const logs = await db.select()
      .from(logs_ia)
      .where(
        and(
          gte(logs_ia.created_at, start),
          lte(logs_ia.created_at, end)
        )
      );

    const total_requests = logs.length;
    const total_tokens = logs.reduce((sum, log) => sum + log.tokens_total, 0);
    const total_cost_usd = logs.reduce((sum, log) => sum + log.custo_usd, 0);
    const total_cost_brl = total_cost_usd * usdToBrl;

    const suggestions = logs.filter(log => log.categoria_sugerida_id !== null);
    const confirmed_suggestions = suggestions.filter(log => log.confirmada).length;
    const rejected_suggestions = suggestions.filter(log => !log.confirmada).length;

    const confidenceValues = suggestions
      .filter(log => log.confianca !== null)
      .map(log => log.confianca!);

    const average_confidence = confidenceValues.length > 0
      ? confidenceValues.reduce((sum, val) => sum + val, 0) / confidenceValues.length
      : 0;

    return {
      total_requests,
      total_tokens,
      total_cost_usd,
      total_cost_brl,
      confirmed_suggestions,
      rejected_suggestions,
      average_confidence,
    };
  } catch (error) {
    throw new DatabaseError('Erro ao obter resumo de uso de IA', { cause: error });
  }
}

/**
 * Obtém uso de IA agrupado por período
 */
export async function getAIUsageByPeriod(
  startDate: Date,
  endDate: Date,
  groupBy: 'day' | 'month' = 'day'
): Promise<AIUsageByPeriod[]> {
  try {
    const logs = await db.select()
      .from(logs_ia)
      .where(
        and(
          gte(logs_ia.created_at, startDate),
          lte(logs_ia.created_at, endDate)
        )
      );

    // Agrupar manualmente por período
    const grouped = new Map<string, { requests: number; tokens: number; cost_usd: number }>();

    logs.forEach(log => {
      const date = new Date(log.created_at);
      let period: string;

      if (groupBy === 'day') {
        period = date.toISOString().split('T')[0]; // YYYY-MM-DD
      } else {
        period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
      }

      const existing = grouped.get(period) ?? { requests: 0, tokens: 0, cost_usd: 0 };
      grouped.set(period, {
        requests: existing.requests + 1,
        tokens: existing.tokens + log.tokens_total,
        cost_usd: existing.cost_usd + log.custo_usd,
      });
    });

    return Array.from(grouped.entries())
      .map(([period, data]) => ({ period, ...data }))
      .sort((a, b) => a.period.localeCompare(b.period));
  } catch (error) {
    throw new DatabaseError('Erro ao obter uso de IA por período', { cause: error });
  }
}

/**
 * Verifica se está próximo do limite de gastos
 */
export async function checkAIBudgetLimit(
  currentMonth: Date = new Date(),
  limitUsd: number,
  warningThreshold: number = 0.8
): Promise<{
  isNearLimit: boolean;
  isOverLimit: boolean;
  usedUsd: number;
  remainingUsd: number;
  percentageUsed: number;
}> {
  const summary = await getAIUsageSummary(
    new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1),
    new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
  );

  const usedUsd = summary.total_cost_usd;
  const remainingUsd = Math.max(0, limitUsd - usedUsd);
  const percentageUsed = limitUsd > 0 ? (usedUsd / limitUsd) * 100 : 0;

  return {
    isNearLimit: percentageUsed >= warningThreshold * 100,
    isOverLimit: usedUsd > limitUsd,
    usedUsd,
    remainingUsd,
    percentageUsed,
  };
}
