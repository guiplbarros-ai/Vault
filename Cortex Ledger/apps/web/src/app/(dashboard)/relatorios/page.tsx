'use client'

import { useState, useMemo } from 'react'
import { Download, FileSpreadsheet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TimelineNavigator } from '@/components/relatorios/timeline-navigator'
import { AdditionalFilters, type AdditionalFiltersData } from '@/components/relatorios/additional-filters'
import { ReportSummaryCards } from '@/components/relatorios/report-summary-cards'
import { CategoryBreakdownChart } from '@/components/relatorios/category-breakdown-chart'
import { MonthlyTrendChart } from '@/components/relatorios/monthly-trend-chart'
import { AccountBreakdownTable } from '@/components/relatorios/account-breakdown-table'
import { useTransactions } from '@/lib/hooks/use-transacoes'
import {
  useReportSummary,
  useCategoryBreakdown,
  useMonthlyTrend,
  useAccountBreakdown,
} from '@/lib/hooks/use-report-data'
import { exportRelatorioCompleto, exportToExcel } from '@/lib/export'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'

type TimelineMode = 'month' | '3-months' | '6-months' | '12-months'

export default function RelatoriosPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [mode, setMode] = useState<TimelineMode>('month')
  const [additionalFilters, setAdditionalFilters] = useState<AdditionalFiltersData>({})

  // Calculate date range based on mode
  const dateRange = useMemo(() => {
    const endDate = endOfMonth(currentDate)
    let startDate: Date

    switch (mode) {
      case '3-months':
        startDate = startOfMonth(subMonths(currentDate, 2))
        break
      case '6-months':
        startDate = startOfMonth(subMonths(currentDate, 5))
        break
      case '12-months':
        startDate = startOfMonth(subMonths(currentDate, 11))
        break
      default: // month
        startDate = startOfMonth(currentDate)
    }

    return {
      dataInicio: format(startDate, 'yyyy-MM-dd'),
      dataFim: format(endDate, 'yyyy-MM-dd'),
    }
  }, [currentDate, mode])

  // Combine filters
  const combinedFilters = useMemo(
    () => ({
      ...dateRange,
      ...additionalFilters,
    }),
    [dateRange, additionalFilters]
  )

  // Fetch data with filters
  const { data: summary, isLoading: summaryLoading } = useReportSummary(combinedFilters)
  const { data: categoryBreakdown, isLoading: categoryLoading } =
    useCategoryBreakdown(combinedFilters)
  const { data: monthlyTrend, isLoading: trendLoading } = useMonthlyTrend(combinedFilters)
  const { data: accountBreakdown, isLoading: accountLoading } =
    useAccountBreakdown(combinedFilters)

  const { data: transactions } = useTransactions({
    limit: 10000,
    filters: combinedFilters,
  })

  const handleExportRelatorio = () => {
    if (!transactions?.data || transactions.data.length === 0) {
      alert('Nenhuma transação para exportar no período selecionado')
      return
    }

    const metrics = {
      totalReceitas: summary?.totalReceitas || 0,
      totalDespesas: summary?.totalDespesas || 0,
      saldo: summary?.saldo || 0,
      periodo: `${dateRange.dataInicio} a ${dateRange.dataFim}`,
    }

    exportRelatorioCompleto(transactions.data, metrics)
  }

  const handleExportExcel = () => {
    if (!transactions?.data || transactions.data.length === 0) {
      alert('Nenhuma transação para exportar no período selecionado')
      return
    }

    exportToExcel(
      transactions.data,
      `relatorio_${dateRange.dataInicio}_${dateRange.dataFim}.xls`
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text">Relatórios</h1>
          <p className="mt-1 text-muted">Análise detalhada das suas finanças com filtros avançados</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportRelatorio} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Relatório CSV
          </Button>
          <Button onClick={handleExportExcel} variant="outline">
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Excel
          </Button>
        </div>
      </div>

      {/* Timeline Navigator */}
      <TimelineNavigator
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        mode={mode}
        onModeChange={setMode}
      />

      {/* Additional Filters */}
      <AdditionalFilters
        filters={additionalFilters}
        onFiltersChange={setAdditionalFilters}
      />

      {/* Summary Cards */}
      {summary && <ReportSummaryCards summary={summary} isLoading={summaryLoading} />}

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <CategoryBreakdownChart
          data={categoryBreakdown || []}
          isLoading={categoryLoading}
        />
        <AccountBreakdownTable
          data={accountBreakdown || []}
          isLoading={accountLoading}
        />
      </div>

      {/* Monthly Trend */}
      <MonthlyTrendChart data={monthlyTrend || []} isLoading={trendLoading} />
    </div>
  )
}
