import { NextRequest, NextResponse } from 'next/server';
import { getServerStore } from '@/lib/services/ai-usage.store';
import { USD_TO_BRL } from '@/lib/config/currency';

// Limite padrão em USD
const DEFAULT_LIMIT_USD = 10.0;

interface AIUsageByDay {
  date: string; // YYYY-MM-DD
  requests: number;
  tokens: number;
  cost_usd: number;
  cost_brl: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // Default to current month
    const now = new Date();
    const startDate = startDateParam
      ? new Date(startDateParam)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = endDateParam
      ? new Date(endDateParam)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const store = getServerStore();
    const summary = await store.getUsageSummary(startDate, endDate);

    // Agregar por dia (simplificado - retorna apenas totais para o período)
    // Para agregação real por dia, seria necessário armazenar mais detalhes no store
    const byDay: AIUsageByDay[] = [];

    // Nota: Server store é em memória e não persiste agregações detalhadas
    // Retorna apenas o total do período como um único dia
    if (summary.total_requests > 0) {
      byDay.push({
        date: endDate.toISOString().split('T')[0],
        requests: summary.total_requests,
        tokens: summary.total_tokens,
        cost_usd: summary.total_cost_usd,
        cost_brl: summary.total_cost_usd * USD_TO_BRL,
      });
    }

    return NextResponse.json({
      summary: {
        total_requests: summary.total_requests,
        total_tokens: summary.total_tokens,
        total_cost_usd: summary.total_cost_usd,
        total_cost_brl: summary.total_cost_usd * USD_TO_BRL,
      },
      by_day: byDay,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      note: 'Server store is ephemeral. For persistent tracking, use client-side IndexedDB.',
    });
  } catch (error) {
    console.error('Error fetching AI usage:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI usage' },
      { status: 500 }
    );
  }
}
