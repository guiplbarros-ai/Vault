'use client'

import { useLocalizationSettings } from '@/app/providers/settings-provider'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { MonthPicker } from '@/components/ui/month-picker'
import { PageHeader } from '@/components/ui/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { contaService } from '@/lib/services/conta.service'
import { transacaoService } from '@/lib/services/transacao.service'
import { endOfMonth, getDaysInMonth, isSameMonth, startOfMonth } from 'date-fns'
import {
  ArrowRight,
  Database,
  Loader2,
  PiggyBank,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import type { DateRange } from 'react-day-picker'

// ✅ Lazy load heavy Recharts components com default exports
const CashFlowChart = dynamic(() => import('@/components/cash-flow-chart'), {
  loading: () => <ChartSkeleton />,
  ssr: false,
})
const ExpenseDistributionChart = dynamic(() => import('@/components/expense-distribution-chart'), {
  loading: () => <ChartSkeleton />,
  ssr: false,
})
const ExpenseTrendsChart = dynamic(() => import('@/components/expense-trends-chart'), {
  loading: () => <ChartSkeleton />,
  ssr: false,
})
const IncomeTrendsChart = dynamic(() => import('@/components/income-trends-chart'), {
  loading: () => <ChartSkeleton />,
  ssr: false,
})
const WealthEvolutionChart = dynamic(() => import('@/components/wealth-evolution-chart'), {
  loading: () => <ChartSkeleton />,
  ssr: false,
})
const FinancialHealthScore = dynamic(() => import('@/components/financial-health-score'), {
  loading: () => <ChartSkeleton />,
  ssr: false,
})

// ✅ Lazy load other heavy components
const RecentTransactions = dynamic(() => import('@/components/recent-transactions'), {
  loading: () => <ChartSkeleton />,
  ssr: false,
})
const FinancialCalendar = dynamic(() => import('@/components/financial-calendar'), {
  loading: () => <ChartSkeleton />,
  ssr: false,
})

import { AccuracyWidget } from '@/components/classification/accuracy-widget'
import { PopularCategoriesWidget } from '@/components/popular-categories-widget'
// Lightweight components (não precisa lazy load)
import { PopularTagsWidget } from '@/components/popular-tags-widget'

// ✅ Skeleton para charts durante carregamento
function ChartSkeleton() {
  return (
    <div className="h-[400px] w-full rounded-xl border bg-card p-6 flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-secondary" />
    </div>
  )
}

interface DashboardStats {
  totalBalance: number
  monthlyIncome: number
  monthlyExpenses: number
  monthlyResult: number
  projectedExpenses: number | null
  projectedResult: number | null
}

export default function DashboardPage() {
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [stats, setStats] = useState<DashboardStats>({
    totalBalance: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    monthlyResult: 0,
    projectedExpenses: null,
    projectedResult: null,
  })
  const [loading, setLoading] = useState(true)
  const [hasData, setHasData] = useState(false)
  const { formatCurrency } = useLocalizationSettings()

  useEffect(() => {
    let mounted = true

    const loadDashboardData = async () => {
      try {
        setLoading(true)

        // Define intervalo baseado no range ou no mês selecionado
        let monthStart: Date
        let monthEnd: Date

        if (dateRange?.from && dateRange?.to) {
          monthStart = dateRange.from
          monthEnd = dateRange.to
        } else {
          monthStart = startOfMonth(selectedMonth)
          monthEnd = endOfMonth(selectedMonth)
        }

        // Carrega contas e apenas transações do período (via índice)
        const [contas, transacoes] = await Promise.all([
          contaService.listContas(),
          transacaoService.listTransacoes({ dataInicio: monthStart, dataFim: monthEnd }),
        ])

        if (!mounted) return

        // Verifica se há dados (se tem contas, considera como tendo dados)
        setHasData(contas.length > 0)

        // Calcula saldo total de todas as contas
        const totalBalance = contas.reduce((acc, conta) => {
          const saldo = Number(conta.saldo_atual) || 0
          return acc + saldo
        }, 0)

        // Já buscamos transações do mês; evita refiltrar aqui
        const currentMonthTransactions = transacoes

        // Calcula receitas e despesas do mês
        const monthlyIncome = currentMonthTransactions
          .filter((t) => t.tipo === 'receita')
          .reduce((acc, t) => {
            const valor = Number(t.valor) || 0
            return acc + valor
          }, 0)

        // Despesas (apenas tipo 'despesa' — aportes não impactam resultado)
        const monthlyExpenses = currentMonthTransactions
          .filter((t) => t.tipo === 'despesa')
          .reduce((acc, t) => {
            const valor = Number(t.valor) || 0
            return acc + Math.abs(valor)
          }, 0)

        // Calcula resultado do mês (receitas - despesas)
        // Positivo = Saving, Negativo = Queima de caixa
        const monthlyResult = monthlyIncome - monthlyExpenses

        // Projeção: se é o mês atual e ainda não acabou, projeta despesas
        let projectedExpenses: number | null = null
        let projectedResult: number | null = null
        const now = new Date()
        const isCurrentMonth = isSameMonth(selectedMonth, now)
        if (isCurrentMonth && monthlyExpenses > 0) {
          const dayOfMonth = now.getDate()
          const totalDays = getDaysInMonth(now)
          if (dayOfMonth < totalDays) {
            const dailyAvg = monthlyExpenses / dayOfMonth
            projectedExpenses = dailyAvg * totalDays
            projectedResult = monthlyIncome - projectedExpenses
          }
        }

        if (mounted) {
          setStats({
            totalBalance,
            monthlyIncome,
            monthlyExpenses,
            monthlyResult,
            projectedExpenses,
            projectedResult,
          })
        }
      } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadDashboardData()

    return () => {
      mounted = false
    }
  }, [selectedMonth, dateRange])

  // Determine result variant based on projected or actual result
  const resultVariant: 'success' | 'error' = useMemo(() => {
    if (stats.projectedResult != null) {
      return stats.projectedResult >= 0 ? 'success' : 'error'
    }
    return stats.monthlyResult >= 0 ? 'success' : 'error'
  }, [stats.projectedResult, stats.monthlyResult])

  function getResultDescription(): string | undefined {
    if (loading) return undefined
    if (stats.projectedResult != null) {
      const label =
        stats.projectedResult > 0 ? 'Saving' : stats.projectedResult < 0 ? 'Queima' : 'Neutro'
      return `Projeção: ${formatCurrency(stats.projectedResult)} (${label})`
    }
    if (stats.monthlyResult > 0) return 'Saving'
    if (stats.monthlyResult < 0) return 'Queima de caixa'
    return 'Neutro'
  }

  const statsCards = useMemo(
    () => [
      {
        title: 'Saldo Total',
        value: loading ? 'Carregando...' : formatCurrency(stats.totalBalance),
        icon: Wallet,
        variant: 'gold' as const,
      },
      {
        title: 'Receitas do Mês',
        value: loading ? 'Carregando...' : formatCurrency(stats.monthlyIncome),
        icon: TrendingUp,
        variant: 'success' as const,
      },
      {
        title: 'Despesas do Mês',
        value: loading ? 'Carregando...' : formatCurrency(stats.monthlyExpenses),
        description:
          !loading && stats.projectedExpenses != null
            ? `Projeção: ~${formatCurrency(stats.projectedExpenses)}`
            : undefined,
        icon: TrendingDown,
        variant: 'error' as const,
      },
      {
        title: 'Resultado',
        value: loading ? 'Carregando...' : formatCurrency(stats.monthlyResult),
        description: getResultDescription(),
        icon: PiggyBank,
        variant: resultVariant,
      },
    ],
    [stats, loading, formatCurrency, resultVariant]
  )

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <PageHeader title="Dashboard" description="Visão geral consolidada das suas finanças" />
          <div className="flex items-center gap-8 sm:ml-auto">
            {/* Analytics Button */}
            {!loading && hasData && (
              <Link href="/analytics" className="h-10">
                <Button variant="outline" className="h-10">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Análise Detalhada
                </Button>
              </Link>
            )}
            <MonthPicker
              value={selectedMonth}
              onChange={setSelectedMonth}
              onRangeChange={setDateRange}
              mode="range"
            />
          </div>
        </div>

        {/* Stats Overview Detalhado */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {statsCards.map((stat) => (
            <StatCard key={stat.title} {...stat} />
          ))}
        </div>

        {/* Charts and Recent Data */}
        {!loading && !hasData && (
          <Card className="glass-card-3d">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="rounded-lg p-4 mb-6 bg-muted">
                <Database className="h-12 w-12 text-foreground" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2">Nenhum dado encontrado</h3>
              <p className="text-secondary text-center mb-6 max-w-md">
                Para ver os gráficos e análises do dashboard, você precisa adicionar contas e
                transações.
              </p>
              <div className="flex flex-col gap-3 items-center">
                <Link href="/admin-settings?tab=demoMode">
                  <Button size="lg">
                    <ShieldCheck className="mr-2 h-5 w-5" />
                    Ir para Admin → Modo Demo
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <p className="text-xs text-secondary text-center">
                  Popular com dados de exemplo ou criar contas manualmente
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {!loading && hasData && (
          <>
            {/* Score de Saúde Financeira */}
            <FinancialHealthScore />

            {/* Fluxo de Caixa (full width) */}
            <CashFlowChart />

            {/* Evolução de Receitas, Despesas e Distribuição (3 colunas) */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 md:items-stretch">
              <IncomeTrendsChart />
              <ExpenseTrendsChart />
              <ExpenseDistributionChart />
            </div>

            {/* Evolução Patrimonial (full width) */}
            <WealthEvolutionChart />

            {/* Calendário Financeiro (full width) */}
            <FinancialCalendar />

            {/* Tags, Categorias e Classificação IA (3 colunas) */}
            <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-3 md:items-stretch">
              <PopularTagsWidget />
              <PopularCategoriesWidget />
              <AccuracyWidget />
            </div>

            {/* Transações Recentes (full width) */}
            <RecentTransactions />
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
