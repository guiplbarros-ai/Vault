"use client";

/**
 * Budgets Page
 * Agent FINANCE: Owner
 *
 * Painel de orçamentos com visão "planejado vs. realizado"
 */

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { orcamentoService } from '@/lib/services/orcamento.service';
import type { OrcamentoComProgresso } from '@/lib/services/orcamento.service';
import { format, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function BudgetsPage() {
  const [mesReferencia, setMesReferencia] = useState(() => {
    const hoje = new Date();
    return format(hoje, 'yyyy-MM');
  });

  const [orcamentos, setOrcamentos] = useState<OrcamentoComProgresso[]>([]);
  const [resumo, setResumo] = useState<{
    total_planejado: number;
    total_realizado: number;
    total_restante: number;
    percentual_usado: number;
    orcamentos_ok: number;
    orcamentos_atencao: number;
    orcamentos_excedidos: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [recalculando, setRecalculando] = useState(false);

  useEffect(() => {
    loadOrcamentos();
  }, [mesReferencia]);

  const loadOrcamentos = async () => {
    try {
      setLoading(true);
      const [orcamentosData, resumoData] = await Promise.all([
        orcamentoService.listOrcamentosComProgresso({ mesReferencia }),
        orcamentoService.getResumoMensal(mesReferencia),
      ]);

      setOrcamentos(orcamentosData);
      setResumo(resumoData);
    } catch (error) {
      console.error('Erro ao carregar orçamentos:', error);
      toast.error('Erro ao carregar orçamentos');
    } finally {
      setLoading(false);
    }
  };

  const handleRecalcular = async () => {
    try {
      setRecalculando(true);
      const count = await orcamentoService.recalcularTodosDoMes(mesReferencia);
      toast.success(`${count} orçamentos recalculados`);
      await loadOrcamentos();
    } catch (error) {
      console.error('Erro ao recalcular:', error);
      toast.error('Erro ao recalcular orçamentos');
    } finally {
      setRecalculando(false);
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

    if (nova > hoje) {
      toast.info('Não há dados futuros');
      return;
    }

    setMesReferencia(format(nova, 'yyyy-MM'));
  };

  const getStatusIcon = (status: 'ok' | 'atencao' | 'excedido') => {
    if (status === 'ok') return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (status === 'atencao') return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
    return <XCircle className="h-5 w-5 text-red-600" />;
  };

  const getStatusColor = (status: 'ok' | 'atencao' | 'excedido') => {
    if (status === 'ok') return 'bg-green-500';
    if (status === 'atencao') return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStatusText = (status: 'ok' | 'atencao' | 'excedido') => {
    if (status === 'ok') return 'No limite';
    if (status === 'atencao') return 'Atenção';
    return 'Excedido';
  };

  const mesFormatado = format(
    new Date(mesReferencia.split('-').map(Number)[0], mesReferencia.split('-').map(Number)[1] - 1),
    "MMMM 'de' yyyy",
    { locale: ptBR }
  );

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Orçamentos</h1>
            <p className="text-muted-foreground mt-2">
              Acompanhe seu planejamento vs. realizado
            </p>
          </div>

          <Button onClick={handleRecalcular} variant="outline" disabled={recalculando}>
            {recalculando ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Recalculando...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Recalcular
              </>
            )}
          </Button>
        </div>

        <Separator />

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={handleMesAnterior}>
                <ChevronLeft className="h-5 w-5" />
              </Button>

              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <span className="text-lg font-semibold capitalize">{mesFormatado}</span>
              </div>

              <Button variant="ghost" size="icon" onClick={handleProximoMes}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {resumo && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Planejado</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  R$ {resumo.total_planejado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Realizado</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  R$ {resumo.total_realizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <Progress value={resumo.percentual_usado} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {resumo.percentual_usado.toFixed(1)}% usado
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Restante</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={cn(
                  "text-2xl font-bold",
                  resumo.total_restante >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  R$ {Math.abs(resumo.total_restante).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 text-sm">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>{resumo.orcamentos_ok}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <span>{resumo.orcamentos_atencao}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span>{resumo.orcamentos_excedidos}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Orçamentos do Mês</CardTitle>
            <CardDescription>
              {orcamentos.length} orçamento{orcamentos.length !== 1 ? 's' : ''} cadastrado{orcamentos.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {orcamentos.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Nenhum orçamento cadastrado para este mês</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orcamentos.map((orcamento) => (
                  <div
                    key={orcamento.id}
                    className="flex items-center gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-shrink-0">
                      {getStatusIcon(orcamento.status)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {orcamento.categoria_icone && (
                          <span className="text-lg">{orcamento.categoria_icone}</span>
                        )}
                        <h4 className="font-semibold truncate">{orcamento.nome}</h4>
                        <Badge variant="outline" className="text-xs">
                          {orcamento.categoria_nome || orcamento.centro_custo_nome}
                        </Badge>
                      </div>

                      <div className="mt-2">
                        <div className="flex items-center justify-between text-sm text-muted-foreground mb-1">
                          <span>
                            R$ {orcamento.valor_realizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} de R$ {orcamento.valor_planejado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          <span>{orcamento.percentual_usado.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn("h-full transition-all", getStatusColor(orcamento.status))}
                            style={{ width: `${Math.min(orcamento.percentual_usado, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex-shrink-0 text-right">
                      <p className={cn(
                        "text-lg font-bold",
                        orcamento.valor_restante >= 0 ? "text-green-600" : "text-red-600"
                      )}>
                        {orcamento.valor_restante >= 0 ? '+' : '-'}R$ {Math.abs(orcamento.valor_restante).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {getStatusText(orcamento.status)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
