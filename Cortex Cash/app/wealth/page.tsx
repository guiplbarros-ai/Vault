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
            <p className="text-white/70">Carregando patrimônio...</p>
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
              className="rounded-xl px-6 py-3 text-base font-semibold text-white hover:opacity-90"
              style={{
                backgroundColor: '#18B0A4',
                color: '#ffffff'
              }}
            >
              <Plus className="mr-2 h-5 w-5" />
              Novo Investimento
            </Button>
          }
        />

        {/* Cards de Resumo */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card style={{
            background: 'linear-gradient(135deg, #3B5563 0%, #334455 100%)',
            backgroundColor: '#3B5563'
          }}>
            <CardHeader className="pb-3">
              <CardDescription className="text-white/70">Patrimônio Total</CardDescription>
              <CardTitle className="text-3xl text-white">
                {patrimonio
                  ? `R$ ${patrimonio.patrimonio_total.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`
                  : 'R$ 0,00'}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card style={{
            background: 'linear-gradient(135deg, #3B5563 0%, #334455 100%)',
            backgroundColor: '#3B5563'
          }}>
            <CardHeader className="pb-3">
              <CardDescription className="text-white/70">Investimentos</CardDescription>
              <CardTitle className="text-3xl text-white">
                {patrimonio
                  ? `R$ ${patrimonio.saldo_investimentos.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`
                  : 'R$ 0,00'}
              </CardTitle>
              <p className="text-xs text-white/60 mt-1">
                {investimentos.length} {investimentos.length === 1 ? 'ativo' : 'ativos'}
              </p>
            </CardHeader>
          </Card>

          <Card style={{
            background: 'linear-gradient(135deg, #3B5563 0%, #334455 100%)',
            backgroundColor: '#3B5563'
          }}>
            <CardHeader className="pb-3">
              <CardDescription className="text-white/70">Rentabilidade</CardDescription>
              <CardTitle className="text-3xl text-white">
                {patrimonio
                  ? `${patrimonio.rentabilidade_investimentos >= 0 ? '+' : ''}${patrimonio.rentabilidade_investimentos.toFixed(2)}%`
                  : '0,00%'}
              </CardTitle>
              <p className="text-xs text-white/60 mt-1">
                Rendimento total
              </p>
            </CardHeader>
          </Card>
        </div>

        {/* Card Principal com Tabs */}
        <Card style={{
          background: 'linear-gradient(135deg, #3B5563 0%, #334455 100%)',
          backgroundColor: '#3B5563'
        }}>
          <CardHeader>
            <CardTitle className="text-white">Detalhamento Patrimonial</CardTitle>
            <CardDescription className="text-white/70">
              Visualize e gerencie seus ativos e investimentos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="border-0" style={{ backgroundColor: '#1e293b' }}>
                <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-white" style={{ color: '#ffffff' }}>
                  Visão Geral
                </TabsTrigger>
                <TabsTrigger value="investments" className="data-[state=active]:bg-primary data-[state=active]:text-white" style={{ color: '#ffffff' }}>
                  Investimentos
                </TabsTrigger>
                <TabsTrigger value="analysis" className="data-[state=active]:bg-primary data-[state=active]:text-white" style={{ color: '#ffffff' }}>
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
                  <Card style={{
                    background: 'linear-gradient(135deg, #3B5563 0%, #334455 100%)',
                    backgroundColor: '#3B5563'
                  }}>
                    <CardHeader>
                      <CardTitle className="text-white">Resumo Consolidado</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                          <div className="text-sm font-medium text-white">Contas Bancárias</div>
                          <div className="text-sm text-white">
                            R$ {patrimonio.saldo_contas.toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </div>
                        </div>
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                          <div className="text-sm font-medium text-white">Investimentos</div>
                          <div className="text-sm text-white">
                            R$ {patrimonio.saldo_investimentos.toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-3">
                          <div className="text-base font-bold text-white">Total</div>
                          <div className="text-base font-bold text-white">
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
                  <Card style={{
                    background: 'linear-gradient(135deg, #3B5563 0%, #334455 100%)',
                    backgroundColor: '#3B5563'
                  }}>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <p className="text-center text-white/70 mb-4">
                        Nenhum investimento cadastrado ainda.
                      </p>
                      <Button
                        onClick={() => setShowNewInvestmentDialog(true)}
                        style={{
                          backgroundColor: '#18B0A4',
                          color: '#ffffff',
                        }}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Cadastrar Primeiro Investimento
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <Card style={{
                    background: 'linear-gradient(135deg, #3B5563 0%, #334455 100%)',
                    backgroundColor: '#3B5563'
                  }}>
                    <CardHeader>
                      <CardTitle className="text-white">Lista de Investimentos</CardTitle>
                      <CardDescription className="text-white/70">
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
                              className="flex items-center justify-between border-b border-white/10 pb-3 last:border-0 hover:bg-white/5 p-3 rounded-lg transition-colors cursor-pointer"
                              onClick={() => handleViewDetails(inv.id)}
                            >
                              <div className="space-y-1 flex-1">
                                <div className="font-medium text-white flex items-center gap-2">
                                  {inv.nome}
                                  <Eye className="h-4 w-4 text-white/50 hover:text-white" />
                                </div>
                                <div className="text-xs text-white/60">
                                  {inv.tipo.replace('_', ' ')} • Aplicado: R$ {inv.valor_aplicado.toLocaleString('pt-BR', {
                                    minimumFractionDigits: 2,
                                  })}
                                </div>
                              </div>
                              <div className="text-right space-y-1">
                                <div className="font-medium text-white">
                                  R$ {inv.valor_atual.toLocaleString('pt-BR', {
                                    minimumFractionDigits: 2,
                                  })}
                                </div>
                                <div
                                  className={`text-xs flex items-center gap-1 justify-end ${
                                    rentabilidade >= 0 ? 'text-green-400' : 'text-red-400'
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
        <DialogContent className="sm:max-w-[700px] bg-[#3B5563] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Novo Investimento</DialogTitle>
            <DialogDescription className="text-white/70">
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
