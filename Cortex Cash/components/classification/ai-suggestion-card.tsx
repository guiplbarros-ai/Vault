'use client';

/**
 * AI Suggestion Card Component
 * Agent APP: Owner
 *
 * Card com sugestão de categoria da IA e ações rápidas (aceitar/rejeitar)
 * com suporte a atalhos de teclado
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Check, X, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AISuggestionCardProps {
  transacaoId: string;
  transacaoDescricao: string;
  categoriaAtualNome?: string;
  categoriaSugeridaId: string;
  categoriaSugeridaNome: string;
  confianca: number;
  onAccept: (transacaoId: string, categoriaId: string) => Promise<void>;
  onReject: (transacaoId: string) => Promise<void>;
  enableKeyboardShortcuts?: boolean;
  shortcutIndex?: number; // Para mostrar qual tecla usar (1, 2, 3...)
}

export function AISuggestionCard({
  transacaoId,
  transacaoDescricao,
  categoriaAtualNome,
  categoriaSugeridaId,
  categoriaSugeridaNome,
  confianca,
  onAccept,
  onReject,
  enableKeyboardShortcuts = false,
  shortcutIndex,
}: AISuggestionCardProps) {
  const [processing, setProcessing] = useState(false);
  const [action, setAction] = useState<'accept' | 'reject' | null>(null);

  const confidenceColor =
    confianca >= 0.8 ? 'text-green-500' :
    confianca >= 0.6 ? 'text-yellow-500' :
    'text-orange-500';

  const handleAccept = async () => {
    try {
      setProcessing(true);
      setAction('accept');
      await onAccept(transacaoId, categoriaSugeridaId);
      toast.success('Categoria aplicada', {
        description: categoriaSugeridaNome,
        duration: 2000,
      });
    } catch (error) {
      console.error('Erro ao aceitar sugestão:', error);
      toast.error('Erro ao aplicar categoria');
    } finally {
      setProcessing(false);
      setAction(null);
    }
  };

  const handleReject = async () => {
    try {
      setProcessing(true);
      setAction('reject');
      await onReject(transacaoId);
      toast.info('Sugestão rejeitada');
    } catch (error) {
      console.error('Erro ao rejeitar sugestão:', error);
      toast.error('Erro ao rejeitar sugestão');
    } finally {
      setProcessing(false);
      setAction(null);
    }
  };

  // Atalhos de teclado
  useEffect(() => {
    if (!enableKeyboardShortcuts || processing) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignora se estiver digitando em input/textarea
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      // Y ou Enter = Aceitar
      if (e.key === 'y' || e.key === 'Y' || (shortcutIndex === 1 && e.key === 'Enter')) {
        e.preventDefault();
        handleAccept();
      }

      // N ou Backspace = Rejeitar
      if (e.key === 'n' || e.key === 'N' || e.key === 'Backspace') {
        e.preventDefault();
        handleReject();
      }

      // Números (1-9) para aceitar card específico
      if (shortcutIndex && e.key === String(shortcutIndex)) {
        e.preventDefault();
        handleAccept();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [enableKeyboardShortcuts, processing, shortcutIndex]);

  return (
    <Card
      className={cn(
        'p-4 border transition-all duration-200',
        processing && 'opacity-50',
        action === 'accept' && 'border-green-500 bg-green-50 dark:bg-green-950/20',
        action === 'reject' && 'border-red-500 bg-red-50 dark:bg-red-950/20'
      )}
    >
      <div className="space-y-3">
        {/* Header com descrição */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground line-clamp-2">
              {transacaoDescricao}
            </p>
            {categoriaAtualNome && (
              <p className="text-xs text-muted-foreground mt-1">
                Atual: {categoriaAtualNome}
              </p>
            )}
          </div>
          {shortcutIndex && enableKeyboardShortcuts && (
            <Badge variant="outline" className="text-xs font-mono">
              {shortcutIndex}
            </Badge>
          )}
        </div>

        {/* Sugestão da IA */}
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
          <Sparkles className="w-4 h-4 text-purple-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">
              {categoriaSugeridaNome}
            </p>
            <p className="text-xs text-muted-foreground">
              Sugestão da IA
            </p>
          </div>
          <Badge variant="outline" className={cn('font-mono text-xs', confidenceColor)}>
            {Math.round(confianca * 100)}%
          </Badge>
        </div>

        {/* Ações */}
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleAccept}
            disabled={processing}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          >
            {processing && action === 'accept' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Check className="w-4 h-4 mr-1" />
                Aceitar
                {enableKeyboardShortcuts && (
                  <kbd className="ml-2 px-1.5 py-0.5 text-xs rounded bg-white/20">Y</kbd>
                )}
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleReject}
            disabled={processing}
            className="flex-1 border-red-500/50 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
          >
            {processing && action === 'reject' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <X className="w-4 h-4 mr-1" />
                Rejeitar
                {enableKeyboardShortcuts && (
                  <kbd className="ml-2 px-1.5 py-0.5 text-xs rounded bg-muted">N</kbd>
                )}
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
