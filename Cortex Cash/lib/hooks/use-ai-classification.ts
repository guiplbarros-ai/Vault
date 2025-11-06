'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { categoriaService } from '@/lib/services/categoria.service';
import { logAIUsage } from '@/lib/services/ai-usage.service';

interface ClassifyRequest {
  descricao: string;
  valor: number;
  tipo: 'receita' | 'despesa';
  transacao_id?: string;
}

interface ClassifyResponse {
  categoria_sugerida_id: string | null;
  categoria_nome: string | null;
  confianca: number;
  reasoning: string;
  cached?: boolean;
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

// Get AI settings from localStorage
function getAISettings() {
  if (typeof window === 'undefined') return null;

  try {
    const settings = localStorage.getItem('cortex_settings');
    if (!settings) return null;

    const parsed = JSON.parse(settings);
    return parsed.aiCosts || null;
  } catch {
    return null;
  }
}

export function useAIClassification() {
  const [isClassifying, setIsClassifying] = useState(false);
  const [suggestion, setSuggestion] = useState<ClassifyResponse | null>(null);

  const classify = async (data: ClassifyRequest): Promise<ClassifyResponse | null> => {
    setIsClassifying(true);
    setSuggestion(null);

    try {
      // Get settings from localStorage
      const aiSettings = getAISettings();

      // Check if AI is enabled
      if (aiSettings && !aiSettings.enabled) {
        toast.error('IA desativada', {
          description: 'Ative os recursos de IA nas configurações.',
        });
        return null;
      }

      // Carrega categorias do tipo no cliente (Dexie) para evitar acesso no servidor
      const categorias = await categoriaService.listCategorias({ tipo: data.tipo, ativas: true });

      const response = await fetch('/api/ai/classify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          categorias: categorias.map(c => ({ id: c.id, nome: c.nome })),
          config: aiSettings ? {
            defaultModel: aiSettings.defaultModel,
            monthlyCostLimit: aiSettings.monthlyCostLimit,
            allowOverride: aiSettings.allowOverride,
            strategy: aiSettings.strategy,
          } : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();

        if (response.status === 429) {
          toast.error('Limite de IA excedido', {
            description: 'Você atingiu o limite mensal de gastos com IA. Ajuste nas configurações.',
          });
          return null;
        }

        throw new Error(error.message || 'Erro ao classificar transação');
      }

      const result: ClassifyResponse = await response.json();
      setSuggestion(result);

      // Registra uso de IA no cliente (apenas se não veio do cache)
      if (result.usage && result.metadata && !result.cached) {
        try {
          await logAIUsage({
            transacao_id: data.transacao_id,
            prompt: result.metadata.prompt,
            resposta: result.metadata.resposta,
            modelo: result.metadata.modelo as 'gpt-4o-mini' | 'gpt-4o' | 'gpt-4-turbo',
            tokens_prompt: result.usage.prompt_tokens,
            tokens_resposta: result.usage.completion_tokens,
            categoria_sugerida_id: result.categoria_sugerida_id ?? undefined,
            confianca: result.confianca,
          });
          console.log('✅ Uso de IA registrado');
        } catch (logError) {
          console.error('Erro ao registrar uso de IA:', logError);
          // Não bloqueia o fluxo principal
        }
      }

      if (result.categoria_sugerida_id) {
        toast.success('Categoria sugerida!', {
          description: `${result.categoria_nome} (${Math.round(result.confianca * 100)}% de confiança)`,
        });
      } else {
        toast.warning('Nenhuma categoria encontrada', {
          description: 'A IA não conseguiu sugerir uma categoria adequada.',
        });
      }

      return result;
    } catch (error) {
      console.error('Error classifying transaction:', error);
      toast.error('Erro ao classificar', {
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
      return null;
    } finally {
      setIsClassifying(false);
    }
  };

  const clearSuggestion = () => {
    setSuggestion(null);
  };

  return {
    classify,
    isClassifying,
    suggestion,
    clearSuggestion,
  };
}
