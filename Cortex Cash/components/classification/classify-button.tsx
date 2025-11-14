"use client";

/**
 * Classify Button Component
 * Agent APP: Owner
 *
 * Botão para classificar transações com IA
 * Inclui modal com detalhes de reasoning e preview
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Brain, Loader2, Check, X, AlertCircle, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { categoriaService } from '@/lib/services/categoria.service';
import { transacaoService } from '@/lib/services/transacao.service';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ClassifyButtonProps {
  transactionId: string;
  descricao: string;
  valor: number;
  tipo: 'receita' | 'despesa';
  onClassified?: (categoriaId: string, categoriaNome: string, confianca: number) => void;
  autoApply?: boolean;
  variant?: 'button' | 'icon';
  size?: 'sm' | 'default' | 'lg';
}

interface ClassificationResult {
  categoria_nome: string;
  categoria_sugerida_id: string;
  confianca: number;
  reasoning: string;
  cached?: boolean;
}

export function ClassifyButton({
  transactionId,
  descricao,
  valor,
  tipo,
  onClassified,
  autoApply = false,
  variant = 'button',
  size = 'sm',
}: ClassifyButtonProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [applying, setApplying] = useState(false);

  const handleClassify = async () => {
    try {
      setLoading(true);
      setResult(null);

      const categorias = await categoriaService.listCategorias({ tipo, ativas: true });

      const response = await fetch('/api/ai/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          descricao,
          valor,
          tipo,
          transacao_id: transactionId,
          categorias: categorias.map(c => ({ id: c.id, nome: c.nome })),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao classificar transação');
      }

      const data = await response.json();

      if (data.categoria_sugerida_id) {
        const classificationResult: ClassificationResult = {
          categoria_nome: data.categoria_nome,
          categoria_sugerida_id: data.categoria_sugerida_id,
          confianca: data.confianca,
          reasoning: data.reasoning,
          cached: data.cached,
        };

        setResult(classificationResult);

        // Se autoApply, aplica diretamente sem modal
        if (autoApply) {
          await handleApply(classificationResult);
        } else {
          // Mostra modal para revisão
          setShowModal(true);
        }
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

  const handleApply = async (classificationResult: ClassificationResult) => {
    try {
      setApplying(true);
      await transacaoService.updateTransacao(transactionId, {
        categoria_id: classificationResult.categoria_sugerida_id,
        classificacao_origem: 'ia' as const,
        classificacao_confianca: classificationResult.confianca,
      });

      toast.success(
        <div className="space-y-1">
          <div className="font-semibold flex items-center gap-2">
            <Check className="w-4 h-4" />
            {classificationResult.categoria_nome}
          </div>
          <div className="text-xs text-white/60">
            Confiança: {(classificationResult.confianca * 100).toFixed(0)}%
            {classificationResult.cached && ' • Cache'}
          </div>
        </div>
      );

      onClassified?.(
        classificationResult.categoria_sugerida_id,
        classificationResult.categoria_nome,
        classificationResult.confianca
      );

      setShowModal(false);
      setResult(null);
    } catch (error) {
      console.error('Erro ao aplicar categoria:', error);
      toast.error('Erro ao aplicar categoria');
    } finally {
      setApplying(false);
    }
  };

  const handleReject = () => {
    toast.info('Classificação rejeitada', {
      description: 'Você pode tentar novamente ou atribuir manualmente uma categoria.',
    });
    setShowModal(false);
    setResult(null);
  };

  // Determina cor da confiança
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-500/20 text-green-300 border-green-500/30';
    if (confidence >= 0.6) return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    if (confidence >= 0.5) return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
    return 'bg-red-500/20 text-red-300 border-red-500/30';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'Muito Alta';
    if (confidence >= 0.6) return 'Alta';
    if (confidence >= 0.5) return 'Média';
    return 'Baixa';
  };

  if (variant === 'icon') {
    return (
      <>
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

        {/* Modal de detalhes */}
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-500" />
                Classificação sugerida
              </DialogTitle>
              <DialogDescription>
                Revise a sugestão da IA antes de aplicar
              </DialogDescription>
            </DialogHeader>

            {result && (
              <div className="space-y-4">
                {/* Badge de categoria */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-secondary/50">
                  <span className="font-medium text-foreground">{result.categoria_nome}</span>
                  <Badge className={getConfidenceColor(result.confianca)}>
                    {(result.confianca * 100).toFixed(0)}%
                  </Badge>
                </div>

                {/* Nível de confiança */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-secondary">Confiança</label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-secondary/30 overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          result.confianca >= 0.8
                            ? 'bg-green-500'
                            : result.confianca >= 0.6
                            ? 'bg-blue-500'
                            : result.confianca >= 0.5
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        )}
                        style={{ width: `${result.confianca * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">
                      {getConfidenceLabel(result.confianca)}
                    </span>
                  </div>
                </div>

                {/* Cache indicator */}
                {result.cached && (
                  <Alert className="border-blue-500/30 bg-blue-500/10">
                    <Zap className="h-4 w-4 text-blue-500" />
                    <AlertDescription className="text-blue-300">
                      Resposta em cache (sem custo de API)
                    </AlertDescription>
                  </Alert>
                )}

                {/* Reasoning */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-secondary">Raciocínio</label>
                  <p className="text-sm text-foreground/80 p-3 rounded bg-secondary/20 border border-secondary/30 italic">
                    "{result.reasoning}"
                  </p>
                </div>

                {/* Transação Info */}
                <div className="space-y-1 p-3 rounded bg-secondary/20 border border-secondary/30">
                  <p className="text-xs text-secondary">Descrição:</p>
                  <p className="text-sm font-medium text-foreground truncate">{descricao}</p>
                  <p className="text-xs text-secondary mt-2">Valor:</p>
                  <p className="text-sm font-semibold text-gold">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format(valor)}
                  </p>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={handleReject}
                disabled={applying}
              >
                Rejeitar
              </Button>
              <Button
                onClick={() => result && handleApply(result)}
                disabled={applying || !result}
              >
                {applying ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Aplicando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Aplicar
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
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
              'gap-1 cursor-pointer',
              getConfidenceColor(result.confianca)
            )}
            onClick={() => setShowModal(true)}
          >
            {result.categoria_nome}
            {result.cached && ' (cache)'}
          </Badge>
        )}
      </div>

      {/* Modal de detalhes */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-500" />
              Classificação sugerida
            </DialogTitle>
            <DialogDescription>
              Revise a sugestão da IA antes de aplicar
            </DialogDescription>
          </DialogHeader>

          {result && (
            <div className="space-y-4">
              {/* Badge de categoria */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-secondary/50">
                <span className="font-medium text-foreground">{result.categoria_nome}</span>
                <Badge className={getConfidenceColor(result.confianca)}>
                  {(result.confianca * 100).toFixed(0)}%
                </Badge>
              </div>

              {/* Nível de confiança */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-secondary">Confiança</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-secondary/30 overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        result.confianca >= 0.8
                          ? 'bg-green-500'
                          : result.confianca >= 0.6
                          ? 'bg-blue-500'
                          : result.confianca >= 0.5
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      )}
                      style={{ width: `${result.confianca * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">
                    {getConfidenceLabel(result.confianca)}
                  </span>
                </div>
              </div>

              {/* Cache indicator */}
              {result.cached && (
                <Alert className="border-blue-500/30 bg-blue-500/10">
                  <Zap className="h-4 w-4 text-blue-500" />
                  <AlertDescription className="text-blue-300">
                    Resposta em cache (sem custo de API)
                  </AlertDescription>
                </Alert>
              )}

              {/* Reasoning */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-secondary">Raciocínio</label>
                <p className="text-sm text-foreground/80 p-3 rounded bg-secondary/20 border border-secondary/30 italic">
                  "{result.reasoning}"
                </p>
              </div>

              {/* Transação Info */}
              <div className="space-y-1 p-3 rounded bg-secondary/20 border border-secondary/30">
                <p className="text-xs text-secondary">Descrição:</p>
                <p className="text-sm font-medium text-foreground truncate">{descricao}</p>
                <p className="text-xs text-secondary mt-2">Valor:</p>
                <p className="text-sm font-semibold text-gold">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(valor)}
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleReject}
              disabled={applying}
            >
              Rejeitar
            </Button>
            <Button
              onClick={() => result && handleApply(result)}
              disabled={applying || !result}
            >
              {applying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Aplicando...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Aplicar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
