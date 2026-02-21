'use client'

import { useLocalizationSettings } from '@/app/providers/settings-provider'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  type ResumoBensDireitos,
  type ResumoDeducoes,
  type ResumoRendimentos,
  getImpostoRendaService,
} from '@/lib/services/imposto-renda.service'
import {
  Banknote,
  Building2,
  FileText,
  Heart,
  Landmark,
  Loader2,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { useEffect, useState } from 'react'

const ANO_CALENDARIO = 2025

export default function TaxPage() {
  const [loading, setLoading] = useState(true)
  const [rendimentos, setRendimentos] = useState<ResumoRendimentos | null>(null)
  const [deducoes, setDeducoes] = useState<ResumoDeducoes | null>(null)
  const [bens, setBens] = useState<ResumoBensDireitos | null>(null)
  const { formatCurrency } = useLocalizationSettings()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const service = getImpostoRendaService()
      const [r, d, b] = await Promise.all([
        service.getRendimentos(ANO_CALENDARIO),
        service.getDeducoes(ANO_CALENDARIO),
        service.getBensDireitos(ANO_CALENDARIO),
      ])
      setRendimentos(r)
      setDeducoes(d)
      setBens(b)
    } catch (error) {
      console.error('Erro ao carregar dados de IR:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" />
            <p className="text-muted-foreground">Carregando dados do IR...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Imposto de Renda"
          description={`Dados automáticos do ano-calendário ${ANO_CALENDARIO} para sua declaração IRPF ${ANO_CALENDARIO + 1}`}
        />

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card
            className="border"
            style={{
              borderRadius: '18px',
              boxShadow: '0 1px 0 rgba(0,0,0,.35)',
            }}
          >
            <CardHeader className="pb-3">
              <CardDescription className="text-muted-foreground">
                Total de Rendimentos
              </CardDescription>
              <CardTitle className="text-3xl text-success">
                {formatCurrency(rendimentos?.total_rendimentos || 0)}
              </CardTitle>
              <p className="text-xs mt-1 text-muted-foreground">
                {rendimentos?.meses.filter((m) => m.total > 0).length || 0} meses com receita
              </p>
            </CardHeader>
          </Card>

          <Card
            className="border"
            style={{
              borderRadius: '18px',
              boxShadow: '0 1px 0 rgba(0,0,0,.35)',
            }}
          >
            <CardHeader className="pb-3">
              <CardDescription className="text-muted-foreground">
                Total Dedutível
              </CardDescription>
              <CardTitle className="text-3xl text-destructive">
                {formatCurrency(deducoes?.total_dedutivel || 0)}
              </CardTitle>
              <p className="text-xs mt-1 text-muted-foreground">
                {deducoes?.categorias.length || 0} categorias dedutíveis
              </p>
            </CardHeader>
          </Card>

          <Card
            className="border"
            style={{
              borderRadius: '18px',
              boxShadow: '0 1px 0 rgba(0,0,0,.35)',
            }}
          >
            <CardHeader className="pb-3">
              <CardDescription className="text-muted-foreground">
                Bens e Direitos
              </CardDescription>
              <CardTitle className="text-3xl text-gold">
                {formatCurrency(
                  (bens?.total_investimentos || 0) + (bens?.total_contas || 0)
                )}
              </CardTitle>
              <p className="text-xs mt-1 text-muted-foreground">
                {(bens?.investimentos.length || 0) + (bens?.contas_bancarias.length || 0)} itens
                declaráveis
              </p>
            </CardHeader>
          </Card>
        </div>

        {/* Tabs */}
        <Card
          className="border"
          style={{
            borderRadius: '18px',
            boxShadow: '0 1px 0 rgba(0,0,0,.35), 0 6px 12px rgba(0,0,0,.25)',
          }}
        >
          <CardContent className="pt-6">
            <Tabs defaultValue="rendimentos" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3 bg-muted">
                <TabsTrigger value="rendimentos">
                  Rendimentos
                </TabsTrigger>
                <TabsTrigger value="deducoes">
                  Deduções
                </TabsTrigger>
                <TabsTrigger value="bens">
                  Bens e Direitos
                </TabsTrigger>
              </TabsList>

              {/* Tab: Rendimentos */}
              <TabsContent value="rendimentos" className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Banknote className="h-5 w-5 text-success" />
                  <h3 className="text-lg font-semibold">
                    Rendimentos Tributáveis — {ANO_CALENDARIO}
                  </h3>
                </div>

                {/* Monthly breakdown */}
                <div className="rounded-xl p-4 bg-muted border">
                  <div className="space-y-2">
                    {rendimentos?.meses.map((m) => (
                      <div
                        key={m.mes}
                        className="flex items-center justify-between py-2 border-b"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium w-24">
                            {m.mes_label}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {m.transacoes} transações
                          </span>
                        </div>
                        <span
                          className={`font-semibold ${m.total > 0 ? 'text-success' : 'text-muted-foreground'}`}
                        >
                          {formatCurrency(m.total)}
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between pt-3 font-bold">
                      <span>TOTAL</span>
                      <span className="text-success">
                        {formatCurrency(rendimentos?.total_rendimentos || 0)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* By category */}
                {rendimentos && rendimentos.por_categoria.length > 0 && (
                  <div className="rounded-xl p-4 bg-muted border">
                    <h4 className="text-sm font-semibold mb-3 text-muted-foreground">
                      Por Categoria
                    </h4>
                    <div className="space-y-2">
                      {rendimentos.por_categoria.map((cat) => (
                        <div key={cat.nome} className="flex items-center justify-between py-1">
                          <div className="flex items-center gap-2">
                            <span>{cat.icone || '📄'}</span>
                            <span className="text-sm">
                              {cat.nome}
                            </span>
                          </div>
                          <span className="text-sm font-medium">
                            {formatCurrency(cat.total)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Tab: Deduções */}
              <TabsContent value="deducoes" className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Heart className="h-5 w-5 text-destructive" />
                  <h3 className="text-lg font-semibold">
                    Despesas Dedutíveis — {ANO_CALENDARIO}
                  </h3>
                </div>

                {deducoes && deducoes.categorias.length > 0 ? (
                  <div className="space-y-4">
                    {deducoes.categorias.map((cat) => (
                      <div
                        key={cat.nome}
                        className="rounded-xl p-4 bg-muted border"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{cat.icone || '📄'}</span>
                            <div>
                              <h4 className="font-semibold">
                                {cat.nome}
                              </h4>
                              <p className="text-xs text-muted-foreground">
                                {cat.transacoes} transações
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Total Gasto
                            </p>
                            <p className="text-lg font-semibold text-destructive">
                              {formatCurrency(cat.total)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Limite Legal
                            </p>
                            <p className="text-lg font-semibold text-muted-foreground">
                              {cat.limite_legal ? formatCurrency(cat.limite_legal) : 'Sem limite'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Valor Dedutível
                            </p>
                            <p className="text-lg font-semibold text-success">
                              {formatCurrency(cat.valor_dedutivel)}
                            </p>
                          </div>
                        </div>

                        {cat.limite_legal && cat.total > cat.limite_legal && (
                          <p className="text-xs mt-2 text-warning">
                            Excedeu o limite em{' '}
                            {formatCurrency(cat.total - cat.limite_legal)}
                          </p>
                        )}
                      </div>
                    ))}

                    {/* Summary */}
                    <div className="rounded-xl p-4 flex items-center justify-between bg-muted border border-primary">
                      <span className="font-bold">
                        TOTAL DEDUTÍVEL
                      </span>
                      <span className="text-xl font-bold text-success">
                        {formatCurrency(deducoes.total_dedutivel)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      Nenhuma despesa dedutível encontrada em {ANO_CALENDARIO}
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* Tab: Bens e Direitos */}
              <TabsContent value="bens" className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Landmark className="h-5 w-5 text-gold" />
                  <h3 className="text-lg font-semibold">
                    Bens e Direitos — {ANO_CALENDARIO}
                  </h3>
                </div>

                {/* Investments */}
                {bens && bens.investimentos.length > 0 && (
                  <div className="rounded-xl p-4 bg-muted border">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="h-4 w-4 text-success" />
                      <h4 className="text-sm font-semibold text-muted-foreground">
                        Investimentos ({bens.investimentos.length})
                      </h4>
                    </div>

                    <div className="space-y-3">
                      {bens.investimentos.map((inv, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between py-2 border-b"
                        >
                          <div>
                            <p className="text-sm font-medium">
                              {inv.descricao}
                              {inv.ticker && (
                                <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-background text-secondary">
                                  {inv.ticker}
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {inv.instituicao}
                              {inv.valor_aplicado !== undefined &&
                                ` • Aplicado: ${formatCurrency(inv.valor_aplicado)}`}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">
                              {formatCurrency(inv.valor_atual)}
                            </p>
                            {inv.valor_aplicado !== undefined && (
                              <p
                                className={`text-xs ${
                                  inv.valor_atual >= inv.valor_aplicado
                                    ? 'text-success'
                                    : 'text-destructive'
                                }`}
                              >
                                {inv.valor_atual >= inv.valor_aplicado ? '+' : ''}
                                {formatCurrency(inv.valor_atual - inv.valor_aplicado)}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                      <div className="flex items-center justify-between pt-2 font-bold">
                        <span>TOTAL INVESTIMENTOS</span>
                        <span className="text-success">
                          {formatCurrency(bens.total_investimentos)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bank Accounts */}
                {bens && bens.contas_bancarias.length > 0 && (
                  <div className="rounded-xl p-4 bg-muted border">
                    <div className="flex items-center gap-2 mb-3">
                      <Wallet className="h-4 w-4 text-gold" />
                      <h4 className="text-sm font-semibold text-muted-foreground">
                        Contas Bancárias com saldo {`>`} R$ 140 ({bens.contas_bancarias.length})
                      </h4>
                    </div>

                    <div className="space-y-2">
                      {bens.contas_bancarias.map((conta, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between py-2 border-b"
                        >
                          <div className="flex items-center gap-3">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">
                                {conta.descricao}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {conta.instituicao}
                              </p>
                            </div>
                          </div>
                          <span className="font-semibold">
                            {formatCurrency(conta.valor_atual)}
                          </span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between pt-2 font-bold">
                        <span>TOTAL CONTAS</span>
                        <span className="text-gold">
                          {formatCurrency(bens.total_contas)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {bens &&
                  bens.investimentos.length === 0 &&
                  bens.contas_bancarias.length === 0 && (
                    <div className="text-center py-12">
                      <Landmark className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        Nenhum bem ou direito encontrado para {ANO_CALENDARIO}
                      </p>
                    </div>
                  )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
