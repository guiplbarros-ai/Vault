'use client';

import { useState } from 'react';
import { toast } from 'sonner';

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

      const response = await fetch('/api/ai/classify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
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
