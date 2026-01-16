'use client'

import { useSetting } from '@/app/providers/settings-provider'
import { Card } from '@/components/ui/card'
import { getChartColors } from '@/lib/constants/colors'
import { categoriaService } from '@/lib/services/categoria.service'
import { transacaoService } from '@/lib/services/transacao.service'
import { format, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Loader2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

interface MonthData {
  month: string
  [key: string]: number | string
}

export function ExpenseEvolutionChart() {
  const [data, setData] = useState<MonthData[]>([])
  const [categoryNames, setCategoryNames] = useState<string[]>([])
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [theme] = useSetting<'light' | 'dark' | 'auto'>('appearance.theme')

  const isDark = useMemo(() => {
    if (typeof window === 'undefined') return false
    if (theme === 'dark') return true
    if (theme === 'light') return false
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }, [theme])

  const COLORS = useMemo(() => getChartColors(), [isDark, theme])

  useEffect(() => {
    loadChartData()
  }, [])

  const loadChartData = async () => {
    try {
      setLoading(true)

      const [transacoes, categorias] = await Promise.all([
        transacaoService.listTransacoes(),
        categoriaService.listCategorias(),
      ])

      // Últimos 6 meses
      const now = new Date()
      const months: MonthData[] = []
      const categoryExpenses: Record<string, Record<string, number>> = {}

      // Inicializa 6 meses
      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(now, i)
        const monthKey = format(monthDate, 'yyyy-MM')
        const monthLabel = format(monthDate, 'MMM/yy', { locale: ptBR })

        months.push({
          month: monthLabel,
          monthKey,
        })
        categoryExpenses[monthKey] = {}
      }

      // Agrupa transações por mês e categoria
      transacoes.forEach((t) => {
        if (t.tipo !== 'despesa') return

        const transactionDate = t.data instanceof Date ? t.data : new Date(t.data)
        const monthKey = format(transactionDate, 'yyyy-MM')

        // Verifica se está dentro dos 6 meses
        if (!categoryExpenses[monthKey]) return

        let categoryId = t.categoria_id || 'sem-categoria'
        let categoryName = 'Sem categoria'

        if (categoryId !== 'sem-categoria') {
          const categoria = categorias.find((c) => c.id === categoryId)
          if (categoria) {
            // Se tem categoria pai, agrupa na pai
            const parentId = categoria.pai_id || categoria.id
            const parentCategory = categorias.find((c) => c.id === parentId)
            categoryId = parentId
            categoryName = parentCategory?.nome || categoria.nome
          }
        }

        if (!categoryExpenses[monthKey][categoryId]) {
          categoryExpenses[monthKey][categoryId] = 0
        }
        categoryExpenses[monthKey][categoryId] += Math.abs(Number(t.valor) || 0)
      })

      // Coleta todas as categorias únicas
      const allCategories = new Set<string>()
      Object.values(categoryExpenses).forEach((monthData) => {
        Object.keys(monthData).forEach((cat) => allCategories.add(cat))
      })

      // Cria mapa de cores para cada categoria
      const colorMap: Record<string, string> = {}
      const categoryList = Array.from(allCategories)
      categoryList.forEach((cat, index) => {
        colorMap[cat] = COLORS[index % COLORS.length]
      })

      // Monta dados para o gráfico
      const chartData = months.map((m) => {
        const monthData: MonthData = { month: m.month }
        const monthKey = m.monthKey as string
        categoryList.forEach((cat) => {
          monthData[cat] = categoryExpenses[monthKey][cat] || 0
        })
        return monthData
      })

      // Encontra nomes das categorias
      const categoryIdToName: Record<string, string> = {}
      categoryList.forEach((catId) => {
        if (catId === 'sem-categoria') {
          categoryIdToName[catId] = 'Sem categoria'
        } else {
          const categoria = categorias.find((c) => c.id === catId)
          categoryIdToName[catId] = categoria?.nome || 'Desconhecida'
        }
      })

      setData(chartData)
      setCategoryNames(categoryList)
      setCategoryColors(colorMap)
    } catch (error) {
      console.error('Erro ao carregar evolução de gastos:', error)
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

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Evolução de Gastos (6 Meses)</h3>
        <p className="text-sm text-muted-foreground">
          Acompanhe a tendência de despesas por categoria
        </p>
      </div>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip formatter={(value) => `R$ ${(value as number).toFixed(2)}`} />
          <Legend />
          {categoryNames.map((catId) => (
            <Line
              key={catId}
              type="monotone"
              dataKey={catId}
              stroke={categoryColors[catId]}
              strokeWidth={2}
              dot={{ r: 4 }}
              name={
                catId === 'sem-categoria'
                  ? 'Sem categoria'
                  : Object.values(categoryColors).includes(categoryColors[catId])
                    ? catId
                    : catId
              }
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Card>
  )
}

export default ExpenseEvolutionChart
