import { NextRequest, NextResponse } from 'next/server';
import { parseCSV } from '@/lib/import/parsers/csv';
import { detectSeparator } from '@/lib/import/detectors/separator';
import { getTemplate } from '@/lib/import/templates';

/**
 * POST /api/import/upload
 * Agent DATA: Owner
 *
 * Upload e parse de arquivo CSV/OFX
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const templateId = formData.get('templateId') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Valida tipo de arquivo
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'text/plain',
      'application/octet-stream', // OFX
    ];

    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(csv|ofx|txt)$/i)) {
      return NextResponse.json(
        {
          error: 'Invalid file type',
          message: 'Apenas arquivos CSV ou OFX são permitidos'
        },
        { status: 400 }
      );
    }

    // Valida tamanho (máximo 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          error: 'File too large',
          message: 'Arquivo muito grande. Máximo: 10MB'
        },
        { status: 400 }
      );
    }

    // Lê conteúdo do arquivo
    const content = await file.text();

    // Detecta encoding (tenta UTF-8, fallback para ISO-8859-1)
    let decodedContent = content;
    let hasInvalidChars = false;
    try {
      // Se contém caracteres inválidos UTF-8, tenta ISO-8859-1
      hasInvalidChars = /[\u0080-\u009F]/.test(content);
      if (hasInvalidChars) {
        const buffer = await file.arrayBuffer();
        const decoder = new TextDecoder('iso-8859-1');
        decodedContent = decoder.decode(buffer);
      }
    } catch (error) {
      console.warn('Encoding detection failed, using original content');
    }

    // Detecta tipo de arquivo
    const isOFX = file.name.toLowerCase().endsWith('.ofx') ||
                  decodedContent.includes('<OFX>') ||
                  decodedContent.includes('OFXHEADER');

    if (isOFX) {
      return NextResponse.json(
        {
          error: 'OFX not yet supported',
          message: 'Suporte para OFX em desenvolvimento. Use CSV por enquanto.'
        },
        { status: 501 }
      );
    }

    // Parse CSV
    const separator = detectSeparator(decodedContent);

    // Aplica template se fornecido
    const template = templateId ? getTemplate(templateId) : null;
    const columnMapping = template?.columnMapping;

    const result = await parseCSV(decodedContent, {
      separator: template?.separador || separator,
      hasHeader: template?.hasHeader ?? true,
      columnMapping,
    });

    // Retorna preview com primeiras 100 transações
    const preview = {
      file: {
        name: file.name,
        size: file.size,
        type: file.type,
        encoding: hasInvalidChars ? 'ISO-8859-1' : 'UTF-8',
      },
      metadata: result.metadata,
      transactions: result.transactions.slice(0, 100), // Preview apenas
      errors: result.errors.slice(0, 20), // Primeiros 20 erros
      summary: {
        total: result.transactions.length,
        preview: Math.min(100, result.transactions.length),
        hasMore: result.transactions.length > 100,
        errorCount: result.errors.length,
      },
    };

    return NextResponse.json(preview);
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      {
        error: 'Failed to process file',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}
