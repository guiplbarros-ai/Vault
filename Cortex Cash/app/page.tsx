'use client';

import { useState, useEffect, useMemo, Suspense } from 'react'
import dynamic from 'next/dynamic'
import { useSettings, useLocalizationSettings } from '@/app/providers/settings-provider'
import { DashboardLayout } from "@/components/dashboard-layout"
import { PageHeader } from "@/components/ui/page-header"
import { StatCard } from "@/components/ui/stat-card"
import { MonthPicker } from "@/components/ui/month-picker"
import { transacaoService } from '@/lib/services/transacao.service'
import { contaService } from '@/lib/services/conta.service'
import { startOfMonth, endOfMonth } from 'date-fns'
import type { Transacao, Conta } from '@/lib/types'
import { Wallet, TrendingUp, TrendingDown, PiggyBank, Loader2, Database } from 'lucide-react'
import { THEME_COLORS } from '@/lib/constants/colors'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'

// ✅ Lazy load heavy Recharts components com default exports
const CashFlowChart = dynamic(() => import('@/components/cash-flow-chart'), {
  loading: () => <ChartSkeleton />,
  ssr: false
})
const ExpenseDistributionChart = dynamic(() => import('@/components/expense-distribution-chart'), {
  loading: () => <ChartSkeleton />,
  ssr: false
})
const ExpenseTrendsChart = dynamic(() => import('@/components/expense-trends-chart'), {
  loading: () => <ChartSkeleton />,
  ssr: false
})
const IncomeTrendsChart = dynamic(() => import('@/components/income-trends-chart'), {
  loading: () => <ChartSkeleton />,
  ssr: false
})
const WealthEvolutionChart = dynamic(() => import('@/components/wealth-evolution-chart'), {
  loading: () => <ChartSkeleton />,
  ssr: false
})

// ✅ Lazy load other heavy components
const RecentTransactions = dynamic(() => import('@/components/recent-transactions'), {
  loading: () => <ChartSkeleton />,
  ssr: false
})

// Lightweight components (não precisa lazy load)
import { PopularTagsWidget } from "@/components/popular-tags-widget"
import { PopularCategoriesWidget } from "@/components/popular-categories-widget"

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
}

