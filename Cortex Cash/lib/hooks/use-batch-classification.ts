/**
 * Hook para classificação em lote com IA
 * Agent DATA: Owner
 */

import { useState } from 'react';
import { toast } from 'sonner';
import { categoriaService } from '@/lib/services/categoria.service';
import { logAIUsage } from '@/lib/services/ai-usage.service';

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
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  metadata?: {
    modelo: string;
    prompt: string;
    resposta: string;
  };
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

      // Pré-carrega categorias por tipo no cliente (uma vez por chamada)
      const tiposUnicos = Array.from(new Set(items.map(i => i.tipo)));
      const categoriasMap: { receita?: { id: string; nome: string }[]; despesa?: { id: string; nome: string }[] } = {};
      if (tiposUnicos.includes('receita')) {
        const cat = await categoriaService.listCategorias({ tipo: 'receita', ativas: true });
        categoriasMap.receita = cat.map(c => ({ id: c.id, nome: c.nome }));
      }
      if (tiposUnicos.includes('despesa')) {
        const cat = await categoriaService.listCategorias({ tipo: 'despesa', ativas: true });
        categoriasMap.despesa = cat.map(c => ({ id: c.id, nome: c.nome }));
      }

      // Verifica se há categorias disponíveis
      const totalCategorias = (categoriasMap.receita?.length || 0) + (categoriasMap.despesa?.length || 0);
      if (totalCategorias === 0) {
        toast.error('Nenhuma categoria encontrada', {
          description: 'Crie categorias antes de usar a classificação automática',
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
          categorias: categoriasMap,
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

        if (response.status === 501) {
          toast.error('Funcionalidade não disponível', {
            description: 'O endpoint de classificação não está implementado no servidor',
          });
          return null;
        }

        const error = await response.json();
        throw new Error(error.message || 'Erro ao classificar transações');
      }

      const data: BatchClassifyResponse = await response.json();

      // Registra uso de IA no cliente (apenas resultados não-cached)
      for (const result of data.results) {
        if (result.usage && result.metadata && !result.cached && !result.error) {
          try {
            const item = items.find(i => i.id === result.id);
            await logAIUsage({
              transacao_id: item?.transacao_id,
              prompt: result.metadata.prompt,
              resposta: result.metadata.resposta,
              modelo: result.metadata.modelo as 'gpt-4o-mini' | 'gpt-4o' | 'gpt-4-turbo',
              tokens_prompt: result.usage.prompt_tokens,
              tokens_resposta: result.usage.completion_tokens,
              categoria_sugerida_id: result.categoria_sugerida_id ?? undefined,
              confianca: result.confianca,
            });
          } catch (logError) {
            console.error('Erro ao registrar uso de IA:', logError);
            // Não bloqueia o fluxo principal
          }
        }
      }
      console.log(`✅ ${data.summary.api_calls} usos de IA registrados (batch)`);

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
