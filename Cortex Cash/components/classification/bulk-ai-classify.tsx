'use client';

/**
 * Bulk AI Classification Component
 * Agent APP: Owner
 *
 * Classifica múltiplas transações automaticamente usando IA
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { transacaoService } from '@/lib/services/transacao.service';
import { categoriaService } from '@/lib/services/categoria.service';
import { useSetting } from '@/app/providers/settings-provider';
import { toast } from 'sonner';
import { Brain, Loader2, CheckCircle, XCircle, AlertTriangle, FolderX, Power } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface BulkAIClassifyProps {
  selectedTransactionIds: string[];
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function BulkAIClassify({
  selectedTransactionIds,
  onSuccess,
  onCancel
}: BulkAIClassifyProps) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    success: number;
    failed: number;
    total: number;
    details: Array<{
      id: string;
      descricao: string;
      success: boolean;
      categoria?: string;
      error?: string;
    }>;
  } | null>(null);

  // Settings & validações
  const [aiEnabled] = useSetting<boolean>('aiCosts.enabled');
  const [hasCategories, setHasCategories] = useState<boolean | null>(null);
  const [checkingCategories, setCheckingCategories] = useState(true);

  // Verifica se existem categorias
  useEffect(() => {
    const checkCategories = async () => {
      try {
        const receitas = await categoriaService.listCategorias({ tipo: 'receita', ativas: true });
        const despesas = await categoriaService.listCategorias({ tipo: 'despesa', ativas: true });
        setHasCategories(receitas.length > 0 || despesas.length > 0);
      } catch (error) {
        console.error('Erro ao verificar categorias:', error);
        setHasCategories(false);
      } finally {
        setCheckingCategories(false);
      }
    };
    checkCategories();
  }, []);

  const handleClassify = async () => {
    try {
      setLoading(true);
      setResults(null);

      // Busca transações selecionadas
      const allTransactions = await transacaoService.listTransacoes();
      const selectedTransactions = allTransactions.filter(t =>
        selectedTransactionIds.includes(t.id)
      );

      const details = [];
      let successCount = 0;
      let failedCount = 0;

      // Processa cada transação
      for (const transaction of selectedTransactions) {
        try {
          const response = await fetch('/api/ai/classify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              descricao: transaction.descricao,
              valor: Math.abs(transaction.valor),
              tipo: transaction.tipo,
              transacao_id: transaction.id,
            }),
          });

          if (!response.ok) {
            // Tratamento especial para 501 (Not Implemented)
            if (response.status === 501) {
              throw new Error('Endpoint de classificação não está disponível no servidor');
            }

            const error = await response.json();
            throw new Error(error.message || 'Erro ao classificar');
          }

          const data = await response.json();

          if (data.categoria_sugerida_id) {
            await transacaoService.updateTransacao(transaction.id, {
              categoria_id: data.categoria_sugerida_id,
              classificacao_origem: 'ia' as const,
              classificacao_confianca: data.confianca,
            });

            details.push({
              id: transaction.id,
              descricao: transaction.descricao,
              success: true,
              categoria: data.categoria_nome,
            });
            successCount++;
          } else {
            details.push({
              id: transaction.id,
              descricao: transaction.descricao,
              success: false,
              error: 'IA não conseguiu sugerir categoria',
            });
            failedCount++;
          }
        } catch (error: any) {
          console.error(`Erro ao classificar ${transaction.id}:`, error);
          details.push({
            id: transaction.id,
            descricao: transaction.descricao,
            success: false,
            error: error.message || 'Erro desconhecido',
          });
          failedCount++;
        }
      }

      setResults({
        success: successCount,
        failed: failedCount,
        total: selectedTransactions.length,
        details,
      });

      if (successCount > 0) {
        toast.success(`${successCount} transações classificadas com IA!`, {
          description: failedCount > 0 ? `${failedCount} falharam` : 'Todas foram classificadas',
        });
        onSuccess?.();
      } else {
        toast.error('Nenhuma transação foi classificada', {
          description: 'A IA não conseguiu classificar as transações selecionadas',
        });
      }
    } catch (error) {
      console.error('Erro ao classificar em massa:', error);
      toast.error('Erro ao classificar transações', {
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    } finally {
      setLoading(false);
    }
  };

  if (selectedTransactionIds.length === 0) {
    return null;
  }

  // Empty state: Sem categorias
  if (hasCategories === false) {
    return (
      <Alert className="border-yellow-500/30 bg-yellow-500/10">
        <FolderX className="h-4 w-4 text-yellow-500" />
        <AlertDescription className="text-yellow-200">
          <strong>Nenhuma categoria encontrada.</strong>
          <br />
          Crie categorias de receita ou despesa antes de usar a classificação automática.
        </AlertDescription>
      </Alert>
    );
  }

  // Empty state: IA desativada
  if (!aiEnabled) {
    return (
      <Alert className="border-orange-500/30 bg-orange-500/10">
        <Power className="h-4 w-4 text-orange-500" />
        <AlertDescription className="text-orange-200">
          <strong>IA está desativada.</strong>
          <br />
          Ative a IA nas Configurações → IA e Custos para usar a classificação automática.
        </AlertDescription>
      </Alert>
    );
  }

  // Loading state: Verificando categorias
  if (checkingCategories) {
    return (
      <div
        className="rounded-lg border p-4 flex items-center justify-center gap-2"
        style={{
          backgroundColor: 'rgb(15, 23, 42)',
          borderColor: 'rgb(30, 41, 59)',
        }}
      >
        <Loader2 className="w-4 h-4 animate-spin text-white/60" />
        <span className="text-white/60">Verificando configurações...</span>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg border p-4"
      style={{
        backgroundColor: 'rgb(15, 23, 42)',
        borderColor: 'rgb(30, 41, 59)',
      }}
    >
      <div className="flex flex-col gap-3">
        {/* Info Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-500" />
            <span className="text-white font-medium">
              {selectedTransactionIds.length} {selectedTransactionIds.length === 1 ? 'transação selecionada' : 'transações selecionadas'}
            </span>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleClassify}
              disabled={loading}
              style={{
                background: 'linear-gradient(135deg, #9333ea 0%, #7e22ce 100%)',
                color: 'white',
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Classificando...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 mr-2" />
                  Classificar com IA
                </>
              )}
            </Button>

            {onCancel && (
              <Button
                onClick={onCancel}
                variant="outline"
                disabled={loading}
                style={{
                  borderColor: 'rgb(71, 85, 105)',
                  color: 'white',
                }}
              >
                Cancelar
              </Button>
            )}
          </div>
        </div>

        {/* Results */}
        {results && (
          <div
            className="p-3 rounded-lg border border-white/10"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
            }}
          >
            <div className="flex items-center gap-4 mb-3">
              <Badge className="bg-green-500/20 text-green-300 border-green-500/30 gap-1">
                <CheckCircle className="w-3 h-3" />
                {results.success} sucesso
              </Badge>
              {results.failed > 0 && (
                <Badge className="bg-red-500/20 text-red-300 border-red-500/30 gap-1">
                  <XCircle className="w-3 h-3" />
                  {results.failed} falharam
                </Badge>
              )}
            </div>

            {/* Detalhes */}
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {results.details.map((detail) => (
                <div
                  key={detail.id}
                  className="flex items-center justify-between text-sm p-2 rounded"
                  style={{
                    backgroundColor: detail.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  }}
                >
                  <span className="text-white/80 truncate flex-1 mr-2">
                    {detail.descricao}
                  </span>
                  {detail.success ? (
                    <Badge variant="outline" className="text-green-300 border-green-500/30 text-xs">
                      {detail.categoria}
                    </Badge>
                  ) : (
                    <span className="text-red-400 text-xs">
                      {detail.error || 'Falhou'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
