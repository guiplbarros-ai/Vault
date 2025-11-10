'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from "@/components/dashboard-layout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { patrimonioService } from '@/lib/services/patrimonio.service';
import { investimentoService } from '@/lib/services/investimento.service';
import type { PatrimonioTotal, Investimento } from '@/lib/types';
import { Plus, TrendingUp, TrendingDown, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { THEME_COLORS } from '@/lib/constants/colors';

// Novos componentes criados
import { WealthEvolutionChart } from '@/components/wealth-evolution-chart';
import { PatrimonioByTypeChart } from '@/components/wealth/patrimonio-by-type-chart';
import { PatrimonioByInstitutionChart } from '@/components/wealth/patrimonio-by-institution-chart';
import { DiversificationWidget } from '@/components/wealth/diversification-widget';
import { TopPerformersWidget } from '@/components/wealth/top-performers-widget';
import { AssetAllocationChart } from '@/components/wealth/asset-allocation-chart';
import { InvestmentDetailModal } from '@/components/wealth/investment-detail-modal';
import { InvestmentForm } from '@/components/wealth/investment-form';
import type { InvestmentFormData } from '@/components/wealth/investment-form';

export default function WealthPage() {
  const [patrimonio, setPatrimonio] = useState<PatrimonioTotal | null>(null);
  const [investimentos, setInvestimentos] = useState<Investimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewInvestmentDialog, setShowNewInvestmentDialog] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedInvestmentId, setSelectedInvestmentId] = useState<string | null>(null);
  const [savingInvestment, setSavingInvestment] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [patrimonioData, investimentosData] = await Promise.all([
        patrimonioService.getPatrimonioTotal(),
        investimentoService.getInvestimentosAtivos(),
      ]);
      setPatrimonio(patrimonioData);
      setInvestimentos(investimentosData);
    } catch (error) {
      console.error('Erro ao carregar patrimônio:', error);
      toast.error('Erro ao carregar dados do patrimônio');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateInvestment(data: InvestmentFormData) {
    try {
      setSavingInvestment(true);

      // Convert string dates to Date objects
      const investmentData = {
        ...data,
        data_aplicacao: new Date(data.data_aplicacao),
        data_vencimento: data.data_vencimento ? new Date(data.data_vencimento) : undefined,
        status: 'ativo' as const,
      };

      await investimentoService.createInvestimento(investmentData);
      toast.success('Investimento criado com sucesso!');
      setShowNewInvestmentDialog(false);
      await loadData();
    } catch (error) {
      console.error('Erro ao criar investimento:', error);
      toast.error('Erro ao criar investimento');
    } finally {
      setSavingInvestment(false);
    }
  }

  function handleViewDetails(investmentId: string) {
    setSelectedInvestmentId(investmentId);
    setShowDetailModal(true);
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando patrimônio...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Evolução Patrimonial"
          description="Acompanhe seus investimentos e patrimônio consolidado"
          actions={
            <Button
              onClick={() => setShowNewInvestmentDialog(true)}
              size="lg"
              className="px-6 text-base font-semibold"
            >
              <Plus className="mr-2 h-5 w-5" />
              Novo Investimento
            </Button>
          }
        />

        {/* Cards de Resumo */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Patrimônio Total</CardDescription>
              <CardTitle className="text-3xl text-foreground">
                {patrimonio
                  ? `R$ ${patrimonio.patrimonio_total.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`
                  : 'R$ 0,00'}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Investimentos</CardDescription>
              <CardTitle className="text-3xl text-foreground">
                {patrimonio
                  ? `R$ ${patrimonio.saldo_investimentos.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`
                  : 'R$ 0,00'}
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                {investimentos.length} {investimentos.length === 1 ? 'ativo' : 'ativos'}
              </p>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Rentabilidade</CardDescription>
              <CardTitle className="text-3xl text-foreground">
                {patrimonio
                  ? `${patrimonio.rentabilidade_investimentos >= 0 ? '+' : ''}${patrimonio.rentabilidade_investimentos.toFixed(2)}%`
                  : '0,00%'}
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Rendimento total
              </p>
            </CardHeader>
          </Card>
        </div>

        {/* Card Principal com Tabs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Detalhamento Patrimonial</CardTitle>
            <CardDescription>
              Visualize e gerencie seus ativos e investimentos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList>
                <TabsTrigger value="overview">
                  Visão Geral
                </TabsTrigger>
                <TabsTrigger value="investments">
                  Investimentos
                </TabsTrigger>
                <TabsTrigger value="analysis">
                  Análises
                </TabsTrigger>
              </TabsList>

              {/* Tab: Visão Geral */}
              <TabsContent value="overview" className="space-y-4">
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Gráfico de Evolução */}
                  <div className="md:col-span-2">
                    <WealthEvolutionChart />
                  </div>

                  {/* Alocação de Ativos */}
                  <AssetAllocationChart />

                  {/* Top Performers */}
                  <TopPerformersWidget />
                </div>

                {/* Resumo de Contas e Investimentos */}
                {patrimonio && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-foreground">Resumo Consolidado</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div
                          className="flex items-center justify-between border-b pb-3"
                          style={{ borderColor: THEME_COLORS.divider }}
                        >
                          <div className="text-sm font-medium text-foreground">Contas Bancárias</div>
                          <div className="text-sm text-foreground">
                            R$ {patrimonio.saldo_contas.toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </div>
                        </div>
                        <div
                          className="flex items-center justify-between border-b pb-3"
                          style={{ borderColor: THEME_COLORS.divider }}
                        >
                          <div className="text-sm font-medium text-foreground">Investimentos</div>
                          <div className="text-sm text-foreground">
                            R$ {patrimonio.saldo_investimentos.toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-3">
                          <div className="text-base font-bold text-foreground">Total</div>
                          <div className="text-base font-bold text-foreground">
                            R$ {patrimonio.patrimonio_total.toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Tab: Investimentos */}
              <TabsContent value="investments" className="space-y-4">
                {investimentos.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <p className="mb-4 text-center text-muted-foreground">
                        Nenhum investimento cadastrado ainda.
                      </p>
                      <Button
                        onClick={() => setShowNewInvestmentDialog(true)}
                        className="px-5"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Cadastrar Primeiro Investimento
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-foreground">Lista de Investimentos</CardTitle>
                      <CardDescription>
                        Todos os seus investimentos ativos
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {investimentos.map((inv) => {
                          const rentabilidade =
                            ((inv.valor_atual - inv.valor_aplicado) / inv.valor_aplicado) * 100;
                          return (
                            <div
                              key={inv.id}
                              className="flex cursor-pointer items-center justify-between rounded-[12px] border border-transparent p-3 transition-colors hover:border-border hover:bg-[#1D3A34]"
                              onClick={() => handleViewDetails(inv.id)}
                            >
                              <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-2 font-medium text-foreground">
                                  {inv.nome}
                                  <Eye className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {inv.tipo.replace('_', ' ')} • Aplicado: R$ {inv.valor_aplicado.toLocaleString('pt-BR', {
                                    minimumFractionDigits: 2,
                                  })}
                                </div>
                              </div>
                              <div className="text-right space-y-1">
                                <div className="font-medium text-foreground">
                                  R$ {inv.valor_atual.toLocaleString('pt-BR', {
                                    minimumFractionDigits: 2,
                                  })}
                                </div>
                                <div
                                  className={`flex items-center justify-end gap-1 text-xs ${
                                    rentabilidade >= 0 ? 'text-success' : 'text-destructive'
                                  }`}
                                >
                                  {rentabilidade >= 0 ? (
                                    <TrendingUp className="h-3 w-3" />
                                  ) : (
                                    <TrendingDown className="h-3 w-3" />
                                  )}
                                  {rentabilidade >= 0 ? '+' : ''}{rentabilidade.toFixed(2)}%
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Tab: Análises */}
              <TabsContent value="analysis" className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Gráfico por Tipo */}
                  <PatrimonioByTypeChart />

                  {/* Gráfico por Instituição */}
                  <PatrimonioByInstitutionChart />

                  {/* Widget de Diversificação */}
                  <div className="md:col-span-2">
                    <DiversificationWidget />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Dialog: Novo Investimento */}
      <Dialog open={showNewInvestmentDialog} onOpenChange={setShowNewInvestmentDialog}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">Novo Investimento</DialogTitle>
            <DialogDescription>
              Cadastre um novo investimento no seu portfólio
            </DialogDescription>
          </DialogHeader>
          <InvestmentForm
            onSubmit={handleCreateInvestment}
            onCancel={() => setShowNewInvestmentDialog(false)}
            isLoading={savingInvestment}
            submitLabel="Cadastrar Investimento"
          />
        </DialogContent>
      </Dialog>

      {/* Modal: Detalhes do Investimento */}
      <InvestmentDetailModal
        investmentId={selectedInvestmentId}
        open={showDetailModal}
        onOpenChange={setShowDetailModal}
      />
    </DashboardLayout>
  );
}
