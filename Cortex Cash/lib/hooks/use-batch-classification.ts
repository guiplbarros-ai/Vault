/**
 * Hook para classificação em lote com IA
 * Agent DATA: Owner
 */

import { useState } from 'react';
import { toast } from 'sonner';

interface BatchClassifyItem {
  id: string;
  descricao: string;
  valor: number;
  tipo: 'receita' | 'despesa';
  transacao_id?: string;
}

interface BatchClassifyResult {
  id: string;
  categoria_sugerida_id: string | null;
  categoria_nome: string | null;
  confianca: number;
  reasoning: string;
  cached: boolean;
  error?: string;
}

interface BatchClassifyResponse {
  results: BatchClassifyResult[];
  summary: {
    total: number;
    successful: number;
    failed: number;
    cached: number;
    api_calls: number;
  };
}

interface UseBatchClassificationReturn {
  classify: (items: BatchClassifyItem[]) => Promise<BatchClassifyResponse | null>;
  isClassifying: boolean;
  progress: {
    current: number;
    total: number;
    percentage: number;
  } | null;
}

export function useBatchClassification(): UseBatchClassificationReturn {
  const [isClassifying, setIsClassifying] = useState(false);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
    percentage: number;
  } | null>(null);

  const classify = async (items: BatchClassifyItem[]): Promise<BatchClassifyResponse | null> => {
    if (items.length === 0) {
      toast.error('Nenhum item para classificar');
      return null;
    }

    try {
      setIsClassifying(true);
      setProgress({ current: 0, total: items.length, percentage: 0 });

      // Lê configurações do localStorage
      const settingsStr = localStorage.getItem('cortex_settings');
      const settings = settingsStr ? JSON.parse(settingsStr) : null;
      const aiCosts = settings?.aiCosts;

      if (aiCosts && !aiCosts.enabled) {
        toast.error('IA está desativada', {
          description: 'Ative nas configurações para usar classificação automática',
        });
        return null;
      }

      const response = await fetch('/api/ai/classify/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items,
          config: {
            defaultModel: aiCosts?.defaultModel || 'gpt-4o-mini',
            monthlyCostLimit: aiCosts?.monthlyCostLimit || 10.0,
            allowOverride: aiCosts?.allowOverride || false,
            strategy: aiCosts?.strategy || 'balanced',
            concurrency: 5, // 5 classificações paralelas
          },
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          toast.error('Limite de gastos excedido', {
            description: 'Ajuste o limite nas configurações',
          });
          return null;
        }

        const error = await response.json();
        throw new Error(error.message || 'Erro ao classificar transações');
      }

      const data: BatchClassifyResponse = await response.json();

      // Atualiza progresso
      setProgress({
        current: data.summary.total,
        total: data.summary.total,
        percentage: 100,
      });

      // Toast de sucesso com resumo
      const cachePercentage = Math.round((data.summary.cached / data.summary.total) * 100);
      const successPercentage = Math.round((data.summary.successful / data.summary.total) * 100);

      toast.success(`${data.summary.successful} de ${data.summary.total} transações classificadas`, {
        description: `${successPercentage}% sucesso | ${cachePercentage}% do cache | ${data.summary.api_calls} chamadas à API`,
      });

      return data;
    } catch (error) {
      console.error('Error batch classifying:', error);
      toast.error('Erro ao classificar transações', {
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
      return null;
    } finally {
      setIsClassifying(false);
      // Mantém progresso por 2 segundos antes de limpar
      setTimeout(() => setProgress(null), 2000);
    }
  };

  return {
    classify,
    isClassifying,
    progress,
  };
}
