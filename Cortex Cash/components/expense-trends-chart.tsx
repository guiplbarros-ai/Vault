"use client"

import { useState, useEffect, useMemo } from 'react'
import { useSetting } from '@/app/providers/settings-provider'
import { Card } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { Loader2 } from 'lucide-react'
import { transacaoService } from '@/lib/services/transacao.service'
import { categoriaService } from '@/lib/services/categoria.service'
import { startOfMonth, endOfMonth, format, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface MonthData {
  month: string
  [key: string]: number | string
}

// Get chart colors from CSS variables to support light/dark mode
const getChartColors = (): string[] => {
  if (typeof window === 'undefined') {
    return [
      'hsl(175 73% 39%)',
      'hsl(42 89% 50%)',
      'hsl(171 69% 50%)',
      'hsl(32 99% 45%)',
      'hsl(175 78% 27%)',
    ]
  }

  const style = getComputedStyle(document.documentElement)
  return [
    `hsl(${style.getPropertyValue('--chart-1').trim() || '175 73% 39%'})`,
    `hsl(${style.getPropertyValue('--chart-2').trim() || '42 89% 50%'})`,
    `hsl(${style.getPropertyValue('--chart-3').trim() || '171 69% 50%'})`,
    `hsl(${style.getPropertyValue('--chart-4').trim() || '32 99% 45%'})`,
    `hsl(${style.getPropertyValue('--chart-5').trim() || '175 78% 27%'})`,
  ]
}

export function ExpenseTrendsChart() {
  const [data, setData] = useState<MonthData[]>([])
  const [categoryNames, setCategoryNames] = useState<string[]>([])
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [theme] = useSetting<'light' | 'dark' | 'auto'>('appearance.theme')

  // Detecta se está em dark mode
  const isDark = useMemo(() => {
    if (typeof window === 'undefined') return false
    if (theme === 'dark') return true
    if (theme === 'light') return false
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }, [theme])

  // ✅ Corrigir useMemo para atualizar cores quando tema mudar
  const COLORS = useMemo(() => getChartColors(), [isDark, theme])

  useEffect(() => {
    loadChartData()
  }, [])

  const loadChartData = async () => {
    try {
      setLoading(true)

      // Carrega transações e categorias
      const [transacoes, categorias] = await Promise.all([
        transacaoService.listTransacoes(),
        categoriaService.listCategorias(),
      ])

      // Encontra as top 3 categorias de despesa (últimos 6 meses)
      const now = new Date()
      const sixMonthsAgo = subMonths(now, 6)

      const recentExpenses = transacoes.filter(t => {
        const transactionDate = t.data instanceof Date ? t.data : new Date(t.data)
        return transactionDate >= sixMonthsAgo && t.tipo === 'despesa'
      })

      // Agrupa por categoria para encontrar as top 3
      const categoryTotals = new Map<string, number>()
      recentExpenses.forEach(t => {
        if (!t.categoria_id) return; // Ignora transações sem categoria
        const current = categoryTotals.get(t.categoria_id) || 0
        const valor = Number(t.valor) || 0
        categoryTotals.set(t.categoria_id, current + Math.abs(valor))
      })

      const topCategories = Array.from(categoryTotals.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([id]) => id)

      // Mapeia nomes e cores
      const names: string[] = []
      const colors: Record<string, string> = {}

      topCategories.forEach((catId, index) => {
        const categoria = categorias.find(c => c.id === catId)
        const name = categoria?.nome || 'Sem categoria'
        names.push(name)
        colors[name] = categoria?.cor || COLORS[index]
      })

      setCategoryNames(names)
      setCategoryColors(colors)

      // Cria dados por mês
      const months: MonthData[] = []

      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(now, i)
        const monthStart = startOfMonth(monthDate)
        const monthEnd = endOfMonth(monthDate)

        const monthData: MonthData = {
          month: format(monthDate, 'MMM', { locale: ptBR }),
        }

        // Para cada categoria top, calcula o gasto do mês
        topCategories.forEach((catId) => {
          const categoria = categorias.find(c => c.id === catId)
          const categoryName = categoria?.nome || 'Sem categoria'

          const monthCategoryExpenses = transacoes.filter(t => {
            const transactionDate = t.data instanceof Date ? t.data : new Date(t.data)
            return (
              transactionDate >= monthStart &&
              transactionDate <= monthEnd &&
              t.tipo === 'despesa' &&
              t.categoria_id === catId
            )
          })

          const total = monthCategoryExpenses.reduce((sum, t) => {
            const valor = Number(t.valor) || 0
            return sum + Math.abs(valor)
          }, 0)
          monthData[categoryName] = Math.round(total)
        })

        months.push(monthData)
      }

      setData(months)
    } catch (error) {
      console.error('Erro ao carregar dados do gráfico:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  return (
    <Card className="p-6 shadow-md border flex flex-col h-full" style={{
      background: isDark
        ? 'linear-gradient(135deg, #3B5563 0%, #334455 100%)'
        : 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
      backgroundColor: isDark ? '#3B5563' : '#FFFFFF',
      minHeight: '420px'
    }}>
      <div className="mb-6 flex-shrink-0">
        <h3 className="text-lg font-bold text-white">Evolução de Despesas</h3>
        <p className="text-sm text-white/80">Top 3 categorias (Últimos 6 meses)</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center flex-1 min-h-[300px]">
          <Loader2 className={isDark ? "h-8 w-8 animate-spin text-white/50" : "h-8 w-8 animate-spin text-primary"} />
        </div>
      ) : data.length === 0 || categoryNames.length === 0 ? (
        <div className="flex items-center justify-center flex-1 min-h-[300px]">
          <p className={isDark ? "text-sm text-white/70" : "text-sm text-muted-foreground"}>Nenhuma despesa encontrada</p>
        </div>
      ) : (
        <div className="flex-1 flex items-center min-h-0">
          <ResponsiveContainer width="100%" height="100%" minHeight={300}>
            <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={isDark ? 'rgba(255, 255, 255, 0.2)' : 'hsl(var(--border))'}
                vertical={true}
                horizontal={true}
              />
            <XAxis
              dataKey="month"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tick={{ fill: isDark ? 'rgba(255, 255, 255, 0.7)' : 'hsl(var(--muted-foreground))' }}
            />
            <YAxis
              fontSize={12}
              tickFormatter={formatCurrency}
              tickLine={false}
              axisLine={false}
              tick={{ fill: isDark ? 'rgba(255, 255, 255, 0.7)' : 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '0.75rem',
                color: 'hsl(var(--foreground))',
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
              }}
              formatter={(value: number) => formatCurrency(value)}
              labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
            />
            <Legend
              wrapperStyle={{
                paddingTop: '20px',
                color: isDark ? '#FFFFFF' : undefined
              }}
              iconType="line"
              formatter={(value: string) => (
                <span style={{ color: isDark ? '#FFFFFF' : '#0B2230' }}>{value}</span>
              )}
            />
            {categoryNames.map((name, index) => (
              <Line
                key={name}
                type="monotone"
                dataKey={name}
                stroke={categoryColors[name]}
                strokeWidth={3}
                dot={{ fill: categoryColors[name], r: 4 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  )
}

// ✅ Default export para dynamic import
export default ExpenseTrendsChart
