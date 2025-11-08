import { NextRequest, NextResponse } from 'next/server';

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

export async function POST(request: NextRequest) {
  try {
    // Tenta ler JSON; se falhar ou estiver vazio, responde 400
    let body: ProcessRequest | null = null;
    try {
      body = (await request.json()) as ProcessRequest;
    } catch {
      body = null;
    }

    if (
      !body ||
      !body.file ||
      typeof body.file.content !== 'string' ||
      typeof body.file.name !== 'string' ||
      !body.options ||
      typeof body.options.conta_id !== 'string' ||
      body.options.conta_id.trim().length === 0
    ) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    // Não implementado no servidor: use fluxo de importação no cliente (Dexie)
    return NextResponse.json(
      { error: 'Not implemented on server. Use client-side import workflow.' },
      { status: 501 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
