'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { contaService } from '@/lib/services/conta.service'
import { orcamentoService } from '@/lib/services/orcamento.service'
import { cartaoService } from '@/lib/services/cartao.service'
import { transacaoService } from '@/lib/services/transacao.service'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  CreditCard,
  PieChart,
  DollarSign,
  AlertTriangle,
} from 'lucide-react'

interface FinancialSummaryData {
  // Contas
  totalBalance: number
  activeAccountsCount: number

  // Mês atual
  monthlyIncome: number
  monthlyExpenses: number
  monthlyResult: number

  // Orçamentos
  budgetTotal: number
  budgetUsed: number
  budgetRemaining: number
  budgetPercentage: number
  budgetsAtRisk: number

  // Cartões
  totalCreditLimit: number
  totalCreditUsed: number
  creditAvailable: number
  creditPercentage: number
  cardsAtRisk: number
}

export function FinancialSummary() {
  const [data, setData] = useState<FinancialSummaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const mesReferencia = format(new Date(), 'yyyy-MM')

  useEffect(() => {
    loadFinancialData()
  }, [])

  const loadFinancialData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Carregar dados em paralelo
      const [contas, transacoes, orcamentos, cartoes] = await Promise.all([
        contaService.listContas(),
        // Busca apenas transações do mês atual (reduz IO)
        transacaoService.listTransacoes({
          dataInicio: startOfMonth(new Date()),
          dataFim: endOfMonth(new Date()),
        }),
        orcamentoService.listOrcamentosComProgresso({ mesReferencia }),
        cartaoService.listCartoes({ incluirInativos: false }),
      ])

      // === CONTAS ===
      const totalBalance = contas.reduce((acc, conta) => acc + (conta.saldo_atual || 0), 0)
      const activeAccountsCount = contas.filter(c => c.ativa).length

      // === MÊS ATUAL ===
      // Já buscamos somente o mês atual
      const currentMonthTransactions = transacoes

      const monthlyIncome = currentMonthTransactions
        .filter(t => t.tipo === 'receita')
        .reduce((acc, t) => acc + Math.abs(t.valor), 0)

      const monthlyExpenses = currentMonthTransactions
        .filter(t => t.tipo === 'despesa')
        .reduce((acc, t) => acc + Math.abs(t.valor), 0)

      const monthlyResult = monthlyIncome - monthlyExpenses

      // === ORÇAMENTOS ===
      const budgetTotal = orcamentos.reduce((acc, o) => acc + o.valor_planejado, 0)
      const budgetUsed = orcamentos.reduce((acc, o) => acc + o.valor_realizado, 0)
      const budgetRemaining = budgetTotal - budgetUsed
      const budgetPercentage = budgetTotal > 0 ? (budgetUsed / budgetTotal) * 100 : 0
      const budgetsAtRisk = orcamentos.filter(o => o.status === 'atencao' || o.status === 'excedido').length

      // === CARTÕES ===
      const limites = await Promise.all(
        cartoes.map(cartao => cartaoService.getLimiteDisponivel(cartao.id))
      )

      const totalCreditLimit = limites.reduce((acc, l) => acc + l.limite_total, 0)
      const totalCreditUsed = limites.reduce((acc, l) => acc + l.limite_usado, 0)
      const creditAvailable = totalCreditLimit - totalCreditUsed
      const creditPercentage = totalCreditLimit > 0 ? (totalCreditUsed / totalCreditLimit) * 100 : 0
      const cardsAtRisk = limites.filter(l => l.percentual_usado >= 70).length

      setData({
        totalBalance,
        activeAccountsCount,
        monthlyIncome,
        monthlyExpenses,
        monthlyResult,
        budgetTotal,
        budgetUsed,
        budgetRemaining,
        budgetPercentage,
        budgetsAtRisk,
        totalCreditLimit,
        totalCreditUsed,
        creditAvailable,
        creditPercentage,
        cardsAtRisk,
      })
    } catch (error) {
      console.error('Erro ao carregar resumo financeiro:', error)
      setError('Não foi possível carregar o resumo financeiro')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} style={{ backgroundColor: 'rgb(15, 23, 42)', borderColor: 'rgb(30, 41, 59)' }}>
            <CardHeader className="pb-3">
              <Skeleton className="h-4 w-24 bg-white/10" />
              <Skeleton className="h-8 w-32 bg-white/10 mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-3 w-40 bg-white/10" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error || !data) {
    return (
      <Card style={{ backgroundColor: 'rgb(15, 23, 42)', borderColor: 'rgb(30, 41, 59)' }}>
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            Erro ao Carregar Resumo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-white/70">{error || 'Ocorreu um erro desconhecido'}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total em Contas */}
      <Card style={{ backgroundColor: 'rgb(15, 23, 42)', borderColor: 'rgb(30, 41, 59)' }}>
        <CardHeader className="pb-3">
          <CardDescription className="text-white/70 flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Saldo Total
          </CardDescription>
          <CardTitle className="text-3xl text-white">{formatCurrency(data.totalBalance)}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-white/70">
            {data.activeAccountsCount} {data.activeAccountsCount === 1 ? 'conta ativa' : 'contas ativas'}
          </p>
        </CardContent>
      </Card>

      {/* Resultado Mensal */}
      <Card style={{ backgroundColor: 'rgb(15, 23, 42)', borderColor: 'rgb(30, 41, 59)' }}>
        <CardHeader className="pb-3">
          <CardDescription className="text-white/70 flex items-center gap-2">
            {data.monthlyResult >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-400" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-400" />
            )}
            Resultado do Mês
          </CardDescription>
          <CardTitle
            className={`text-3xl ${data.monthlyResult >= 0 ? 'text-green-400' : 'text-red-400'}`}
          >
            {formatCurrency(data.monthlyResult)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-white/70">
            Receitas: {formatCurrency(data.monthlyIncome)} • Despesas: {formatCurrency(data.monthlyExpenses)}
          </p>
        </CardContent>
      </Card>

      {/* Orçamentos */}
      <Card style={{ backgroundColor: 'rgb(15, 23, 42)', borderColor: 'rgb(30, 41, 59)' }}>
        <CardHeader className="pb-3">
          <CardDescription className="text-white/70 flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            Orçamentos
          </CardDescription>
          <CardTitle className="text-3xl text-amber-400">
            {formatCurrency(data.budgetRemaining)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <p className="text-xs text-white/70">
              {data.budgetPercentage.toFixed(1)}% usado ({formatCurrency(data.budgetUsed)} de {formatCurrency(data.budgetTotal)})
            </p>
            {data.budgetsAtRisk > 0 && (
              <p className="text-xs text-amber-400 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {data.budgetsAtRisk} {data.budgetsAtRisk === 1 ? 'orçamento' : 'orçamentos'} em risco
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Limite de Crédito */}
      <Card style={{ backgroundColor: 'rgb(15, 23, 42)', borderColor: 'rgb(30, 41, 59)' }}>
        <CardHeader className="pb-3">
          <CardDescription className="text-white/70 flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Limite de Crédito
          </CardDescription>
          <CardTitle className="text-3xl text-blue-400">
            {formatCurrency(data.creditAvailable)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <p className="text-xs text-white/70">
              {data.creditPercentage.toFixed(1)}% usado ({formatCurrency(data.totalCreditUsed)} de {formatCurrency(data.totalCreditLimit)})
            </p>
            {data.cardsAtRisk > 0 && (
              <p className="text-xs text-yellow-400 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {data.cardsAtRisk} {data.cardsAtRisk === 1 ? 'cartão' : 'cartões'} com limite alto
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ✅ Default export para dynamic import
export default FinancialSummary
