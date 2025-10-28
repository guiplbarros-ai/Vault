'use client';

import { useState, useEffect } from 'react'
import { DashboardLayout } from "@/components/dashboard-layout"
import { PageHeader } from "@/components/ui/page-header"
import { StatCard } from "@/components/ui/stat-card"
import { CashFlowChart } from "@/components/cash-flow-chart"
import { RecentTransactions } from "@/components/recent-transactions"
import { BudgetOverview } from "@/components/budget-overview"
import { DBTest } from "@/components/db-test"
import { transacaoService } from '@/lib/services/transacao.service'
import { contaService } from '@/lib/services/conta.service'
import { startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns'
import type { Transacao, Conta } from '@/lib/types'

interface DashboardStats {
  totalBalance: number
  monthlyIncome: number
  monthlyExpenses: number
  creditCards: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalBalance: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    creditCards: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)

      // Carrega todas as contas e transações
      const [contas, transacoes] = await Promise.all([
        contaService.listContas(),
        transacaoService.listTransacoes(),
      ])

      // Calcula saldo total de todas as contas
      const totalBalance = contas.reduce((acc, conta) => acc + conta.saldo_atual, 0)

      // Filtra transações do mês atual
      const now = new Date()
      const monthStart = startOfMonth(now)
      const monthEnd = endOfMonth(now)

      const currentMonthTransactions = transacoes.filter(t => {
        const transactionDate = t.data instanceof Date ? t.data : new Date(t.data)
        return transactionDate >= monthStart && transactionDate <= monthEnd
      })

      // Calcula receitas e despesas do mês
      const monthlyIncome = currentMonthTransactions
        .filter(t => t.tipo === 'receita')
        .reduce((acc, t) => acc + t.valor, 0)

      const monthlyExpenses = currentMonthTransactions
        .filter(t => t.tipo === 'despesa')
        .reduce((acc, t) => acc + Math.abs(t.valor), 0)

      // Calcula total de cartões de crédito (contas tipo 'carteira' com saldo negativo como exemplo)
      const creditCards = contas
        .filter(c => c.saldo_atual < 0)
        .reduce((acc, conta) => acc + Math.abs(conta.saldo_atual), 0)

      setStats({
        totalBalance,
        monthlyIncome,
        monthlyExpenses,
        creditCards,
      })
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error)
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

  const statsCards = [
    {
      title: "Saldo Total",
      value: loading ? "Carregando..." : formatCurrency(stats.totalBalance),
    },
    {
      title: "Receitas do Mês",
      value: loading ? "Carregando..." : formatCurrency(stats.monthlyIncome),
    },
    {
      title: "Despesas do Mês",
      value: loading ? "Carregando..." : formatCurrency(stats.monthlyExpenses),
      valueClassName: "text-destructive",
    },
    {
      title: "Cartões de Crédito",
      value: loading ? "Carregando..." : formatCurrency(stats.creditCards),
      description: stats.creditCards > 0 ? "Saldo devedor" : "Sem débitos",
    },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Dashboard"
          description="Visão geral das suas finanças"
        />

        {/* Database Test */}
        <DBTest />

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statsCards.map((stat) => (
            <StatCard key={stat.title} {...stat} />
          ))}
        </div>

        {/* Charts and Recent Data */}
        <div className="grid gap-6 md:grid-cols-2">
          <CashFlowChart />
          <BudgetOverview />
        </div>

        {/* Recent Transactions */}
        <RecentTransactions />
      </div>
    </DashboardLayout>
  )
}
