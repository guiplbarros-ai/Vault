import { NextRequest, NextResponse } from 'next/server';
import { getAIUsageSummary, checkAIBudgetLimit } from '@/lib/services/ai-usage.service';

// Taxa de câmbio BRL/USD (você pode buscar de uma API futuramente)
const USD_TO_BRL = 6.0;

// Limite padrão em USD
const DEFAULT_LIMIT_USD = 10.0;

export async function GET(request: NextRequest) {
  try {
    // Get limit from query params (sent by client with their settings)
    const searchParams = request.nextUrl.searchParams;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseFloat(limitParam) : DEFAULT_LIMIT_USD;

    const currentMonth = new Date();
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    // Obter resumo de uso
    const summary = await getAIUsageSummary(startOfMonth, endOfMonth, USD_TO_BRL);

    // Verificar limite (usando limite do cliente)
    const budgetCheck = await checkAIBudgetLimit(currentMonth, limit, 0.8);

    return NextResponse.json({
      usedBrl: summary.total_cost_brl,
      limitBrl: limit * USD_TO_BRL,
      percentage: budgetCheck.percentageUsed,
      isNearLimit: budgetCheck.isNearLimit,
      isOverLimit: budgetCheck.isOverLimit,
      summary: {
        total_requests: summary.total_requests,
        total_tokens: summary.total_tokens,
        confirmed_suggestions: summary.confirmed_suggestions,
        rejected_suggestions: summary.rejected_suggestions,
        average_confidence: summary.average_confidence,
      },
    });
  } catch (error) {
    console.error('Error fetching AI usage:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI usage' },
      { status: 500 }
    );
  }
}
