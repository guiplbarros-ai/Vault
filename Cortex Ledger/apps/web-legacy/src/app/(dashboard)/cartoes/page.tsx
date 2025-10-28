'use client'

import { useState } from 'react'
import {
  CreditCard, Plus, AlertTriangle, TrendingUp, Calendar,
  DollarSign, Bell, BarChart3, Clock, CheckCircle, XCircle, Wallet, Loader2
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardBody } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { useCreditCards } from '@/lib/hooks/use-credit-cards'
import { useInvoices } from '@/lib/hooks/use-invoices'
import { useInstallments } from '@/lib/hooks/use-installments'
import { useCreditCardSummary } from '@/lib/hooks/use-credit-card-summary'
import { AddCardDialog } from '@/components/credit-cards/add-card-dialog'

export default function CartoesPage() {
  const [selectedCard, setSelectedCard] = useState<string | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  // Buscar dados reais do Supabase
  const { data: resumo, isLoading: isLoadingSummary } = useCreditCardSummary()
  const { data: cartoes, isLoading: isLoadingCards } = useCreditCards()
  const { data: faturas, isLoading: isLoadingInvoices } = useInvoices()
  const { data: parcelamentos, isLoading: isLoadingInstallments } = useInstallments()

  const isLoading = isLoadingSummary || isLoadingCards || isLoadingInvoices || isLoadingInstallments

  // Mock de alertas (implementação futura)
  const alertas = [
    {
      id: '1',
      tipo: 'limite',
      cartaoNome: 'Cartão',
      mensagem: 'Sistema de alertas será implementado em breve',
      severidade: 'info',
      data: new Date().toISOString()
    }
  ]

  const getStatusColor = (utilizacao: number) => {
    if (utilizacao < 50) return 'text-success-600'
    if (utilizacao < 80) return 'text-warning-600'
    return 'text-error-600'
  }

  const getUtilizacaoColor = (utilizacao: number) => {
    if (utilizacao < 50) return 'bg-success-600'
    if (utilizacao < 80) return 'bg-warning-600'
    return 'bg-error-600'
  }

  const getFaturaStatusBadge = (status: string) => {
    switch (status) {
      case 'aberta':
        return <Badge variant="warning">Aberta</Badge>
      case 'futura':
        return <Badge variant="neutral">Futura</Badge>
      case 'paga':
        return <Badge variant="success">Paga</Badge>
      case 'vencida':
        return <Badge variant="error">Vencida</Badge>
      default:
        return <Badge variant="neutral">{status}</Badge>
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600 mx-auto mb-4" />
          <p className="text-sm text-slate-600 dark:text-graphite-300">
            Carregando informações dos cartões...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-graphite-100">
            Cartões de Crédito
          </h1>
          <p className="text-slate-600 dark:text-graphite-300 mt-1">
            Gerencie faturas, parcelamentos, limites e alertas
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Cartão
        </Button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card hover>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-graphite-300">Total em Aberto</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-graphite-100 mt-1">
                  R$ {(resumo?.total_aberto || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-slate-500 dark:text-graphite-400 mt-1">
                  {cartoes?.length || 0} cartões ativos
                </p>
              </div>
              <div className="p-3 bg-error-100 dark:bg-error-900/20 rounded-xl">
                <CreditCard className="h-6 w-6 text-error-600" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card hover>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-graphite-300">Próximo Vencimento</p>
                {resumo?.proximo_vencimento ? (
                  <>
                    <p className="text-2xl font-bold text-slate-900 dark:text-graphite-100 mt-1">
                      R$ {resumo.proximo_vencimento.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-graphite-400 mt-1">
                      {new Date(resumo.proximo_vencimento.data).toLocaleDateString('pt-BR')} - {resumo.proximo_vencimento.cartao}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-slate-900 dark:text-graphite-100 mt-1">-</p>
                    <p className="text-xs text-slate-500 dark:text-graphite-400 mt-1">Nenhuma fatura aberta</p>
                  </>
                )}
              </div>
              <div className="p-3 bg-warning-100 dark:bg-warning-900/20 rounded-xl">
                <AlertTriangle className="h-6 w-6 text-warning-600" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card hover>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-graphite-300">Limite Disponível</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-graphite-100 mt-1">
                  R$ {(resumo?.limite_disponivel || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-slate-500 dark:text-graphite-400 mt-1">
                  {resumo?.utilizacao_media || 0}% de utilização média
                </p>
              </div>
              <div className="p-3 bg-success-100 dark:bg-success-900/20 rounded-xl">
                <TrendingUp className="h-6 w-6 text-success-600" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card hover>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-graphite-300">Parcelamentos</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-graphite-100 mt-1">
                  {resumo?.parcelamentos_ativos || 0}
                </p>
                <p className="text-xs text-slate-500 dark:text-graphite-400 mt-1">
                  {resumo?.alertas_pendentes || 0} alertas pendentes
                </p>
              </div>
              <div className="p-3 bg-info-100 dark:bg-info-900/20 rounded-xl">
                <Clock className="h-6 w-6 text-info-600" />
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Lista de Cartões */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-graphite-100 mb-4">
          Meus Cartões
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cartoes && cartoes.length > 0 ? (
            cartoes.map((cartao) => {
              const hoje = new Date()
              const mesAtual = hoje.getMonth()
              const anoAtual = hoje.getFullYear()
              const dataFechamento = new Date(anoAtual, mesAtual, cartao.fechamento_dia)
              const dataVencimento = new Date(anoAtual, mesAtual, cartao.vencimento_dia)

              return (
                <Card
                  key={cartao.id}
                  hover
                  className="cursor-pointer"
                  onClick={() => setSelectedCard(cartao.id)}
                >
                  <CardBody>
                    {/* Card Header with Gradient */}
                    <div className={`bg-gradient-to-br ${cartao.cor} rounded-lg p-4 mb-4 text-white`}>
                      <div className="flex items-start justify-between mb-8">
                        <div>
                          <p className="text-xs opacity-80 mb-1">Cartão de Crédito</p>
                          <p className="font-semibold text-lg">{cartao.nome}</p>
                        </div>
                        <CreditCard className="h-6 w-6 opacity-80" />
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-lg font-mono tracking-wider">**** {cartao.ultimos_digitos}</p>
                        <p className="text-xs opacity-80 uppercase">{cartao.bandeira}</p>
                      </div>
                    </div>

                    {/* Fatura Atual */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-600 dark:text-graphite-300">Fatura Atual</span>
                        <span className="text-lg font-bold text-slate-900 dark:text-graphite-100">
                          R$ {cartao.fatura_atual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-graphite-400">
                        <span>Fecha: {dataFechamento.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
                        <span>Vence: {dataVencimento.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
                      </div>
                    </div>

                    {/* Limite */}
                    <div>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-slate-600 dark:text-graphite-300">Limite</span>
                        <span className={`font-semibold ${getStatusColor(cartao.utilizacao)}`}>
                          {cartao.utilizacao}% usado
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-graphite-700 rounded-full h-2 mb-1">
                        <div
                          className={`${getUtilizacaoColor(cartao.utilizacao)} h-2 rounded-full transition-all`}
                          style={{ width: `${cartao.utilizacao}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-graphite-400">
                        <span>R$ {cartao.limite_disponivel.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} disponível</span>
                        <span>R$ {cartao.limite_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              )
            })
          ) : (
            <div className="col-span-full text-center py-12">
              <CreditCard className="h-12 w-12 mx-auto text-slate-400 dark:text-graphite-500 mb-4" />
              <p className="text-sm text-slate-600 dark:text-graphite-300 mb-2">
                Nenhum cartão cadastrado
              </p>
              <p className="text-xs text-slate-500 dark:text-graphite-400">
                Adicione seu primeiro cartão para começar
              </p>
            </div>
          )}

          {/* Card para adicionar novo cartão */}
          <Card
            className="border-2 border-dashed border-slate-300 dark:border-graphite-600 hover:border-brand-600 dark:hover:border-brand-600 transition-colors cursor-pointer"
            onClick={() => setIsAddDialogOpen(true)}
          >
            <CardBody className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 bg-slate-100 dark:bg-graphite-700 rounded-full mb-4">
                <Plus className="h-8 w-8 text-slate-600 dark:text-graphite-300" />
              </div>
              <h3 className="font-medium text-slate-900 dark:text-graphite-100 mb-1">
                Adicionar Cartão
              </h3>
              <p className="text-sm text-slate-600 dark:text-graphite-300">
                Configure um novo cartão de crédito
              </p>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Tabs com funcionalidades */}
      <Tabs defaultValue="faturas" className="space-y-4">
        <TabsList>
          <TabsTrigger value="faturas">
            <Calendar className="h-4 w-4 mr-2" />
            Faturas
          </TabsTrigger>
          <TabsTrigger value="parcelamentos">
            <Clock className="h-4 w-4 mr-2" />
            Parcelamentos
          </TabsTrigger>
          <TabsTrigger value="limites">
            <Bell className="h-4 w-4 mr-2" />
            Limites & Alertas
          </TabsTrigger>
          <TabsTrigger value="analise">
            <BarChart3 className="h-4 w-4 mr-2" />
            Análise
          </TabsTrigger>
        </TabsList>

        {/* Tab: Faturas */}
        <TabsContent value="faturas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gerenciar Faturas</CardTitle>
              <CardDescription>
                Visualize faturas abertas, futuras e histórico de pagamentos
              </CardDescription>
            </CardHeader>
            <CardBody>
              <div className="space-y-3">
                {faturas && faturas.length > 0 ? (
                  faturas.map((fatura) => (
                    <div
                      key={fatura.id}
                      className="flex items-center justify-between p-4 border border-slate-200 dark:border-graphite-700 rounded-xl hover:bg-slate-50 dark:hover:bg-graphite-800 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-slate-100 dark:bg-graphite-700 rounded-lg">
                          <Wallet className="h-5 w-5 text-slate-600 dark:text-graphite-300" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-slate-900 dark:text-graphite-100">
                              {fatura.cartao_nome}
                            </p>
                            {getFaturaStatusBadge(fatura.status)}
                          </div>
                          <p className="text-sm text-slate-600 dark:text-graphite-300">
                            {fatura.mes} • {fatura.transacoes} transações
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-slate-900 dark:text-graphite-100">
                          R$ {fatura.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-graphite-300">
                          Vence: {new Date(fatura.vencimento).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        </p>
                        {fatura.status === 'paga' && fatura.data_pagamento && (
                          <p className="text-xs text-success-600">
                            Pago em {new Date(fatura.data_pagamento).toLocaleDateString('pt-BR')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 mx-auto text-slate-400 dark:text-graphite-500 mb-4" />
                    <p className="text-sm text-slate-600 dark:text-graphite-300">
                      Nenhuma fatura encontrada
                    </p>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        </TabsContent>

        {/* Tab: Parcelamentos */}
        <TabsContent value="parcelamentos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compras Parceladas</CardTitle>
              <CardDescription>
                Acompanhe parcelas pagas e futuras de suas compras
              </CardDescription>
            </CardHeader>
            <CardBody>
              <div className="space-y-3">
                {parcelamentos && parcelamentos.length > 0 ? (
                  parcelamentos.map((parc) => (
                    <div
                      key={parc.id}
                      className="p-4 border border-slate-200 dark:border-graphite-700 rounded-xl"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-medium text-slate-900 dark:text-graphite-100 mb-1">
                            {parc.descricao}
                          </p>
                          <p className="text-sm text-slate-600 dark:text-graphite-300">
                            {parc.cartao_nome} • Compra em {new Date(parc.data_compra).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-slate-900 dark:text-graphite-100">
                            R$ {parc.valor_parcela.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-graphite-300">por mês</p>
                        </div>
                      </div>

                      {/* Progress */}
                      <div>
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-slate-600 dark:text-graphite-300">
                            {parc.parcelas_pagas} de {parc.parcelas} parcelas pagas
                          </span>
                          <span className="font-medium text-slate-900 dark:text-graphite-100">
                            {Math.round((parc.parcelas_pagas / parc.parcelas) * 100)}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-graphite-700 rounded-full h-2 mb-2">
                          <div
                            className="bg-brand-600 h-2 rounded-full transition-all"
                            style={{ width: `${(parc.parcelas_pagas / parc.parcelas) * 100}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-graphite-400">
                          <span>Restam {parc.parcelas_restantes} parcelas</span>
                          <span>Total: R$ {parc.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 mx-auto text-slate-400 dark:text-graphite-500 mb-4" />
                    <p className="text-sm text-slate-600 dark:text-graphite-300">
                      Nenhum parcelamento ativo
                    </p>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        </TabsContent>

        {/* Tab: Limites & Alertas */}
        <TabsContent value="limites" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Alertas Ativos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Alertas Ativos
                </CardTitle>
              </CardHeader>
              <CardBody>
                <div className="space-y-3">
                  {alertas.map((alerta) => (
                    <div
                      key={alerta.id}
                      className={`p-3 rounded-lg border ${
                        alerta.severidade === 'warning'
                          ? 'bg-warning-50 dark:bg-warning-900/10 border-warning-200 dark:border-warning-800'
                          : 'bg-info-50 dark:bg-info-900/10 border-info-200 dark:border-info-800'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <AlertTriangle className={`h-5 w-5 flex-shrink-0 ${
                          alerta.severidade === 'warning' ? 'text-warning-600' : 'text-info-600'
                        }`} />
                        <div className="flex-1">
                          <p className="font-medium text-sm text-slate-900 dark:text-graphite-100 mb-1">
                            {alerta.cartaoNome}
                          </p>
                          <p className="text-sm text-slate-700 dark:text-graphite-200">
                            {alerta.mensagem}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>

            {/* Configuração de Limites */}
            <Card>
              <CardHeader>
                <CardTitle>Configurar Alertas</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="space-y-4">
                  <div className="p-4 border border-slate-200 dark:border-graphite-700 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-900 dark:text-graphite-100">
                        Alerta de Limite
                      </span>
                      <Badge variant="success">Ativo</Badge>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-graphite-300 mb-3">
                      Notificar quando atingir 60% do limite
                    </p>
                    <Button variant="outline" size="sm" className="w-full">
                      Configurar
                    </Button>
                  </div>

                  <div className="p-4 border border-slate-200 dark:border-graphite-700 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-900 dark:text-graphite-100">
                        Alerta de Vencimento
                      </span>
                      <Badge variant="success">Ativo</Badge>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-graphite-300 mb-3">
                      Notificar 7 dias antes do vencimento
                    </p>
                    <Button variant="outline" size="sm" className="w-full">
                      Configurar
                    </Button>
                  </div>

                  <div className="p-4 border border-slate-200 dark:border-graphite-700 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-900 dark:text-graphite-100">
                        Transações Suspeitas
                      </span>
                      <Badge variant="neutral">Inativo</Badge>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-graphite-300 mb-3">
                      Notificar transações acima de R$ 500
                    </p>
                    <Button variant="outline" size="sm" className="w-full">
                      Ativar
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Análise */}
        <TabsContent value="analise" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Análise de Gastos</CardTitle>
              <CardDescription>
                Entenda seus padrões de consumo nos cartões
              </CardDescription>
            </CardHeader>
            <CardBody>
              <div className="text-center py-12">
                <BarChart3 className="h-12 w-12 mx-auto text-slate-400 dark:text-graphite-500 mb-4" />
                <p className="text-sm text-slate-600 dark:text-graphite-300 mb-2">
                  Análise disponível após registrar mais transações
                </p>
                <p className="text-xs text-slate-500 dark:text-graphite-400">
                  Gráficos de gastos por categoria, tendências mensais e insights personalizados
                </p>
              </div>
            </CardBody>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Card Dialog */}
      <AddCardDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
      />
    </div>
  )
}
