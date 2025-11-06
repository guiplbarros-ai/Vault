"use client";

/**
 * Rule Metrics Component
 * Agent FINANCE: Owner
 *
 * Exibe métricas de acurácia das regras de classificação
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { regraClassificacaoService } from '@/lib/services/regra-classificacao.service';
import { TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Metrica {
  regra_id: string;
  nome: string;
  total_aplicacoes: number;
  total_confirmacoes: number;
  total_rejeicoes: number;
  acuracia: number | null;
  ativa: boolean;
}

export function RuleMetrics() {
  const [metricas, setMetricas] = useState<Metrica[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const data = await regraClassificacaoService.getMetricasDetalhadas();
      // Ordena por acurácia (maiores primeiro), depois por aplicações
      const sorted = data.sort((a, b) => {
        if (a.acuracia === null && b.acuracia === null) {
          return b.total_aplicacoes - a.total_aplicacoes;
        }
        if (a.acuracia === null) return 1;
        if (b.acuracia === null) return -1;
        return b.acuracia - a.acuracia;
      });
      setMetricas(sorted);
    } catch (error) {
      console.error('Erro ao carregar métricas:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAcuraciaColor = (acuracia: number | null) => {
    if (acuracia === null) return 'text-muted-foreground';
    if (acuracia >= 80) return 'text-green-600';
    if (acuracia >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAcuraciaIcon = (acuracia: number | null) => {
    if (acuracia === null) return <Minus className="h-4 w-4" />;
    if (acuracia >= 80) return <TrendingUp className="h-4 w-4" />;
    if (acuracia >= 60) return <Minus className="h-4 w-4" />;
    return <TrendingDown className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Métricas de Acurácia</CardTitle>
          <CardDescription>Carregando...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  // Filtrar apenas regras com pelo menos 1 aplicação
  const regrasComDados = metricas.filter(m => m.total_aplicacoes > 0);

  if (regrasComDados.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Métricas de Acurácia</CardTitle>
          <CardDescription>Performance das regras de classificação</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">
              Nenhuma regra foi aplicada ainda. As métricas aparecerão após as primeiras
              classificações.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Métricas de Acurácia</CardTitle>
        <CardDescription>
          Performance das {regrasComDados.length} regras com classificações
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {regrasComDados.slice(0, 10).map((metrica) => {
            const total = metrica.total_confirmacoes + metrica.total_rejeicoes;
            const acuraciaFormatada = metrica.acuracia !== null
              ? `${metrica.acuracia.toFixed(1)}%`
              : 'N/A';

            return (
              <div
                key={metrica.regra_id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                {/* Nome e status */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{metrica.nome}</span>
                    {!metrica.ativa && (
                      <Badge variant="secondary" className="text-xs">
                        Inativa
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                    <span>{metrica.total_aplicacoes} aplicações</span>
                    {total > 0 && (
                      <>
                        <span>•</span>
                        <span>{metrica.total_confirmacoes} confirmadas</span>
                        <span>•</span>
                        <span>{metrica.total_rejeicoes} rejeitadas</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Acurácia */}
                <div className="flex items-center gap-2">
                  <div className={cn('flex items-center gap-1', getAcuraciaColor(metrica.acuracia))}>
                    {getAcuraciaIcon(metrica.acuracia)}
                    <span className="text-sm font-semibold">{acuraciaFormatada}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Resumo geral */}
        <div className="mt-6 pt-4 border-t">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">
                {regrasComDados.reduce((sum, m) => sum + m.total_aplicacoes, 0)}
              </p>
              <p className="text-xs text-muted-foreground">Total de aplicações</p>
            </div>
            <div>
              <p className="text-2xl font-bold">
                {regrasComDados.reduce((sum, m) => sum + m.total_confirmacoes, 0)}
              </p>
              <p className="text-xs text-muted-foreground">Confirmações</p>
            </div>
            <div>
              <p className="text-2xl font-bold">
                {(() => {
                  const totalConf = regrasComDados.reduce((sum, m) => sum + m.total_confirmacoes, 0);
                  const totalRej = regrasComDados.reduce((sum, m) => sum + m.total_rejeicoes, 0);
                  const total = totalConf + totalRej;
                  return total > 0 ? `${((totalConf / total) * 100).toFixed(1)}%` : 'N/A';
                })()}
              </p>
              <p className="text-xs text-muted-foreground">Acurácia geral</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
