'use client';

import { useState, useEffect, useMemo } from 'react'
import { useSettings, useLocalizationSettings } from '@/app/providers/settings-provider'
import { DashboardLayout } from "@/components/dashboard-layout"
import { PageHeader } from "@/components/ui/page-header"
import { StatCard } from "@/components/ui/stat-card"
import { CashFlowChart } from "@/components/cash-flow-chart"
import { RecentTransactions } from "@/components/recent-transactions"
import { BudgetOverview } from "@/components/budget-overview"
import { ExpenseDistributionChart } from "@/components/expense-distribution-chart"
import { ExpenseTrendsChart } from "@/components/expense-trends-chart"
import { IncomeTrendsChart } from "@/components/income-trends-chart"
import { PopularTagsWidget } from "@/components/popular-tags-widget"
import { PopularCategoriesWidget } from "@/components/popular-categories-widget"
import { AccuracyWidget } from "@/components/classification/accuracy-widget"
import { WealthEvolutionChart } from "@/components/wealth-evolution-chart"
import { FinancialSummary } from "@/components/financial-summary"
import { MonthPicker } from "@/components/ui/month-picker"
import { transacaoService } from '@/lib/services/transacao.service'
import { contaService } from '@/lib/services/conta.service'
import { startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns'
import type { Transacao, Conta } from '@/lib/types'
import { Wallet, TrendingUp, TrendingDown, PiggyBank } from 'lucide-react'

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
  const { getSetting } = useSettings()
  const { formatCurrency } = useLocalizationSettings()
  const theme = getSetting<'light' | 'dark' | 'auto'>('appearance.theme')

  useEffect(() => {
    let mounted = true

    const loadDashboardData = async () => {
      try {
        setLoading(true)

        // Carrega todas as contas e transações
        const [contas, transacoes] = await Promise.all([
          contaService.listContas(),
          transacaoService.listTransacoes(),
        ])

        if (!mounted) return

        // Calcula saldo total de todas as contas
        const totalBalance = contas.reduce((acc, conta) => {
          const saldo = Number(conta.saldo_atual) || 0
          return acc + saldo
        }, 0)

        // Filtra transações do mês selecionado
        const monthStart = startOfMonth(selectedMonth)
        const monthEnd = endOfMonth(selectedMonth)

        const currentMonthTransactions = transacoes.filter(t => {
          const transactionDate = t.data instanceof Date ? t.data : new Date(t.data)
          return transactionDate >= monthStart && transactionDate <= monthEnd
        })

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

  // Detecta se está em dark mode (reativo a mudanças de tema)
  const isDark = useMemo(() => {
    if (typeof window === 'undefined') return false
    if (theme === 'dark') return true
    if (theme === 'light') return false
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }, [theme])

  const statsCards = [
    {
      title: "Saldo Total",
      value: loading ? "Carregando..." : formatCurrency(stats.totalBalance),
      icon: Wallet,
      iconColor: isDark ? '#1AD4C4' : '#18B0A4', // Teal primary
      iconBgColor: isDark ? 'rgba(26, 212, 196, 0.15)' : 'rgba(24, 176, 164, 0.15)',
      titleColor: isDark ? '#1AD4C4' : '#18B0A4',
      valueClassName: isDark ? 'text-[#1AD4C4]' : 'text-[#18B0A4]',
      cardBgGradient: isDark
        ? 'linear-gradient(135deg, #3B5563 0%, #334455 100%)'
        : 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
      cardBgColor: isDark ? '#3B5563' : '#FFFFFF',
      bottomBarColor: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.1)',
    },
    {
      title: "Receitas do Mês",
      value: loading ? "Carregando..." : formatCurrency(stats.monthlyIncome),
      icon: TrendingUp,
      iconColor: isDark ? '#4ADE80' : '#22C55E', // Green
      iconBgColor: isDark ? 'rgba(74, 222, 128, 0.15)' : 'rgba(34, 197, 94, 0.15)',
      titleColor: isDark ? '#4ADE80' : '#22C55E',
      valueClassName: isDark ? 'text-[#4ADE80]' : 'text-[#22C55E]',
      cardBgGradient: isDark
        ? 'linear-gradient(135deg, #3B5563 0%, #334455 100%)'
        : 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
      cardBgColor: isDark ? '#3B5563' : '#FFFFFF',
      bottomBarColor: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.1)',
    },
    {
      title: "Despesas do Mês",
      value: loading ? "Carregando..." : formatCurrency(stats.monthlyExpenses),
      icon: TrendingDown,
      iconColor: isDark ? '#FA6B6B' : '#EF4444', // Red
      iconBgColor: isDark ? 'rgba(250, 107, 107, 0.15)' : 'rgba(239, 68, 68, 0.15)',
      titleColor: isDark ? '#FA6B6B' : '#EF4444',
      valueClassName: isDark ? 'text-[#FA6B6B]' : 'text-[#EF4444]',
      cardBgGradient: isDark
        ? 'linear-gradient(135deg, #3B5563 0%, #334455 100%)'
        : 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
      cardBgColor: isDark ? '#3B5563' : '#FFFFFF',
      bottomBarColor: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.1)',
    },
    {
      title: "Resultado",
      value: loading ? "Carregando..." : formatCurrency(stats.monthlyResult),
      description: stats.monthlyResult > 0 ? "Saving" : stats.monthlyResult < 0 ? "Queima de caixa" : "Neutro",
      icon: PiggyBank,
      iconColor: stats.monthlyResult >= 0
        ? (isDark ? '#4ADE80' : '#22C55E') // Verde
        : (isDark ? '#FA6B6B' : '#EF4444'), // Vermelho
      iconBgColor: stats.monthlyResult >= 0
        ? (isDark ? 'rgba(74, 222, 128, 0.15)' : 'rgba(34, 197, 94, 0.15)')
        : (isDark ? 'rgba(250, 107, 107, 0.15)' : 'rgba(239, 68, 68, 0.15)'),
      titleColor: stats.monthlyResult >= 0
        ? (isDark ? '#4ADE80' : '#22C55E')
        : (isDark ? '#FA6B6B' : '#EF4444'),
      valueColor: stats.monthlyResult >= 0
        ? (isDark ? '#4ADE80' : '#22C55E') // Verde para Saving
        : (isDark ? '#FA6B6B' : '#EF4444'), // Vermelho para Queima
      cardBgGradient: isDark
        ? 'linear-gradient(135deg, #3B5563 0%, #334455 100%)'
        : 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
      cardBgColor: isDark ? '#3B5563' : '#FFFFFF',
      bottomBarColor: stats.monthlyResult >= 0
        ? (isDark ? '#4ADE80' : '#22C55E') // Verde para Saving
        : (isDark ? '#FA6B6B' : '#EF4444'), // Vermelho para Queima
    },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <PageHeader
            title="Dashboard"
            description="Visão geral consolidada das suas finanças"
          />
          <MonthPicker
            value={selectedMonth}
            onChange={setSelectedMonth}
            className="sm:ml-auto"
          />
        </div>

        {/* Resumo Financeiro Consolidado */}
        <FinancialSummary />

        {/* Stats Overview Detalhado */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {statsCards.map((stat) => (
            <StatCard key={stat.title} {...stat} />
          ))}
        </div>

        {/* Charts and Recent Data */}
        {!loading && (
          <>
            {/* Fluxo de Caixa e Budget (full width em 2 colunas) */}
            <div className="grid gap-6 md:grid-cols-2 md:items-stretch">
              <CashFlowChart />
              <BudgetOverview />
            </div>

            {/* Evolução de Receitas, Despesas e Distribuição (3 colunas) */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 md:items-stretch">
              <IncomeTrendsChart />
              <ExpenseTrendsChart />
              <ExpenseDistributionChart />
            </div>

            {/* Tags, Categorias e Acurácia de IA (3 colunas) */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 md:items-stretch">
              <PopularTagsWidget />
              <PopularCategoriesWidget />
              <AccuracyWidget />
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
