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
import { getChartColors, THEME_COLORS } from '@/lib/constants/colors'

interface MonthData {
  month: string
  [key: string]: number | string
}

export function IncomeTrendsChart() {
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

      // Encontra as top 3 categorias de receita (últimos 6 meses)
      const now = new Date()
      const sixMonthsAgo = subMonths(now, 6)

      const recentIncome = transacoes.filter(t => {
        const transactionDate = t.data instanceof Date ? t.data : new Date(t.data)
        return transactionDate >= sixMonthsAgo && t.tipo === 'receita'
      })

      // Agrupa por categoria para encontrar as top 3
      const categoryTotals = new Map<string, number>()
      recentIncome.forEach(t => {
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

        // Para cada categoria top, calcula a receita do mês
        topCategories.forEach((catId) => {
          const categoria = categorias.find(c => c.id === catId)
          const categoryName = categoria?.nome || 'Sem categoria'

          const monthCategoryIncome = transacoes.filter(t => {
            const transactionDate = t.data instanceof Date ? t.data : new Date(t.data)
            return (
              transactionDate >= monthStart &&
              transactionDate <= monthEnd &&
              t.tipo === 'receita' &&
              t.categoria_id === catId
            )
          })

          const total = monthCategoryIncome.reduce((sum, t) => {
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
    <Card className="glass-card-3d p-6 flex flex-col h-full" style={{
      minHeight: '420px'
    }}>
      <div className="mb-6 flex-shrink-0">
        <h3 className="text-lg font-bold text-foreground">Evolução de Receitas</h3>
        <p className="text-sm text-secondary">Top 3 categorias (Últimos 6 meses)</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center flex-1 min-h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-secondary" />
        </div>
      ) : data.length === 0 || categoryNames.length === 0 ? (
        <div className="flex items-center justify-center flex-1 min-h-[300px]">
          <p className="text-sm text-secondary">Nenhuma receita encontrada</p>
        </div>
      ) : (
        <div className="flex-1 flex items-center min-h-0">
          <ResponsiveContainer width="100%" height="100%" minHeight={300}>
            <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={THEME_COLORS.border}
                vertical={true}
                horizontal={true}
              />
            <XAxis
              dataKey="month"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tick={{ fill: THEME_COLORS.secondary }}
            />
            <YAxis
              fontSize={12}
              tickFormatter={formatCurrency}
              tickLine={false}
              axisLine={false}
              tick={{ fill: THEME_COLORS.secondary }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: THEME_COLORS.card,
                border: `1px solid ${THEME_COLORS.border}`,
                borderRadius: '0.75rem',
                color: THEME_COLORS.foreground,
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
              }}
              formatter={(value: number) => formatCurrency(value)}
              labelStyle={{ color: THEME_COLORS.foreground, fontWeight: 600 }}
            />
            <Legend
              wrapperStyle={{
                paddingTop: '20px',
                color: THEME_COLORS.foreground
              }}
              iconType="line"
              formatter={(value: string) => (
                <span style={{ color: THEME_COLORS.foreground }}>{value}</span>
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
export default IncomeTrendsChart
