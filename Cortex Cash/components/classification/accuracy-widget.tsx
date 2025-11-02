"use client";

/**
 * Accuracy Widget Component
 * Agent APP: Owner
 *
 * Widget de acurácia de classificação automática
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, CheckCircle, XCircle, AlertCircle, TrendingUp } from 'lucide-react';
import { getClassificationStats } from '@/lib/finance/classification/rule-engine';
import { cn } from '@/lib/utils';

export function AccuracyWidget() {
  const [stats, setStats] = useState<{
    total_transacoes: number;
    classificadas: number;
    por_regra: number;
    por_ia: number;
    manuais: number;
    confirmadas: number;
    pendentes_confirmacao: number;
    taxa_acuracia: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        // Últimos 30 dias
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 30);

        const data = await getClassificationStats(start, end);
        setStats(data);
      } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Acurácia de Classificação
          </CardTitle>
          <CardDescription>Carregando...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!stats || stats.classificadas === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Acurácia de Classificação
          </CardTitle>
          <CardDescription>Últimos 30 dias</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-white/60">
            <AlertCircle className="w-12 h-12 mx-auto mb-2 text-white/40" />
            <p>Nenhuma transação classificada automaticamente</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const taxaClassificacao = (stats.classificadas / stats.total_transacoes) * 100;
  const taxaAutomatica = ((stats.por_regra + stats.por_ia) / stats.classificadas) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5" />
          Acurácia de Classificação
        </CardTitle>
        <CardDescription>Últimos 30 dias</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Taxa de Acurácia Principal */}
        <div className="text-center p-4 rounded-lg bg-gradient-to-br from-[#18B0A4]/20 to-[#18B0A4]/5 border border-[#18B0A4]/30">
          <div className="text-4xl font-bold text-[#18B0A4] mb-1">
            {stats.taxa_acuracia.toFixed(0)}%
          </div>
          <div className="text-sm text-white/60">
            Taxa de Aceitação de Sugestões
          </div>
          <div className="text-xs text-white/40 mt-1">
            {stats.confirmadas} confirmadas / {stats.classificadas} total
          </div>
        </div>

        {/* Breakdown por Origem */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/60">Por Regras</span>
            <div className="flex items-center gap-2">
              <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500"
                  style={{
                    width: `${(stats.por_regra / stats.classificadas) * 100}%`,
                  }}
                />
              </div>
              <span className="text-white font-medium w-12 text-right">
                {stats.por_regra}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-white/60">Por IA</span>
            <div className="flex items-center gap-2">
              <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500"
                  style={{
                    width: `${(stats.por_ia / stats.classificadas) * 100}%`,
                  }}
                />
              </div>
              <span className="text-white font-medium w-12 text-right">
                {stats.por_ia}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-white/60">Manual</span>
            <div className="flex items-center gap-2">
              <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gray-500"
                  style={{
                    width: `${(stats.manuais / stats.classificadas) * 100}%`,
                  }}
                />
              </div>
              <span className="text-white font-medium w-12 text-right">
                {stats.manuais}
              </span>
            </div>
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Badge
            className={cn(
              'gap-1',
              stats.taxa_acuracia >= 80
                ? 'bg-green-500/20 text-green-300 border-green-500/30'
                : stats.taxa_acuracia >= 60
                ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                : 'bg-red-500/20 text-red-300 border-red-500/30'
            )}
          >
            <TrendingUp className="w-3 h-3" />
            {stats.taxa_acuracia >= 80
              ? 'Excelente'
              : stats.taxa_acuracia >= 60
              ? 'Boa'
              : 'Melhorável'}
          </Badge>

          {stats.pendentes_confirmacao > 0 && (
            <Badge variant="outline" className="border-yellow-500/30 text-yellow-300 gap-1">
              <AlertCircle className="w-3 h-3" />
              {stats.pendentes_confirmacao} pendentes
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
