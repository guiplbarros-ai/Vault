import { NextResponse } from 'next/server';

/**
 * POST /api/import/process
 * Agent DATA: Owner
 *
 * Processa importação e salva transações no banco
 * Opcionalmente, classifica automaticamente com IA
 */

interface ProcessRequest {
  file: {
    content: string;
    name: string;
  };
  options: {
    conta_id: string;
    templateId?: string;
    autoClassify?: boolean; // Se true, classifica com IA após importar
    skipDuplicates?: boolean; // Se true, pula transações duplicadas
  };
}

export async function POST() {
  // Não implementado no servidor: use fluxo de importação no cliente (Dexie)
  return NextResponse.json(
    { error: 'Not implemented on server. Use client-side import workflow.' },
    { status: 501 }
  );
}
