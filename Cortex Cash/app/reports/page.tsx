"use client";

/**
 * Reports Page
 * Agent FINANCE: Owner
 *
 * Relatórios de gastos por categoria com comparação mensal
 */

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Download,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronLeft,
  ChevronRight,
  Calendar,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { relatorioService } from '@/lib/services/relatorio.service';
import type { RelatorioComparativo, GastoPorCategoria, ComparacaoMensal } from '@/lib/services/relatorio.service';
import { format, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function ReportsPage() {
  const [mesReferencia, setMesReferencia] = useState(() => {
    const hoje = new Date();
    return format(hoje, 'yyyy-MM');
  });

  const [relatorio, setRelatorio] = useState<RelatorioComparativo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRelatorio();
  }, [mesReferencia]);

  const loadRelatorio = async () => {
    try {
      setLoading(true);
      const data = await relatorioService.gerarRelatorioComparativo(mesReferencia);
      setRelatorio(data);
    } catch (error) {
      console.error('Erro ao carregar relatório:', error);
      toast.error('Erro ao carregar relatório');
    } finally {
      setLoading(false);
    }
  };

  const handleMesAnterior = () => {
    const [ano, mes] = mesReferencia.split('-').map(Number);
    const nova = subMonths(new Date(ano, mes - 1), 1);
    setMesReferencia(format(nova, 'yyyy-MM'));
  };

  const handleProximoMes = () => {
    const [ano, mes] = mesReferencia.split('-').map(Number);
    const nova = addMonths(new Date(ano, mes - 1), 1);
    const hoje = new Date();

    // Não permite avançar além do mês atual
    if (nova > hoje) {
      toast.info('Não há dados futuros');
      return;
    }

    setMesReferencia(format(nova, 'yyyy-MM'));
  };

  const handleExportCSV = () => {
    if (!relatorio) return;

    const csv = relatorioService.exportarComparativoParaCSV(relatorio);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-${mesReferencia}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success('Relatório exportado com sucesso!');
  };

  const getTendenciaIcon = (tendencia: 'aumento' | 'reducao' | 'estavel') => {
    if (tendencia === 'aumento') return <TrendingUp className="h-4 w-4 text-red-600" />;
    if (tendencia === 'reducao') return <TrendingDown className="h-4 w-4 text-green-600" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getTendenciaColor = (tendencia: 'aumento' | 'reducao' | 'estavel') => {
    if (tendencia === 'aumento') return 'text-red-600';
    if (tendencia === 'reducao') return 'text-green-600';
    return 'text-muted-foreground';
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!relatorio) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Nenhum dado disponível</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Relatórios</h1>
            <p className="text-muted-foreground mt-2">
              Gastos por categoria e comparação mensal
            </p>
          </div>

          <Button onClick={handleExportCSV} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
        </div>

        <Separator />

        {/* Navegação de Mês */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={handleMesAnterior}>
                <ChevronLeft className="h-5 w-5" />
              </Button>

              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <span className="text-lg font-semibold">
                  {relatorio.mes_atual.mes_formatado}
                </span>
              </div>

              <Button variant="ghost" size="icon" onClick={handleProximoMes}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Resumo Geral */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Receitas */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receitas</CardTitle>
              <ArrowDownRight className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                R$ {relatorio.mes_atual.total_receitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">
                {relatorio.variacao_total_receitas >= 0 ? '+' : ''}
                R$ {relatorio.variacao_total_receitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} vs mês anterior
              </p>
            </CardContent>
          </Card>

          {/* Despesas */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Despesas</CardTitle>
              <ArrowUpRight className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                R$ {relatorio.mes_atual.total_despesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">
                {relatorio.variacao_total_despesas >= 0 ? '+' : ''}
                R$ {relatorio.variacao_total_despesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} vs mês anterior
              </p>
            </CardContent>
          </Card>

          {/* Saldo */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saldo Líquido</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={cn(
                "text-2xl font-bold",
                relatorio.mes_atual.saldo_liquido >= 0 ? "text-green-600" : "text-red-600"
              )}>
                R$ {relatorio.mes_atual.saldo_liquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">
                {relatorio.variacao_saldo_liquido >= 0 ? '+' : ''}
                R$ {relatorio.variacao_saldo_liquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} vs mês anterior
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Gastos por Categoria */}
        <Card>
          <CardHeader>
            <CardTitle>Gastos por Categoria</CardTitle>
            <CardDescription>
              {relatorio.mes_atual.gastos_por_categoria.length} categorias · {relatorio.mes_atual.transacoes_despesa} transações
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {relatorio.mes_atual.gastos_por_categoria.map((gasto) => {
                const comparacao = relatorio.comparacoes.find(
                  c => c.categoria_id === gasto.categoria_id
                );

                return (
                  <div
                    key={gasto.categoria_id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    {/* Categoria */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {gasto.categoria_icone && (
                          <span className="text-lg">{gasto.categoria_icone}</span>
                        )}
                        <span className="font-medium">{gasto.categoria_nome}</span>
                        <Badge variant="outline" className="text-xs">
                          {gasto.quantidade_transacoes}
                        </Badge>
                      </div>

                      {/* Barra de progresso */}
                      <div className="mt-2">
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${gasto.percentual}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Valor e variação */}
                    <div className="ml-4 text-right">
                      <div className="text-lg font-semibold">
                        R$ {gasto.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        <span className="text-muted-foreground">{gasto.percentual.toFixed(1)}%</span>
                        {comparacao && (
                          <div className={cn('flex items-center gap-1', getTendenciaColor(comparacao.tendencia))}>
                            {getTendenciaIcon(comparacao.tendencia)}
                            <span className="text-xs">
                              {comparacao.variacao_percentual >= 0 ? '+' : ''}
                              {comparacao.variacao_percentual.toFixed(0)}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Destaques */}
        {(relatorio.maiores_aumentos.length > 0 || relatorio.maiores_reducoes.length > 0) && (
          <div className="grid gap-4 md:grid-cols-2">
            {/* Maiores Aumentos */}
            {relatorio.maiores_aumentos.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-red-600">Maiores Aumentos</CardTitle>
                  <CardDescription>Top 3 categorias com maior aumento</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {relatorio.maiores_aumentos.map((comp, index) => (
                      <div key={comp.categoria_id} className="flex items-center gap-3">
                        <Badge variant="destructive" className="w-6 h-6 flex items-center justify-center p-0">
                          {index + 1}
                        </Badge>
                        <div className="flex-1">
                          <p className="font-medium">{comp.categoria_nome}</p>
                          <p className="text-sm text-muted-foreground">
                            R$ {comp.mes_anterior.toFixed(2)} → R$ {comp.mes_atual.toFixed(2)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-red-600">
                            +R$ {comp.variacao_absoluta.toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            +{comp.variacao_percentual.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Maiores Reduções */}
            {relatorio.maiores_reducoes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-green-600">Maiores Reduções</CardTitle>
                  <CardDescription>Top 3 categorias com maior economia</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {relatorio.maiores_reducoes.map((comp, index) => (
                      <div key={comp.categoria_id} className="flex items-center gap-3">
                        <Badge className="w-6 h-6 flex items-center justify-center p-0 bg-green-600">
                          {index + 1}
                        </Badge>
                        <div className="flex-1">
                          <p className="font-medium">{comp.categoria_nome}</p>
                          <p className="text-sm text-muted-foreground">
                            R$ {comp.mes_anterior.toFixed(2)} → R$ {comp.mes_atual.toFixed(2)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-600">
                            R$ {comp.variacao_absoluta.toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {comp.variacao_percentual.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
