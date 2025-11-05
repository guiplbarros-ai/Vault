import { NextRequest, NextResponse } from 'next/server';
import { parseCSV } from '@/lib/import/parsers/csv';
import { transacaoService } from '@/lib/services/transacao.service';
import { generateTransactionHash } from '@/lib/import/dedupe';
import { getTemplate } from '@/lib/import/templates';

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
    const body: ProcessRequest = await request.json();
    const { file, options } = body;

    if (!file?.content || !options?.conta_id) {
      return NextResponse.json(
        { error: 'Missing file content or conta_id' },
        { status: 400 }
      );
    }

    // Parse arquivo
    const template = options.templateId ? getTemplate(options.templateId) : null;
    const columnMapping = template?.columnMapping;

    const parseResult = await parseCSV(file.content, {
      separator: template?.separador,
      hasHeader: template?.hasHeader ?? true,
      columnMapping,
    });

    // Processa transações
    const imported: string[] = [];
    const duplicates: string[] = [];
    const errors: Array<{ row: number; message: string }> = [];

    for (let i = 0; i < parseResult.transactions.length; i++) {
      const transaction = parseResult.transactions[i];

      try {
        // Gera hash para dedupe (inclui conta_id para evitar conflitos entre contas)
        const hash = await generateTransactionHash({
          data: typeof transaction.data === 'string' ? new Date(transaction.data) : transaction.data,
          descricao: transaction.descricao,
          valor: transaction.valor,
        }, options.conta_id);

        // Verifica duplicata
        if (options.skipDuplicates) {
          const existing = await transacaoService.getTransacaoByHash(hash);
          if (existing) {
            duplicates.push(hash);
            continue;
          }
        }

        // Cria transação (hash é gerado automaticamente pelo service)
        const created = await transacaoService.createTransacao({
          conta_id: options.conta_id,
          data: new Date(transaction.data),
          descricao: transaction.descricao,
          valor: transaction.valor,
          tipo: transaction.tipo || 'despesa',
        });

        imported.push(created.id);
      } catch (error) {
        errors.push({
          row: i + 1,
          message: error instanceof Error ? error.message : 'Erro desconhecido',
        });
      }
    }

    // Classifica automaticamente se solicitado
    let classificationResults = null;
    if (options.autoClassify && imported.length > 0) {
      try {
        // Busca transações recém-criadas
        const transactionsToClassify = await Promise.all(
          imported.map(id => transacaoService.getTransacaoById(id))
        );

        // Prepara dados para batch classification
        const items = transactionsToClassify
          .filter((t): t is NonNullable<typeof t> => t !== null)
          .map(t => ({
            id: t.id,
            descricao: t.descricao,
            valor: t.valor,
            tipo: t.tipo,
            transacao_id: t.id,
          }));

        // Chama API de batch classification
        const classifyResponse = await fetch(`${request.nextUrl.origin}/api/ai/classify/batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items,
            config: {
              defaultModel: 'gpt-4o-mini',
              strategy: 'balanced',
              concurrency: 10, // Mais rápido para importação
            },
          }),
        });

        if (classifyResponse.ok) {
          const classifyData = await classifyResponse.json();
          classificationResults = classifyData.summary;

          // Atualiza transações com categorias sugeridas
          for (const result of classifyData.results) {
            if (result.categoria_sugerida_id && result.confianca >= 0.7) {
              await transacaoService.updateTransacao(result.id, {
                categoria_id: result.categoria_sugerida_id,
              });
            }
          }
        }
      } catch (error) {
        console.error('Auto-classification failed:', error);
        // Não falha a importação se classificação falhar
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        total: parseResult.transactions.length,
        imported: imported.length,
        duplicates: duplicates.length,
        errors: errors.length,
        autoClassified: classificationResults?.successful || 0,
      },
      imported,
      duplicates,
      errors: errors.slice(0, 20), // Primeiros 20 erros
      classification: classificationResults,
    });
  } catch (error) {
    console.error('Error processing import:', error);
    return NextResponse.json(
      {
        error: 'Failed to process import',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}
