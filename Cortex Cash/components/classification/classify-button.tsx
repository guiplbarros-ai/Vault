"use client";

/**
 * Classify Button Component
 * Agent APP: Owner
 *
 * Botão para classificar transações com IA
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Brain, Loader2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ClassifyButtonProps {
  transactionId: string;
  descricao: string;
  valor: number;
  tipo: 'receita' | 'despesa';
  onClassified?: (categoriaId: string, categoriaNome: string) => void;
  variant?: 'button' | 'icon';
  size?: 'sm' | 'default' | 'lg';
}

export function ClassifyButton({
  transactionId,
  descricao,
  valor,
  tipo,
  onClassified,
  variant = 'button',
  size = 'sm',
}: ClassifyButtonProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    categoria_nome: string;
    confianca: number;
    reasoning: string;
    cached?: boolean;
  } | null>(null);

  const handleClassify = async () => {
    try {
      setLoading(true);
      setResult(null);

      const response = await fetch('/api/ai/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          descricao,
          valor,
          tipo,
          transacao_id: transactionId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao classificar transação');
      }

      const data = await response.json();

      if (data.categoria_sugerida_id) {
        setResult({
          categoria_nome: data.categoria_nome,
          confianca: data.confianca,
          reasoning: data.reasoning,
          cached: data.cached,
        });

        toast.success(
          <div className="space-y-1">
            <div className="font-semibold">
              Classificada como: {data.categoria_nome}
            </div>
            <div className="text-xs text-white/60">
              Confiança: {(data.confianca * 100).toFixed(0)}%
              {data.cached && ' (cache)'}
            </div>
          </div>
        );

        onClassified?.(data.categoria_sugerida_id, data.categoria_nome);
      } else {
        toast.warning('IA não conseguiu sugerir uma categoria');
      }
    } catch (error: any) {
      console.error('Erro ao classificar:', error);
      toast.error(error.message || 'Erro ao classificar transação');
    } finally {
      setLoading(false);
    }
  };

  if (variant === 'icon') {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={handleClassify}
        disabled={loading}
        title={result ? `${result.categoria_nome} (${(result.confianca * 100).toFixed(0)}%)` : 'Classificar com IA'}
        className={cn(
          'hover:bg-white/10',
          result && 'text-green-400'
        )}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : result ? (
          <Check className="w-4 h-4" />
        ) : (
          <Brain className="w-4 h-4" />
        )}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={handleClassify}
        disabled={loading}
        size={size}
        variant="outline"
        className="gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Classificando...
          </>
        ) : (
          <>
            <Brain className="w-4 h-4" />
            Classificar com IA
          </>
        )}
      </Button>

      {result && (
        <Badge
          className={cn(
            'gap-1',
            result.confianca >= 0.8
              ? 'bg-green-500/20 text-green-300 border-green-500/30'
              : result.confianca >= 0.5
              ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
              : 'bg-red-500/20 text-red-300 border-red-500/30'
          )}
        >
          {result.categoria_nome}
          {result.cached && ' (cache)'}
        </Badge>
      )}
    </div>
  );
}
