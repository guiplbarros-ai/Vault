'use client'

import { useLocalizationSettings } from '@/app/providers/settings-provider'
import { Card } from '@/components/ui/card'
import { categoriaService } from '@/lib/services/categoria.service'
import { transacaoService } from '@/lib/services/transacao.service'
import { endOfMonth, format, startOfMonth, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Loader2, Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'

interface TrendData {
  categoria: string
  mêsAtual: number
  mêsPassado: number
  variacao: number
  variacaoPercentual: number
  tendencia: 'up' | 'down' | 'stable'
}

export function TrendAnalysis() {
  const [trends, setTrends] = useState<TrendData[]>([])
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState('')
  const [previousMonth, setPreviousMonth] = useState('')
  const { formatCurrency } = useLocalizationSettings()

  useEffect(() => {
    loadTrendData()
  }, [])

  const loadTrendData = async () => {
    try {
      setLoading(true)

      const [transacoes, categorias] = await Promise.all([
        transacaoService.listTransacoes(),
        categoriaService.listCategorias(),
      ])

      // Define períodos
      const now = new Date()
      const currentMonthStart = startOfMonth(now)
      const currentMonthEnd = endOfMonth(now)
      const previousMonthDate = subMonths(now, 1)
      const previousMonthStart = startOfMonth(previousMonthDate)
      const previousMonthEnd = endOfMonth(previousMonthDate)

      setCurrentMonth(format(now, 'MMMM', { locale: ptBR }))
      setPreviousMonth(format(previousMonthDate, 'MMMM', { locale: ptBR }))

      // Agrupa gastos por categoria para cada período
      const currentMonthExpenses: Record<string, number> = {}
      const previousMonthExpenses: Record<string, number> = {}

      transacoes.forEach((t) => {
        if (t.tipo !== 'despesa') return

        const transactionDate = t.data instanceof Date ? t.data : new Date(t.data)
        const valor = Math.abs(Number(t.valor) || 0)

        // Encontra categoria pai
        let categoryId = t.categoria_id || 'sem-categoria'
        if (categoryId !== 'sem-categoria') {
          const categoria = categorias.find((c) => c.id === categoryId)
          if (categoria?.pai_id) {
            categoryId = categoria.pai_id
          }
        }

        const categoryName =
          categoryId === 'sem-categoria'
            ? 'Sem categoria'
            : categorias.find((c) => c.id === categoryId)?.nome || 'Desconhecida'

        if (transactionDate >= currentMonthStart && transactionDate <= currentMonthEnd) {
          currentMonthExpenses[categoryName] = (currentMonthExpenses[categoryName] || 0) + valor
        } else if (transactionDate >= previousMonthStart && transactionDate <= previousMonthEnd) {
          previousMonthExpenses[categoryName] = (previousMonthExpenses[categoryName] || 0) + valor
        }
      })

      // Coleta todas as categorias
      const allCategories = new Set([
        ...Object.keys(currentMonthExpenses),
        ...Object.keys(previousMonthExpenses),
      ])

      // Calcula tendências
      const trendList: TrendData[] = Array.from(allCategories)
        .map((categoria) => {
          const current = currentMonthExpenses[categoria] || 0
          const previous = previousMonthExpenses[categoria] || 0
          const variacao = current - previous
          const variacaoPercentual =
            previous === 0 ? (current > 0 ? 100 : 0) : (variacao / previous) * 100

          let tendencia: 'up' | 'down' | 'stable'
          if (variacaoPercentual > 5) tendencia = 'up'
          else if (variacaoPercentual < -5) tendencia = 'down'
          else tendencia = 'stable'

          return {
            categoria,
            mêsAtual: current,
            mêsPassado: previous,
            variacao,
            variacaoPercentual,
            tendencia,
          }
        })
        .sort((a, b) => Math.abs(b.variacaoPercentual) - Math.abs(a.variacaoPercentual))
        .slice(0, 10)

      setTrends(trendList)
    } catch (error) {
      console.error('Erro ao carregar análise de tendências:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card className="p-6 h-[400px] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </Card>
    )
  }

  const getTrendColor = (tendencia: string) => {
    switch (tendencia) {
      case 'up':
        return 'text-red-500'
      case 'down':
        return 'text-green-500'
      default:
        return 'text-yellow-500'
    }
  }

  const getTrendIcon = (tendencia: string) => {
    switch (tendencia) {
      case 'up':
        return <TrendingUp className="w-4 h-4" />
      case 'down':
        return <TrendingDown className="w-4 h-4" />
      default:
        return <Minus className="w-4 h-4" />
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Análise de Tendências</h3>
        <p className="text-sm text-muted-foreground">
          {previousMonth} vs {currentMonth}
        </p>
      </div>

      <div className="space-y-3">
        {trends.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Sem dados para comparação
          </p>
        ) : (
          trends.map((trend, index) => (
            <div key={index} className="flex items-center gap-4 pb-3 border-b last:border-0">
              <div
                className={`flex-shrink-0 p-2 rounded-lg ${getTrendColor(trend.tendencia)} bg-secondary/50`}
              >
                {getTrendIcon(trend.tendencia)}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{trend.categoria}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">
                    {formatCurrency(trend.mêsPassado)}
                  </span>
                  <span className="text-xs text-muted-foreground">→</span>
                  <span className="text-xs text-muted-foreground">
                    {formatCurrency(trend.mêsAtual)}
                  </span>
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <p className={`text-sm font-semibold ${getTrendColor(trend.tendencia)}`}>
                  {trend.variacaoPercentual > 0 ? '+' : ''}
                  {trend.variacaoPercentual.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground">
                  {trend.variacao > 0 ? '+' : ''}
                  {formatCurrency(trend.variacao)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  )
}

export default TrendAnalysis
