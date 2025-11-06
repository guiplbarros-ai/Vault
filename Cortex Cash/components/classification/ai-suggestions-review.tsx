'use client';

/**
 * AI Suggestions Review Component
 * Agent APP: Owner
 *
 * Interface para revisar múltiplas sugestões de IA em sequência
 * com atalhos de teclado e navegação rápida
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AISuggestionCard } from './ai-suggestion-card';
import { transacaoService } from '@/lib/services/transacao.service';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  XCircle,
  Sparkles,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Suggestion {
  transacaoId: string;
  transacaoDescricao: string;
  categoriaAtualNome?: string;
  categoriaSugeridaId: string;
  categoriaSugeridaNome: string;
  confianca: number;
}

interface AISuggestionsReviewProps {
  suggestions: Suggestion[];
  onComplete?: (stats: { accepted: number; rejected: number }) => void;
  onCancel?: () => void;
}

export function AISuggestionsReview({
  suggestions,
  onComplete,
  onCancel,
}: AISuggestionsReviewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [processed, setProcessed] = useState<{
    [key: string]: 'accepted' | 'rejected';
  }>({});

  const currentSuggestion = suggestions[currentIndex];
  const totalSuggestions = suggestions.length;
  const processedCount = Object.keys(processed).length;
  const acceptedCount = Object.values(processed).filter(v => v === 'accepted').length;
  const rejectedCount = Object.values(processed).filter(v => v === 'rejected').length;
  const progress = (processedCount / totalSuggestions) * 100;

  const handleAccept = async (transacaoId: string, categoriaId: string) => {
    await transacaoService.updateTransacao(transacaoId, {
      categoria_id: categoriaId,
      classificacao_origem: 'ia',
      classificacao_confianca: currentSuggestion.confianca,
    });

    setProcessed(prev => ({ ...prev, [transacaoId]: 'accepted' }));

    // Avança para próxima sugestão
    if (currentIndex < totalSuggestions - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Finalizou todas
      handleComplete();
    }
  };

  const handleReject = async (transacaoId: string) => {
    setProcessed(prev => ({ ...prev, [transacaoId]: 'rejected' }));

    // Avança para próxima sugestão
    if (currentIndex < totalSuggestions - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Finalizou todas
      handleComplete();
    }
  };

  const handleComplete = () => {
    const stats = {
      accepted: acceptedCount + (processed[currentSuggestion.transacaoId] === 'accepted' ? 1 : 0),
      rejected: rejectedCount + (processed[currentSuggestion.transacaoId] === 'rejected' ? 1 : 0),
    };

    toast.success('Revisão concluída!', {
      description: `${stats.accepted} aceitas, ${stats.rejected} rejeitadas`,
      duration: 4000,
    });

    onComplete?.(stats);
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < totalSuggestions - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleSkipAll = () => {
    if (confirm('Tem certeza que deseja cancelar a revisão?')) {
      onCancel?.();
    }
  };

  // Atalhos de teclado para navegação
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignora se estiver digitando
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      // Setas esquerda/direita para navegar
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      }

      // ESC para cancelar
      if (e.key === 'Escape') {
        e.preventDefault();
        handleSkipAll();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex]);

  if (!currentSuggestion) {
    return null;
  }

  return (
    <Card className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            <h3 className="text-lg font-semibold">Revisar Sugestões de IA</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkipAll}
            className="text-muted-foreground"
          >
            Cancelar
            <kbd className="ml-2 px-1.5 py-0.5 text-xs rounded bg-muted">ESC</kbd>
          </Button>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Sugestão {currentIndex + 1} de {totalSuggestions}
            </span>
            <div className="flex gap-3">
              <Badge variant="outline" className="gap-1">
                <CheckCircle className="w-3 h-3 text-green-500" />
                {acceptedCount} aceitas
              </Badge>
              <Badge variant="outline" className="gap-1">
                <XCircle className="w-3 h-3 text-red-500" />
                {rejectedCount} rejeitadas
              </Badge>
            </div>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Current Suggestion */}
      <div>
        <AISuggestionCard
          transacaoId={currentSuggestion.transacaoId}
          transacaoDescricao={currentSuggestion.transacaoDescricao}
          categoriaAtualNome={currentSuggestion.categoriaAtualNome}
          categoriaSugeridaId={currentSuggestion.categoriaSugeridaId}
          categoriaSugeridaNome={currentSuggestion.categoriaSugeridaNome}
          confianca={currentSuggestion.confianca}
          onAccept={handleAccept}
          onReject={handleReject}
          enableKeyboardShortcuts={true}
        />
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-3 border-t">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrevious}
          disabled={currentIndex === 0}
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Anterior
          <kbd className="ml-2 px-1.5 py-0.5 text-xs rounded bg-muted">←</kbd>
        </Button>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Info className="w-4 h-4" />
          <span>
            Use <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">Y</kbd> para aceitar,{' '}
            <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">N</kbd> para rejeitar
          </span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleNext}
          disabled={currentIndex === totalSuggestions - 1}
        >
          Próxima
          <kbd className="ml-2 px-1.5 py-0.5 text-xs rounded bg-muted">→</kbd>
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </Card>
  );
}