export default function DashboardPage() {
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [stats, setStats] = useState<DashboardStats>({
    totalBalance: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    monthlyResult: 0,
  })
  const [loading, setLoading] = useState(true)
  const [hasData, setHasData] = useState(false)
  const [populatingDemo, setPopulatingDemo] = useState(false)
  const { getSetting } = useSettings()
  const { formatCurrency } = useLocalizationSettings()
  const theme = getSetting<'light' | 'dark' | 'auto'>('appearance.theme')

  useEffect(() => {
    let mounted = true

    const loadDashboardData = async () => {
      try {
        setLoading(true)

        // Define intervalo do mês selecionado ANTES de buscar para reduzir IO
        const monthStart = startOfMonth(selectedMonth)
        const monthEnd = endOfMonth(selectedMonth)

        // Carrega contas e apenas transações do mês atual (via índice)
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
          .filter(t => t.tipo === 'receita')
          .reduce((acc, t) => {
            const valor = Number(t.valor) || 0
            return acc + valor
          }, 0)

        // Despesas (apenas tipo 'despesa' — aportes não impactam resultado)
        const monthlyExpenses = currentMonthTransactions
          .filter(t => t.tipo === 'despesa')
          .reduce((acc, t) => {
            const valor = Number(t.valor) || 0
            return acc + Math.abs(valor)
          }, 0)

        // Calcula resultado do mês (receitas - despesas)
        // Positivo = Saving, Negativo = Queima de caixa
        const monthlyResult = monthlyIncome - monthlyExpenses

        if (mounted) {
          setStats({
            totalBalance,
            monthlyIncome,
            monthlyExpenses,
            monthlyResult,
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
  }, [selectedMonth])

  // Função para popular dados de demo
  const handlePopulateDemo = async () => {
    setPopulatingDemo(true)
    try {
      const { seedDemoData } = await import('@/lib/db/seed-demo')
      await seedDemoData()

      toast.success('Dados demo carregados!', {
        description: 'Seu dashboard está pronto para explorar.',
      })

      // Recarregar dados
      await new Promise(resolve => setTimeout(resolve, 500))
      window.location.reload()
    } catch (error) {
      console.error('Erro ao popular dados demo:', error)
      toast.error('Erro ao carregar dados demo', {
        description: 'Tente novamente mais tarde.',
      })
    } finally {
      setPopulatingDemo(false)
    }
  }

  // Detecta se está em dark mode (reativo a mudanças de tema)
  const isDark = useMemo(() => {
    if (typeof window === 'undefined') return false
    if (theme === 'dark') return true
    if (theme === 'light') return false
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }, [theme])

  // ✅ Memoizar statsCards para evitar recriação a cada render
  // Cores baseadas em TEMA.md: superfícies sólidas sem translucência
  const statsCards = useMemo(() => [
    {
      title: "Saldo Total",
      value: loading ? "Carregando..." : formatCurrency(stats.totalBalance),
      icon: Wallet,
      iconColor: THEME_COLORS.money,
      iconBgColor: THEME_COLORS.bgCard2,       // Superfície aninhada sólida
      titleColor: THEME_COLORS.fgSecondary,
      valueClassName: 'text-gold',
      cardBgColor: THEME_COLORS.bgCard,        // Superfície sólida
      bottomBarColor: THEME_COLORS.divider,
    },
    {
      title: "Receitas do Mês",
      value: loading ? "Carregando..." : formatCurrency(stats.monthlyIncome),
      icon: TrendingUp,
      iconColor: THEME_COLORS.success,
      iconBgColor: THEME_COLORS.bgCard2,
      titleColor: THEME_COLORS.fgSecondary,
      valueClassName: 'text-success',
      cardBgColor: THEME_COLORS.bgCard,
      bottomBarColor: THEME_COLORS.divider,
    },
    {
      title: "Despesas do Mês",
      value: loading ? "Carregando..." : formatCurrency(stats.monthlyExpenses),
      icon: TrendingDown,
      iconColor: THEME_COLORS.error,
      iconBgColor: THEME_COLORS.bgCard2,
      titleColor: THEME_COLORS.fgSecondary,
      valueClassName: 'text-destructive',
      cardBgColor: THEME_COLORS.bgCard,
      bottomBarColor: THEME_COLORS.divider,
    },
    {
      title: "Resultado",
      value: loading ? "Carregando..." : formatCurrency(stats.monthlyResult),
      description: stats.monthlyResult > 0 ? "Saving" : stats.monthlyResult < 0 ? "Queima de caixa" : "Neutro",
      icon: PiggyBank,
      iconColor: stats.monthlyResult >= 0 ? THEME_COLORS.success : THEME_COLORS.error,
      iconBgColor: THEME_COLORS.bgCard2,
      titleColor: THEME_COLORS.fgSecondary,
      valueColor: stats.monthlyResult >= 0 ? THEME_COLORS.success : THEME_COLORS.error,
      cardBgColor: THEME_COLORS.bgCard,
      bottomBarColor: stats.monthlyResult >= 0 ? THEME_COLORS.success : THEME_COLORS.error,
    },
  ], [stats, loading, formatCurrency])

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <PageHeader
            title="Dashboard"
            description="Visão geral consolidada das suas finanças"
          />
          <div className="flex items-center gap-3">
            {!hasData && (
              <Button
                onClick={handlePopulateDemo}
                disabled={populatingDemo}
                size="sm"
                style={{
                  backgroundColor: 'hsl(var(--primary))',
                  color: '#F7FAF9',
                }}
              >
                {populatingDemo ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Carregando...
                  </>
                ) : (
                  <>
                    <Database className="mr-2 h-4 w-4" />
                    Popular Demo
                  </>
                )}
              </Button>
            )}
            <MonthPicker
              value={selectedMonth}
              onChange={setSelectedMonth}
              className="sm:ml-auto"
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
              <div className="rounded-lg p-4 mb-6" style={{ backgroundColor: 'hsl(var(--bg-card-2))' }}>
                <Database className="h-12 w-12 text-foreground" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2">Nenhum dado encontrado</h3>
              <p className="text-secondary text-center mb-6 max-w-md">
                Para ver os gráficos e análises do dashboard, você precisa adicionar contas e transações.
              </p>
              <div className="flex flex-col gap-3">
                <Button
                  onClick={handlePopulateDemo}
                  disabled={populatingDemo}
                  size="lg"
                  style={{
                    backgroundColor: 'hsl(var(--primary))',
                    color: '#F7FAF9',
                    borderRadius: '8px',
                  }}
                >
                  {populatingDemo ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Carregando dados...
                    </>
                  ) : (
                    <>
                      <Database className="mr-2 h-5 w-5" />
                      Popular com Dados Demo
                    </>
                  )}
                </Button>
                <p className="text-xs text-secondary text-center mt-2">
                  ou crie sua primeira conta em Contas
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {!loading && hasData && (
          <>
            {/* Fluxo de Caixa (full width) */}
            <CashFlowChart />

            {/* Evolução de Receitas, Despesas e Distribuição (3 colunas) */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 md:items-stretch">
              <IncomeTrendsChart />
              <ExpenseTrendsChart />
              <ExpenseDistributionChart />
            </div>

            {/* Tags e Categorias (2 colunas) */}
            <div className="grid gap-6 md:grid-cols-2 md:items-stretch">
              <PopularTagsWidget />
              <PopularCategoriesWidget />
            </div>

            {/* Evolução Patrimonial (full width) */}
            <WealthEvolutionChart />

            <RecentTransactions />
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
