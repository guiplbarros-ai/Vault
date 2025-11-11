/**
 * API Endpoint: POST /api/demo/populate
 * Popula o banco com dados de demonstração
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('[API] Iniciando população de dados demo...');

    // Importar seed-demo aqui (no servidor)
    const { seedDemoData } = await import('@/lib/db/seed-demo');

    // Executar seed
    const result = await seedDemoData();

    console.log('[API] Seed concluído:', result);

    return NextResponse.json(
      {
        success: true,
        message: 'Dados demo carregados com sucesso',
        data: result,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] Erro ao popular dados demo:', error);

    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';

    return NextResponse.json(
      {
        success: false,
        message: 'Erro ao carregar dados demo',
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
