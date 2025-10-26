'use client'

import { Download, FileSpreadsheet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SaudeFinanceira } from '@/components/dashboard/saude-financeira'
import { DFCChart } from '@/components/dashboard/dfc-chart'
import { BudgetVsActualChart } from '@/components/dashboard/budget-vs-actual-chart'
import { EvolutionChart } from '@/components/dashboard/evolution-chart'
import { TopExpensesCard } from '@/components/dashboard/top-expenses-card'
import { useTransactions } from '@/lib/hooks/use-transacoes'
import { useDFCData } from '@/lib/hooks/use-dfc-data'
import { exportRelatorioCompleto, exportToExcel } from '@/lib/export'
import { format, startOfMonth, endOfMonth } from 'date-fns'

export default function RelatoriosPage() {
  // Buscar dados do mês atual
  const now = new Date()
  const startDate = format(startOfMonth(now), 'yyyy-MM-dd')
  const endDate = format(endOfMonth(now), 'yyyy-MM-dd')

  const { data: transactions } = useTransactions({
    limit: 10000,
    filters: {
      dataInicio: startDate,
      dataFim: endDate,
    },
  })

  const { data: dfcData } = useDFCData(1)

  const handleExportRelatorio = () => {
    if (!transactions?.data || transactions.data.length === 0) {
      alert('Nenhuma transação para exportar neste mês')
      return
    }

    const currentMonth = dfcData?.[0]

    const metrics = {
      totalReceitas: currentMonth?.entradas || 0,
      totalDespesas: currentMonth?.saidas || 0,
      saldo: currentMonth?.saldo || 0,
      periodo: format(now, "MMMM 'de' yyyy"),
    }

    exportRelatorioCompleto(transactions.data, metrics)
  }

  const handleExportExcel = () => {
    if (!transactions?.data || transactions.data.length === 0) {
      alert('Nenhuma transação para exportar neste mês')
      return
    }

    exportToExcel(
      transactions.data,
      `relatorio_${format(now, 'yyyy-MM')}.xls`
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
          <p className="text-neutral-500 mt-1">
            Visualize dashboards e relatórios detalhados
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportRelatorio} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Relatório CSV
          </Button>
          <Button onClick={handleExportExcel} variant="outline">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Excel
          </Button>
        </div>
      </div>

      {/* Saúde Financeira */}
      <SaudeFinanceira />

      {/* DFC e Orçamento */}
      <div className="grid gap-6 md:grid-cols-2">
        <DFCChart />
        <BudgetVsActualChart />
      </div>

      {/* Evolução M/M */}
      <EvolutionChart />

      {/* Top 5 Despesas */}
      <TopExpensesCard />
    </div>
  )
}
