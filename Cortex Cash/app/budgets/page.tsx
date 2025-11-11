"use client";

/**
 * Budgets Page
 * Agent FINANCE: Owner
 *
 * Painel de orçamentos com visão "planejado vs. realizado"
 */

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus,
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
    if (status === 'ok') return <CheckCircle className="h-5 w-5" style={{ color: '#6CCB8C' }} />;
    if (status === 'atencao') return <AlertTriangle className="h-5 w-5" style={{ color: '#E0B257' }} />;
    return <XCircle className="h-5 w-5" style={{ color: '#F07167' }} />;
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
        <PageHeader
          title="Orçamentos"
          description="Acompanhe seu planejamento vs. realizado"
          actions={
            <div className="flex gap-2">
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
              <Button
                onClick={() => {
                  toast.info('Funcionalidade em desenvolvimento');
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Novo Orçamento
              </Button>
            </div>
          }
        />

        {/* TEMA.md: Month selector - solid bg-card, shadow-1 */}
        <Card 
          style={{
            backgroundColor: '#18322C',
            borderColor: '#2A4942',
            borderWidth: '1px',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 1px 0 rgba(0,0,0,.35), 0 6px 12px rgba(0,0,0,.25)',
          }}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleMesAnterior}
                style={{ color: '#F2F7F5' }}
                className="hover:bg-[#1D3A34]"
                aria-label="Mês anterior"
              >
                <ChevronLeft className="h-5 w-5" />
                <span className="sr-only">Mês anterior</span>
              </Button>

              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" style={{ color: '#8CA39C' }} />
                <span className="text-lg font-semibold capitalize" style={{ color: '#F2F7F5' }}>{mesFormatado}</span>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleProximoMes}
                style={{ color: '#F2F7F5' }}
                className="hover:bg-[#1D3A34]"
                aria-label="Próximo mês"
              >
                <ChevronRight className="h-5 w-5" />
                <span className="sr-only">Próximo mês</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* TEMA.md: Summary stats - KPI cards with shadow-2 and icon pills 36px */}
        {resumo && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card 
              style={{
                backgroundColor: '#18322C',
                borderColor: '#2A4942',
                borderWidth: '1px',
                borderRadius: 'var(--radius-lg)',
                boxShadow: '0 1px 0 rgba(0,0,0,.4), 0 10px 18px rgba(0,0,0,.28)',
              }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3 mb-2">
                  <div 
                    className="h-9 w-9 rounded-xl flex items-center justify-center"
                    style={{
                      backgroundColor: '#142A25',
                      border: '1px solid #2A4942',
                    }}
                  >
                    <Calendar className="h-4 w-4" style={{ color: '#D4AF37' }} />
                  </div>
                  <CardDescription className="text-sm" style={{ color: '#B2BDB9' }}>Planejado</CardDescription>
                </div>
                <CardTitle className="text-3xl font-bold" style={{ color: '#D4AF37' }}>
                  R$ {resumo.total_planejado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card 
              style={{
                backgroundColor: '#18322C',
                borderColor: '#2A4942',
                borderWidth: '1px',
                borderRadius: 'var(--radius-lg)',
                boxShadow: '0 1px 0 rgba(0,0,0,.4), 0 10px 18px rgba(0,0,0,.28)',
              }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3 mb-2">
                  <div 
                    className="h-9 w-9 rounded-xl flex items-center justify-center"
                    style={{
                      backgroundColor: '#142A25',
                      border: '1px solid #2A4942',
                    }}
                  >
                    <CheckCircle className="h-4 w-4" style={{ color: '#3A8F6E' }} />
                  </div>
                  <CardDescription className="text-sm" style={{ color: '#B2BDB9' }}>Realizado</CardDescription>
                </div>
                <CardTitle className="text-3xl font-bold" style={{ color: '#F2F7F5' }}>
                  R$ {resumo.total_realizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <Progress value={resumo.percentual_usado} className="mb-2" />
                <p className="text-xs" style={{ color: '#8CA39C' }}>
                  {resumo.percentual_usado.toFixed(1)}% usado
                </p>
              </CardContent>
            </Card>

            <Card 
              style={{
                backgroundColor: '#18322C',
                borderColor: '#2A4942',
                borderWidth: '1px',
                borderRadius: 'var(--radius-lg)',
                boxShadow: '0 1px 0 rgba(0,0,0,.4), 0 10px 18px rgba(0,0,0,.28)',
              }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3 mb-2">
                  <div 
                    className="h-9 w-9 rounded-xl flex items-center justify-center"
                    style={{
                      backgroundColor: '#142A25',
                      border: '1px solid #2A4942',
                    }}
                  >
                    <AlertTriangle 
                      className="h-4 w-4" 
                      style={{ color: resumo.total_restante >= 0 ? '#6CCB8C' : '#F07167' }} 
                    />
                  </div>
                  <CardDescription className="text-sm" style={{ color: '#B2BDB9' }}>Restante</CardDescription>
                </div>
                <CardTitle 
                  className="text-3xl font-bold"
                  style={{ color: resumo.total_restante >= 0 ? '#6CCB8C' : '#F07167' }}
                >
                  R$ {Math.abs(resumo.total_restante).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card 
              style={{
                backgroundColor: '#18322C',
                borderColor: '#2A4942',
                borderWidth: '1px',
                borderRadius: 'var(--radius-lg)',
                boxShadow: '0 1px 0 rgba(0,0,0,.4), 0 10px 18px rgba(0,0,0,.28)',
              }}
            >
              <CardHeader className="pb-3">
                <CardDescription className="text-sm mb-3" style={{ color: '#B2BDB9' }}>Status Geral</CardDescription>
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4" style={{ color: '#6CCB8C' }} />
                    <span className="font-semibold" style={{ color: '#F2F7F5' }}>{resumo.orcamentos_ok}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4" style={{ color: '#E0B257' }} />
                    <span className="font-semibold" style={{ color: '#F2F7F5' }}>{resumo.orcamentos_atencao}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <XCircle className="h-4 w-4" style={{ color: '#F07167' }} />
                    <span className="font-semibold" style={{ color: '#F2F7F5' }}>{resumo.orcamentos_excedidos}</span>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </div>
        )}

        {/* TEMA.md: Main budgets list - solid bg-card */}
        <Card 
          style={{
            backgroundColor: '#18322C',
            borderColor: '#2A4942',
            borderWidth: '1px',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 1px 0 rgba(0,0,0,.35), 0 6px 12px rgba(0,0,0,.25)',
          }}
        >
          <CardHeader className="pb-4">
            <CardTitle style={{ color: '#F2F7F5' }}>Orçamentos do Mês</CardTitle>
            <CardDescription style={{ color: '#B2BDB9' }}>
              {orcamentos.length} orçamento{orcamentos.length !== 1 ? 's' : ''} cadastrado{orcamentos.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {orcamentos.length === 0 ? (
              <div className="text-center py-12">
                <p style={{ color: '#8CA39C' }}>Nenhum orçamento cadastrado para este mês</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orcamentos.map((orcamento) => (
                  <div
                    key={orcamento.id}
                    className="flex items-center gap-4 p-4 rounded-lg hover:bg-[#1D3A34] transition-all"
                    style={{
                      backgroundColor: '#142A25',
                      border: '1px solid #2A4942',
                    }}
                  >
                    <div className="flex-shrink-0">
                      {getStatusIcon(orcamento.status)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {orcamento.categoria_icone && (
                          <span className="text-lg">{orcamento.categoria_icone}</span>
                        )}
                        <h4 className="font-semibold truncate" style={{ color: '#F2F7F5' }}>{orcamento.nome}</h4>
                        <Badge 
                          variant="outline" 
                          className="text-xs"
                          style={{ 
                            color: '#8CA39C',
                            borderColor: '#2A4942',
                          }}
                        >
                          {orcamento.categoria_nome || orcamento.centro_custo_nome}
                        </Badge>
                      </div>

                      <div className="mt-2">
                        <div className="flex items-center justify-between text-sm mb-1" style={{ color: '#B2BDB9' }}>
                          <span>
                            R$ {orcamento.valor_realizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} de R$ {orcamento.valor_planejado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          <span>{orcamento.percentual_usado.toFixed(1)}%</span>
                        </div>
                        <div 
                          className="h-2 rounded-full overflow-hidden"
                          style={{ backgroundColor: '#2A4942' }}
                        >
                          <div
                            className="h-full transition-all"
                            style={{ 
                              width: `${Math.min(orcamento.percentual_usado, 100)}%`,
                              backgroundColor: orcamento.status === 'ok' ? '#6CCB8C' : orcamento.status === 'atencao' ? '#E0B257' : '#F07167',
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex-shrink-0 text-right">
                      <p 
                        className="text-lg font-bold"
                        style={{ color: orcamento.valor_restante >= 0 ? '#6CCB8C' : '#F07167' }}
                      >
                        {orcamento.valor_restante >= 0 ? '+' : '-'}R$ {Math.abs(orcamento.valor_restante).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs" style={{ color: '#8CA39C' }}>
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
