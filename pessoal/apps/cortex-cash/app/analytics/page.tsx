'use client'

import { DashboardLayout } from '@/components/dashboard-layout'
import { PageHeader } from '@/components/ui/page-header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BarChart3, PieChart as PieChartIcon, TrendingUp, Zap } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useState } from 'react'

// Lazy load componentes de analytics
const ExpenseEvolutionChart = dynamic(
  () => import('@/components/analytics/expense-evolution-chart'),
  { loading: () => <ChartSkeleton /> }
)
const TopExpensesWidget = dynamic(() => import('@/components/analytics/top-expenses-widget'), {
  loading: () => <ChartSkeleton />,
})
const TrendAnalysis = dynamic(() => import('@/components/analytics/trend-analysis'), {
  loading: () => <ChartSkeleton />,
})
const SavingRateCard = dynamic(() => import('@/components/analytics/saving-rate-card'), {
  loading: () => <ChartSkeleton />,
})
const SankeyFlowChart = dynamic(() => import('@/components/analytics/sankey-flow-chart'), {
  loading: () => <ChartSkeleton />,
})

function ChartSkeleton() {
  return (
    <div className="h-[400px] w-full rounded-xl border bg-card p-6 flex items-center justify-center animate-pulse">
      <div className="h-8 w-8 rounded-full bg-secondary" />
    </div>
  )
}

export default function AnalyticsPage() {
  const [selectedTab, setSelectedTab] = useState('overview')

  return (
    <DashboardLayout>
      <PageHeader
        title="Análise Financeira"
        description="Visualize tendências, economias e fluxo de caixa de forma detalhada"
      />

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0 h-auto">
          <TabsTrigger
            value="overview"
            className="rounded-none border-b-2 border-transparent px-4 py-2 data-[state=active]:border-primary"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger
            value="expenses"
            className="rounded-none border-b-2 border-transparent px-4 py-2 data-[state=active]:border-primary"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Despesas
          </TabsTrigger>
          <TabsTrigger
            value="trends"
            className="rounded-none border-b-2 border-transparent px-4 py-2 data-[state=active]:border-primary"
          >
            <PieChartIcon className="w-4 h-4 mr-2" />
            Tendências
          </TabsTrigger>
          <TabsTrigger
            value="flow"
            className="rounded-none border-b-2 border-transparent px-4 py-2 data-[state=active]:border-primary"
          >
            <Zap className="w-4 h-4 mr-2" />
            Fluxo
          </TabsTrigger>
        </TabsList>

        {/* Tab: Visão Geral */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SavingRateCard />
            <TopExpensesWidget />
          </div>
        </TabsContent>

        {/* Tab: Despesas */}
        <TabsContent value="expenses" className="space-y-6 mt-6">
          <div className="space-y-6">
            <ExpenseEvolutionChart />
            <TopExpensesWidget />
          </div>
        </TabsContent>

        {/* Tab: Tendências */}
        <TabsContent value="trends" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TrendAnalysis />
            <SavingRateCard />
          </div>
        </TabsContent>

        {/* Tab: Fluxo */}
        <TabsContent value="flow" className="space-y-6 mt-6">
          <SankeyFlowChart />
        </TabsContent>
      </Tabs>

      {/* Seção de Info */}
      <div className="mt-12 p-6 bg-muted rounded-lg border border-border">
        <h3 className="text-lg font-semibold text-foreground mb-2">
          💡 Dicas de Análise Financeira
        </h3>
        <ul className="text-sm text-muted-foreground space-y-2">
          <li>
            • <strong>Evolução de Gastos:</strong> Identifique padrões sazonais e categorias que
            crescem
          </li>
          <li>
            • <strong>Top 10 Despesas:</strong> Foque em reduzir os maiores gastos para melhorar
            poupança
          </li>
          <li>
            • <strong>Tendências:</strong> Compare mês a mês para detectar mudanças no comportamento
          </li>
          <li>
            • <strong>Taxa de Economias:</strong> Mantenha uma meta de 20%+ de economia sobre
            receitas
          </li>
          <li>
            • <strong>Fluxo de Dinheiro:</strong> Visualize onde seu dinheiro vem e para onde vai
          </li>
        </ul>
      </div>
    </DashboardLayout>
  )
}
