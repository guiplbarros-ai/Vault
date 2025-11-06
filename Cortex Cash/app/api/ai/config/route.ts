/**
 * AI Config Endpoint
 * Agent IA: Owner
 *
 * Retorna configurações de IA do cliente (localStorage) para uso pelo backend
 */

import { NextRequest, NextResponse } from 'next/server';

export interface AIConfig {
  enabled: boolean;
  defaultModel: 'gpt-4o-mini' | 'gpt-4o';
  monthlyCostLimit: number;
  allowOverride: boolean;
  strategy: 'aggressive' | 'balanced' | 'quality';
  cachePrompts: boolean;
  batchProcessing: boolean;
  batchSize: 10 | 25 | 50 | 100;
}

/**
 * POST /api/ai/config
 * Recebe configurações do cliente para serem usadas nas próximas chamadas
 */
export async function POST(request: NextRequest) {
  try {
    const config: AIConfig = await request.json();

    // Valida configuração
    if (!config.defaultModel || !['gpt-4o-mini', 'gpt-4o'].includes(config.defaultModel)) {
      return NextResponse.json(
        { error: 'Invalid model specified' },
        { status: 400 }
      );
    }

    if (typeof config.monthlyCostLimit !== 'number' || config.monthlyCostLimit < 0) {
      return NextResponse.json(
        { error: 'Invalid monthly cost limit' },
        { status: 400 }
      );
    }

    // Retorna a configuração validada
    // Nota: Como Next.js API routes são stateless, retornamos apenas validação
    // O cliente deve enviar config em cada requisição via header ou body
    return NextResponse.json({
      success: true,
      config,
    });
  } catch (error) {
    console.error('Error processing AI config:', error);
    return NextResponse.json(
      { error: 'Failed to process config' },
      { status: 500 }
    );
  }
}
